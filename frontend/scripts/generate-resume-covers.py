"""Render template covers from the current CV renderer and shared sample data.

Run `npm run build:cv-renderer` in frontend first. Requires PyMuPDF.
"""

import json
import pathlib
import subprocess
import tempfile

import pymupdf


frontend = pathlib.Path(__file__).resolve().parents[1]
sample = json.loads(
    (frontend.parent / "tests/fixtures/resumes/showcase.json").read_text(encoding="utf-8")
)
covers = {}
with tempfile.TemporaryDirectory(prefix="resume-covers-") as temporary:
    for template in ("classic", "modern", "minimal", "executive", "elegant", "technical"):
        sample["template_key"] = template
        output = pathlib.Path(temporary) / f"{template}.pdf"
        subprocess.run(
            ["node", str(frontend / "dist/cv-renderer/render-cv.mjs"), str(output)],
            input=json.dumps({"document": sample}, ensure_ascii=False).encode("utf-8"),
            check=True,
            capture_output=True,
        )
        with pymupdf.open(output) as pdf:
            if len(pdf) != 1:
                raise RuntimeError(f"The {template} sample must fit on one page")
            page = pdf[0]
            scale = 1200 / page.rect.width
            pixels = page.get_pixmap(matrix=pymupdf.Matrix(scale, scale), alpha=False)
            covers[template] = pixels.tobytes("png")
            print(f"{template}: {pixels.width} x {pixels.height}")

for template, png in covers.items():
    (frontend / "public/resume-templates" / f"{template}.png").write_bytes(png)
