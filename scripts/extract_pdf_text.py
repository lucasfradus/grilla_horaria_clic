"""Run: docker run --rm -v .../public:/pdf:ro -v .../scripts:/scripts python:3.12-slim bash -c "pip install -q pypdf && python /scripts/extract_pdf_text.py" """
from pypdf import PdfReader

r = PdfReader("/pdf/Manual HOT CLIC.pdf")
for i, p in enumerate(r.pages):
    t = p.extract_text() or ""
    print("---PAGE", i + 1, "---")
    print(t[:8000])
