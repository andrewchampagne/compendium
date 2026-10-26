from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from fastapi import FastAPI, File, Form, HTTPException, UploadFile  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from fastapi.responses import FileResponse  # noqa: E402

from . import docs, llm  # noqa: E402
from .extract import SUPPORTED, extract_segments  # noqa: E402
from .schemas import (  # noqa: E402
    ChatRequest,
    ChatResponse,
    DiscussOut,
    DiscussRequest,
    ExamRequest,
    ExamResponse,
    ExplainOut,
    ExplainRequest,
    GradeRequest,
    GradeResponse,
    IngestCard,
    IngestResponse,
    Segment,
)

# ~1M-token context; leave headroom for output. Reject rather than silently truncate.
MAX_CHARS = 2_000_000

app = FastAPI(title="Compendium API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"ok": True, "model": llm.MODEL, "fallback": llm.OPENAI_MODEL if llm.openai_client() else None}


@app.post("/api/ingest", response_model=IngestResponse)
def ingest(files: list[UploadFile] = File(...), instructions: str = Form("")):
    segments: list[Segment] = []
    sources: list[str] = []
    for f in files:
        name = f.filename or "file"
        if Path(name).suffix.lower() not in SUPPORTED:
            raise HTTPException(400, f"Unsupported file: {name}")
        try:
            data = f.file.read()
            segs = [(loc, text) for loc, text in extract_segments(name, data) if text.strip()]
        except Exception as e:
            raise HTTPException(400, f"Could not read {name}: {e}")
        doc_id = docs.save_pdf(name, data) if segs else None
        pages = docs.find_pages(doc_id, segs) if doc_id else [None] * len(segs)
        segs = [
            Segment(file=name, loc=loc, text=text, doc=doc_id, page=page)
            for (loc, text), page in zip(segs, pages)
        ]
        if segs:
            segments += segs
            sources.append(name)
    if not segments:
        raise HTTPException(400, "No readable text found in the uploaded files.")
    total = sum(len(s.text) for s in segments)
    if total > MAX_CHARS:
        raise HTTPException(413, f"Files are too large ({total:,} chars). Upload fewer at a time.")

    deck = _run(llm.generate_deck, segments, instructions)
    cards = [
        IngestCard(
            term=c.term,
            definition=c.definition,
            source=c.source - 1 if c.source is not None and 1 <= c.source <= len(segments) else None,
        )
        for c in deck.cards
    ]
    return IngestResponse(title=deck.title, cards=cards, sources=sources, segments=segments)


@app.get("/api/docs/{doc_id}")
def get_doc(doc_id: str):
    path = docs.doc_path(doc_id)
    if not path:
        raise HTTPException(404, "Document not found.")
    return FileResponse(path, media_type="application/pdf", headers={"Content-Disposition": "inline"})


@app.post("/api/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    if not req.message.strip():
        raise HTTPException(400, "Empty message.")
    try:
        return llm.chat(req)
    except llm.LLMError as e:
        raise HTTPException(e.status, e.message)
    except Exception as e:
        err = llm.map_api_error(e)
        raise HTTPException(err.status, err.message)


def _run(fn, *args):
    try:
        return fn(*args)
    except llm.LLMError as e:
        raise HTTPException(e.status, e.message)
    except Exception as e:
        err = llm.map_api_error(e)
        raise HTTPException(err.status, err.message)


@app.post("/api/discuss", response_model=DiscussOut)
def discuss(req: DiscussRequest):
    if not req.cards:
        raise HTTPException(400, "This set has no cards.")
    return _run(llm.discuss, req)


@app.post("/api/exam", response_model=ExamResponse)
def exam(req: ExamRequest):
    return ExamResponse(questions=_run(llm.generate_exam, req))


@app.post("/api/exam/grade", response_model=GradeResponse)
def grade(req: GradeRequest):
    return GradeResponse(grades=_run(llm.grade_short_answers, req))


@app.post("/api/explain", response_model=ExplainOut)
def explain(req: ExplainRequest):
    return _run(llm.explain, req)
