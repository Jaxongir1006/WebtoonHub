"""Create smaller WebP copies of local chapter pages without removing originals."""

from pathlib import Path
from PIL import Image, ImageOps


CONTENT = Path(__file__).resolve().parents[1] / "public_content"


def optimize() -> None:
    for category in ("manhwa", "manga"):
        directory = CONTENT / category
        if not directory.exists():
            continue
        for source in directory.rglob("*"):
            if source.suffix.lower() not in {".jpg", ".jpeg", ".png"}:
                continue
            target = source.with_suffix(".webp")
            if target.exists():
                continue
            with Image.open(source) as original:
                image = ImageOps.exif_transpose(original)
                if image.width > 1200:
                    image = image.resize((1200, round(image.height * 1200 / image.width)), Image.Resampling.LANCZOS)
                if image.mode not in ("RGB", "RGBA"):
                    image = image.convert("RGB")
                image.save(target, format="WEBP", quality=80, method=6)
            if target.stat().st_size >= source.stat().st_size:
                target.unlink()
                continue
            print(f"{source.relative_to(CONTENT)}: {source.stat().st_size // 1024} KB -> {target.stat().st_size // 1024} KB")


if __name__ == "__main__":
    optimize()
