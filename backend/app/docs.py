"""Keep a PDF copy of each imported file so cards can open the original slide/page.

.pptx/.docx are converted with the locally installed PowerPoint/Word (via PowerShell COM).
Plain text files have no visual form and get no PDF.
"""

import io
import os
import re
import subprocess
import tempfile
import uuid
from pathlib import Path

from pypdf import PdfReader

DOCS_DIR = Path(__file__).resolve().parent.parent / "data" / "docs"
CONVERT_TIMEOUT = 180

_PS = {
    ".pptx": r"""
$app = New-Object -ComObject PowerPoint.Application
try {
  $p = $app.Presentations.Open($env:SRC, $true, $false, $false)
  # Keep hidden slides so PDF page N is always slide N.
  foreach ($s in $p.Slides) { $s.SlideShowTransition.Hidden = 0 }
  $p.SaveAs($env:DST, 32)
  $p.Close()
} finally {
  # COM reuses an already-open PowerPoint; only quit it if we left nothing open.
  if ($app.Presentations.Count -eq 0) { $app.Quit() }
}
""",
    ".docx": r"""
$app = New-Object -ComObject Word.Application
$app.Visible = $false
try {
  $d = $app.Documents.Open($env:SRC, $false, $true)
  $d.SaveAs2($env:DST, 17)
  $d.Close($false)
} finally {
  if ($app.Documents.Count -eq 0) { $app.Quit() }
}
""",
}


def doc_path(doc_id: str) -> Path | None:
    if not re.fullmatch(r"[0-9a-f]{32}", doc_id):
        return None
    p = DOCS_DIR / f"{doc_id}.pdf"
    return p if p.exists() else None


def save_pdf(filename: str, data: bytes) -> str | None:
    """Store a PDF version of the file and return its id, or None if not possible."""
    ext = Path(filename).suffix.lower()
    DOCS_DIR.mkdir(parents=True, exist_ok=True)
    doc_id = uuid.uuid4().hex
    dst = DOCS_DIR / f"{doc_id}.pdf"
    if ext == ".pdf":
        dst.write_bytes(data)
        return doc_id
    script = _PS.get(ext)
    if not script:
        return None
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as tmp:
        src = Path(tmp) / f"source{ext}"
        src.write_bytes(data)
        # Office writes temp files beside its output, so export in the temp dir and move it after.
        out = Path(tmp) / "out.pdf"
        try:
            subprocess.run(
                ["powershell", "-NoProfile", "-NonInteractive", "-Command", script],
                env={**os.environ, "SRC": str(src), "DST": str(out)},
                timeout=CONVERT_TIMEOUT, capture_output=True, check=True,
            )
        except (OSError, subprocess.SubprocessError) as e:
            print(f"[docs] could not convert {filename} to PDF: {e}")
            return None
        if not out.exists():
            return None
        out.replace(dst)
    return doc_id


def _norm(s: str) -> str:
    return re.sub(r"\W+", "", s).lower()


def find_pages(doc_id: str, loc_texts: list[tuple[str, str]]) -> list[int | None]:
    """Map each segment (loc, text) to a 1-based page in the stored PDF."""
    path = doc_path(doc_id)
    if not path:
        return [None] * len(loc_texts)
    reader = PdfReader(io.BytesIO(path.read_bytes()))
    count = len(reader.pages)
    page_texts: list[str] | None = None
    out: list[int | None] = []
    for loc, text in loc_texts:
        m = re.fullmatch(r"(?:Slide|Page) (\d+)", loc)
        if m:
            n = int(m.group(1))
            out.append(n if n <= count else None)
            continue
        # Sections (docx) have no page number: find the page where the text starts.
        if page_texts is None:
            page_texts = [_norm(p.extract_text() or "") for p in reader.pages]
        needle = _norm(text)[:40]
        out.append(next((i for i, t in enumerate(page_texts, 1) if needle and needle in t), None))
    return out
