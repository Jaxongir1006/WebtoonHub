"""Small, dependency-free PDFs with translation appearances and tall vector text."""


def _stream(content, attributes=b''):
    return b'<< ' + attributes + b' /Length ' + str(len(content)).encode() + b' >>\nstream\n' + content + b'\nendstream'


def _document(objects):
    result = bytearray(b'%PDF-1.7\n')
    offsets = [0]
    for index, value in enumerate(objects, 1):
        offsets.append(len(result))
        result.extend(f'{index} 0 obj\n'.encode() + value + b'\nendobj\n')
    xref = len(result)
    result.extend(f'xref\n0 {len(offsets)}\n0000000000 65535 f \n'.encode())
    for offset in offsets[1:]:
        result.extend(f'{offset:010d} 00000 n \n'.encode())
    result.extend(f'trailer\n<< /Size {len(offsets)} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF'.encode())
    return bytes(result)


def translated_pdf(*, widget=False, two_pages=False):
    # The visible translation is an appearance overlay covering the English base.
    catalog = b'<< /Type /Catalog /Pages 2 0 R' + (b' /AcroForm 8 0 R' if widget else b'') + b' >>'
    base = b'0.85 0.85 0.85 rg 0 0 400 600 re f\n0 0 0 rg BT /F1 18 Tf 40 320 Td (ENGLISH ORIGINAL) Tj ET'
    appearance = b'1 1 1 rg 0 0 360 110 re f\n0 0.2 0.6 rg BT /F1 22 Tf 20 50 Td (SALOM DUNYO) Tj ET'
    annotation = b'<< /Type /Annot /Rect [20 270 380 380] /F 4 /AP << /N 7 0 R >> '
    annotation += b'/Subtype /Widget /FT /Tx /T (translation) /V (SALOM DUNYO) /DA (/F1 22 Tf 0 0.2 0.6 rg)' if widget else b'/Subtype /FreeText /Contents (SALOM DUNYO) /DA (/F1 22 Tf 0 0.2 0.6 rg)'
    objects = [catalog,
        b'<< /Type /Pages /Kids [3 0 R 8 0 R] /Count 2 >>' if two_pages else b'<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
        b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 600] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R /Annots [6 0 R] >>',
        b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
        _stream(base), annotation + b' >>',
        _stream(appearance, b'/Type /XObject /Subtype /Form /BBox [0 0 360 110] /Resources << /Font << /F1 4 0 R >> >>'),
    ]
    if widget:
        objects.append(b'<< /Fields [6 0 R] /DR << /Font << /F1 4 0 R >> >> /DA (/F1 22 Tf 0 0 0 rg) /NeedAppearances false >>')
    elif two_pages:
        objects.extend([
            b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 400] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R /Annots [9 0 R] >>',
            annotation.replace(b'/N 7 0 R', b'/N 10 0 R') + b' >>',
            _stream(appearance, b'/Type /XObject /Subtype /Form /BBox [0 0 360 110] /Resources << /Font << /F1 4 0 R >> >>'),
        ])
    return _document(objects)


def tall_pdf():
    artwork = b'1 1 1 rg 0 0 400 1800 re f\n'
    for y in range(30, 1800, 35):
        artwork += f'0 0 0 rg BT /F1 6 Tf 20 {y} Td (Salom dunyo - fine translated text {y}) Tj ET\n'.encode()
        artwork += f'0.1 0.4 0.7 rg 20 {y - 5} 360 1 re f\n'.encode()
    return _document([
        b'<< /Type /Catalog /Pages 2 0 R >>',
        b'<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
        b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 1800] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
        b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', _stream(artwork),
    ])
