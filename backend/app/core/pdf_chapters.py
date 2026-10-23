"""Render one uploaded PDF to ordered pages in a short-lived, bounded process."""
import asyncio
import hashlib
import json
import math
from pathlib import Path
import sys

from fastapi import HTTPException

MAX_PDF_BYTES = 20 * 1024 * 1024
MAX_PDF_PAGES = 100
MAX_OUTPUT_BYTES = 50 * 1024 * 1024
RENDER_TIMEOUT = 75


def render_pages(source, directory):
    # PDFium is not thread safe. Only the isolated worker calls its native API.
    import pypdfium2 as pdfium
    pages, total_bytes = [], 0
    try:
        document = pdfium.PdfDocument(source)
    except pdfium.PdfiumError as exc:
        return {'error': 'password' if exc.err_code == 4 else 'invalid'}
    with document:
        if not 1 <= len(document) <= MAX_PDF_PAGES:
            return {'error': 'pages'}
        for index in range(len(document)):
            page = document[index]
            try:
                width, height = page.get_size()
                if not all(math.isfinite(value) and 0 < value <= 100000 for value in (width, height)):
                    return {'error': 'dimensions'}
                scale = min(2, 2048 / width, 12000 / height, math.sqrt(8_000_000 / (width * height)))
                bitmap = page.render(scale=scale, fill_color=(255, 255, 255, 255), draw_annots=False)
                try:
                    with bitmap.to_pil() as image:
                        name = f'{index + 1:03d}.webp'
                        path = Path(directory) / name
                        image.save(path, 'WEBP', quality=85, method=4)
                        size = path.stat().st_size
                        total_bytes += size
                        if total_bytes > MAX_OUTPUT_BYTES:
                            return {'error': 'output'}
                        pages.append({'name': name, 'size': size, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
                finally:
                    bitmap.close()
            finally:
                page.close()
    return {'pages': pages}


async def convert_pdf(source, directory):
    process = await asyncio.create_subprocess_exec(
        sys.executable, '-m', 'app.core.pdf_chapters', str(source), str(directory),
        stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.DEVNULL,
        cwd=str(Path(__file__).resolve().parents[2]),
    )
    try:
        await asyncio.wait_for(process.wait(), RENDER_TIMEOUT)
    except (TimeoutError, asyncio.CancelledError) as exc:
        if process.returncode is None:
            process.kill()
        await process.wait()
        if isinstance(exc, asyncio.CancelledError):
            raise
        raise HTTPException(422, 'This PDF takes too long to convert. Use a smaller or simpler PDF.') from exc
    manifest = Path(directory) / 'manifest.json'
    if process.returncode != 0 or not manifest.is_file():
        raise HTTPException(422, 'This PDF could not be converted. Use a smaller or simpler PDF.')
    result = json.loads(manifest.read_text())
    errors = {
        'password': 'Password-protected PDFs are not supported. Upload an unlocked PDF.',
        'invalid': 'The file is not a readable PDF.',
        'pages': 'Each PDF must contain between 1 and 100 pages.',
        'dimensions': 'This PDF contains an unsupported page size.',
        'output': 'The converted chapter exceeds 50 MB. Use a smaller PDF.',
    }
    if result.get('error'):
        raise HTTPException(422, errors.get(result['error'], errors['invalid']))
    return result['pages']


if __name__ == '__main__':
    if sys.platform != 'win32':
        import resource
        resource.setrlimit(resource.RLIMIT_AS, (384 * 1024 * 1024, 384 * 1024 * 1024))
        resource.setrlimit(resource.RLIMIT_CPU, (60, 65))
    try:
        result = render_pages(sys.argv[1], sys.argv[2])
    except Exception:
        result = {'error': 'invalid'}
    (Path(sys.argv[2]) / 'manifest.json').write_text(json.dumps(result))
