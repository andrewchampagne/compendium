"""Model calls: deck generation from documents and terse chat-driven card edits.

Claude is the primary provider. If the Anthropic call fails for a non-content reason (bad/missing key,
rate limit, outage) and OPENAI_API_KEY is set, the same request is retried on OpenAI.
"""
import logging
import os

import anthropic
import openai

from .schemas import (
    CardUpdate,
    DiscussOut,
    DiscussRequest,
    ExplainOut,
    ExplainRequest,
    ExamQuestion,
    ExamRequest,
    Grade,
    GradeRequest,
    LLMExamOut,
    LLMGradeOut,
    ChatRequest,
    ChatResponse,
    LLMChatOut,
    LLMDeckOut,
    NewCard,
    Segment,
)

MODEL = os.getenv("FLASHCARD_MODEL", "claude-opus-5-5")
# Server-side refusal fallback: Anthropic picks the fallback model by refusal category.
FALLBACK_BETA = "server-side-fallback-2026-07-01"
HISTORY_TURNS = 8

OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-5")

log = logging.getLogger(__name__)

_client: anthropic.Anthropic | None = None
_openai: openai.OpenAI | None = None


def client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic()
    return _client


def openai_client() -> openai.OpenAI | None:
    """None when no OpenAI key is configured (fallback disabled)."""
    global _openai
    if _openai is None and os.getenv("OPENAI_API_KEY", "").strip():
        _openai = openai.OpenAI()
    return _openai


class LLMError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status
        self.message = message


def _check(msg) -> None:
    if msg.stop_reason == "refusal":
        raise LLMError(422, "The model declined this request.")
    if msg.stop_reason == "max_tokens":
        raise LLMError(502, "Response was cut off (max_tokens). Try fewer or smaller files.")


def _should_fall_back(e: Exception) -> bool:
    """Provider problems (auth, quota, outage) fall back; refusals and bad output do not."""
    if isinstance(e, (anthropic.AuthenticationError, anthropic.PermissionDeniedError,
                      anthropic.RateLimitError, anthropic.APIConnectionError)):
        return True
    if isinstance(e, anthropic.APIStatusError):
        return e.status_code >= 500
    # The SDK raises TypeError when no credentials can be found at all.
    return isinstance(e, TypeError) and "api_key" in str(e).lower()


def _anthropic_call(system, messages, schema, effort, max_tokens, stream):
    kwargs = dict(
        model=MODEL,
        max_tokens=max_tokens,
        system=system,
        messages=messages,
        output_config={"effort": effort},
        output_format=schema,
        betas=[FALLBACK_BETA],
        fallbacks="default",
    )
    if stream:
        with client().beta.messages.stream(**kwargs) as s:
            msg = s.get_final_message()
    else:
        msg = client().beta.messages.parse(**kwargs)
    _check(msg)
    if msg.parsed_output is None:
        raise LLMError(502, "Model returned an invalid response.")
    text = next((b.text for b in msg.content if b.type == "text"), "")
    return text, msg.parsed_output


def _openai_call(oc: openai.OpenAI, system, messages, schema, effort, max_tokens):
    completion = oc.chat.completions.parse(
        model=OPENAI_MODEL,
        messages=[{"role": "system", "content": system}, *messages],
        response_format=schema,
        reasoning_effort=effort,
        max_completion_tokens=max_tokens,
    )
    choice = completion.choices[0]
    if choice.message.refusal:
        raise LLMError(422, "The model declined this request.")
    if choice.finish_reason == "length":
        raise LLMError(502, "Response was cut off (max_tokens). Try fewer or smaller files.")
    if choice.message.parsed is None:
        raise LLMError(502, "Model returned an invalid response.")
    return choice.message.content or "", choice.message.parsed


def _structured(system: str, messages: list[dict], schema, effort: str,
                max_tokens: int = 16000, stream: bool = False):
    """Returns (raw_text, parsed). Tries Claude, then OpenAI if configured and the failure is provider-side."""
    try:
        return _anthropic_call(system, messages, schema, effort, max_tokens, stream)
    except Exception as e:
        oc = openai_client()
        if oc is None or not _should_fall_back(e):
            raise
        log.warning("Anthropic call failed (%s); falling back to OpenAI %s", type(e).__name__, OPENAI_MODEL)
        try:
            return _openai_call(oc, system, messages, schema, effort, max_tokens)
        except LLMError:
            raise
        except Exception as oe:
            err = map_api_error(oe)
            raise LLMError(err.status, f"Claude failed and the OpenAI fallback also failed: {err.message}")


DECK_SYSTEM = """You turn study material into flashcards.
Rules:
- Cover every distinct, testable concept in the material; skip filler (titles, agendas, "questions?").
- term: short (a word, phrase, or question). definition: concise, self-contained, <= 2 sentences.
- No duplicates. Do not invent facts that aren't in the material.
- title: a short name for the set.
- source: the n of the <segment> the card is mainly drawn from."""


def generate_deck(segments: list[Segment], instructions: str = "") -> LLMDeckOut:
    """Segments are numbered 1..N across all files in the prompt; card.source refers to that n."""
    docs: dict[str, list[str]] = {}
    for n, seg in enumerate(segments, 1):
        docs.setdefault(seg.file, []).append(f'<segment n="{n}" loc="{seg.loc}">\n{seg.text}\n</segment>')
    body = "\n\n".join(
        f'<document name="{name}">\n' + "\n".join(parts) + "\n</document>" for name, parts in docs.items()
    )
    if instructions.strip():
        body += f"\n\n<instructions>{instructions.strip()}</instructions>"
    _, out = _structured(DECK_SYSTEM, [{"role": "user", "content": body}], LLMDeckOut,
                         effort="medium", max_tokens=64000, stream=True)
    return out


CHAT_SYSTEM = """You manage a flashcard set via structured output. Cards are numbered.
- To change cards, fill add/update/delete. Use card numbers from <deck>. For update, set unchanged fields to null.
- If the user only asks a question, answer it in reply and leave add/update/delete empty.
- reply must be terse: one short sentence confirming what changed (e.g. "Added 3 cards."), or a brief direct answer. No preamble, no lists of the cards you changed."""


def _deck_block(req) -> str:
    """Compact numbered deck. Works for any request with .title and .cards."""
    lines = [f"{i}. {c.term} :: {c.definition}" for i, c in enumerate(req.cards, 1)]
    title = f' title="{req.title}"' if req.title else ""
    return f"<deck{title}>\n" + ("\n".join(lines) or "(empty)") + "\n</deck>"


def chat(req: ChatRequest) -> ChatResponse:
    turns = [
        (t.role, t.content)
        for t in req.history[-HISTORY_TURNS:]
        if t.role in ("user", "assistant") and t.content.strip()
    ]
    turns.append(("user", f"{_deck_block(req)}\n\n{req.message}"))
    # Must start with a user turn and alternate roles (failed turns can leave two users in a row).
    while turns and turns[0][0] != "user":
        turns.pop(0)
    messages = _merge_turns(turns)

    _, out = _structured(CHAT_SYSTEM, messages, LLMChatOut, effort="low")

    ids = [c.id for c in req.cards]

    def card_id(n: int) -> str | None:
        return ids[n - 1] if 1 <= n <= len(ids) else None

    updates = [
        CardUpdate(id=cid, term=u.term, definition=u.definition)
        for u in out.update
        if (cid := card_id(u.n))
    ]
    deletes = [cid for n in out.delete if (cid := card_id(n))]
    adds = [NewCard(term=a.term, definition=a.definition) for a in out.add]
    return ChatResponse(reply=out.reply, add=adds, update=updates, delete=deletes)


def _parse(system: str, messages: list[dict], schema, effort: str, max_tokens: int = 16000):
    return _structured(system, messages, schema, effort, max_tokens)


def _merge_turns(turns: list[tuple[str, str]]) -> list[dict]:
    """Collapse consecutive same-role turns so roles alternate."""
    messages: list[dict] = []
    for role, content in turns:
        if messages and messages[-1]["role"] == role:
            messages[-1]["content"] += "\n\n" + content
        else:
            messages.append({"role": role, "content": content})
    return messages


# ---- Discussion mode ----

DISCUSS_SYSTEM = """You run an open-ended oral-exam style discussion about a flashcard set.
- Ask one question at a time that makes the student explain, compare, apply, or give examples. Never just ask for a definition verbatim.
- Assess the student's last answer: verdict correct / partial / incorrect (or none if there was no answer yet, e.g. the first turn or "skip").
- feedback: 1-2 sentences. If partial or incorrect, state the key missing idea. No praise padding.
- question: the next question, 1-2 sentences. Vary topics across the set; follow up on weak spots."""


def discuss(req: DiscussRequest) -> DiscussOut:
    turns = [("user", f"{_deck_block(req)}\n\nStart the discussion.")]
    turns += [
        (t.role, t.content)
        for t in req.history[-20:]
        if t.role in ("user", "assistant") and t.content.strip()
    ]
    messages = _merge_turns(turns)
    if messages[-1]["role"] == "assistant":
        messages.append({"role": "user", "content": "(no answer) Ask the next question."})
    _, out = _parse(DISCUSS_SYSTEM, messages, DiscussOut, effort="low")
    return out


# ---- Exam mode ----

TYPE_LABEL = {
    "multiple_choice": "multiple choice (4 choices, one correct, plausible distractors from the set)",
    "true_false": 'true/false (choices ["True", "False"]; mix true and false statements)',
    "short_answer": "short answer (answerable in a few words or one sentence)",
}

EXAM_SYSTEM = """You write exams that test understanding of a flashcard set.
- Only use the allowed question types. Spread questions across the set and avoid near-duplicates.
- Questions must be answerable from the set alone. Do not reveal the answer in the prompt.
- For multiple_choice and true_false, answer must exactly match one of the choices."""

MAX_EXAM_ROUNDS = 3


def _validate_question(q, allowed: set[str], n_cards: int) -> str | None:
    """Return an error string, or None if the question is valid."""
    if q.type not in allowed:
        return f"type {q.type} is not allowed"
    if not q.prompt.strip() or not q.answer.strip():
        return "empty prompt or answer"
    if q.type == "multiple_choice":
        if len(q.choices) != 4 or len({c.strip().lower() for c in q.choices}) != 4:
            return "multiple_choice needs exactly 4 distinct choices"
        if q.answer not in q.choices:
            return "answer is not one of the choices"
    elif q.type == "true_false":
        if q.answer not in ("True", "False"):
            return 'true_false answer must be "True" or "False"'
    if not 1 <= q.card <= n_cards:
        return "card number out of range"
    return None


def generate_exam(req: ExamRequest) -> list[ExamQuestion]:
    """Generate, validate, and loop back to the model to repair/top up until the exam is complete."""
    if not req.cards:
        raise LLMError(400, "This set has no cards.")
    allowed = set(req.types) or set(TYPE_LABEL)
    types_text = "\n".join(f"- {TYPE_LABEL[t]}" for t in TYPE_LABEL if t in allowed)
    messages: list[dict] = [{
        "role": "user",
        "content": f"{_deck_block(req)}\n\nWrite {req.count} questions. Allowed types:\n{types_text}",
    }]
    accepted: list = []
    seen: set[str] = set()
    for _ in range(MAX_EXAM_ROUNDS):
        text, out = _parse(EXAM_SYSTEM, messages, LLMExamOut, effort="medium")
        problems = []
        for i, q in enumerate(out.questions, 1):
            if len(accepted) >= req.count:
                break
            err = _validate_question(q, allowed, len(req.cards))
            key = q.prompt.strip().lower()
            if err is None and key in seen:
                err = "duplicate of an earlier question"
            if err:
                problems.append(f"Q{i}: {err}")
                continue
            seen.add(key)
            accepted.append(q)
        missing = req.count - len(accepted)
        if missing <= 0:
            break
        messages.append({"role": "assistant", "content": text})
        messages.append({
            "role": "user",
            "content": (
                f"{len(accepted)} questions accepted. Rejected: {'; '.join(problems) or 'none'}. "
                f"Write {missing} NEW questions, different from all previous ones, using only the allowed types."
            ),
        })
    if not accepted:
        raise LLMError(502, "Could not generate a valid exam. Try again.")

    ids = [c.id for c in req.cards]
    return [
        ExamQuestion(
            id=f"q{i}",
            type=q.type,
            prompt=q.prompt.strip(),
            choices=q.choices if q.type != "short_answer" else [],
            answer=q.answer.strip(),
            card_id=ids[q.card - 1],
        )
        for i, q in enumerate(accepted, 1)
    ]


GRADE_SYSTEM = """You grade short-answer exam responses against the expected answer.
- correct = the response captures the essential idea; ignore spelling, phrasing, and minor omissions.
- feedback: one short sentence; if incorrect, say what was missing."""


def grade_short_answers(req: GradeRequest) -> list[Grade]:
    answered = [it for it in req.items if it.response.strip()]
    by_id: dict[str, Grade] = {}
    if answered:
        body = "\n\n".join(
            f"{i}. Question: {it.prompt}\nExpected: {it.answer}\nResponse: {it.response}"
            for i, it in enumerate(answered, 1)
        )
        _, out = _parse(GRADE_SYSTEM, [{"role": "user", "content": body}], LLMGradeOut, effort="low")
        for g in out.grades:
            if 1 <= g.n <= len(answered):
                it = answered[g.n - 1]
                by_id[it.id] = Grade(id=it.id, correct=g.correct, feedback=g.feedback)
    return [
        by_id.get(it.id)
        or Grade(
            id=it.id,
            correct=False,
            feedback="No answer given." if not it.response.strip() else "Could not grade this answer.",
        )
        for it in req.items
    ]


# ---- Explain from source ----

EXPLAIN_SYSTEM = """You explain a flashcard to a student using only their lecture material in <source>.
- 2-4 sentences. Plain language. Include one concrete example from the source if it has one.
- Do not add facts that aren't in the source. If the source doesn't cover the card, say so in one sentence."""


def explain(req: ExplainRequest) -> ExplainOut:
    loc = f' loc="{req.source_loc}"' if req.source_loc else ""
    body = (
        f"<card>\n{req.term} :: {req.definition}\n</card>\n\n"
        f"<source{loc}>\n{req.source_text or '(none)'}\n</source>"
    )
    _, out = _parse(EXPLAIN_SYSTEM, [{"role": "user", "content": body}], ExplainOut, effort="low")
    return out


def map_api_error(e: Exception) -> LLMError:
    if isinstance(e, anthropic.AuthenticationError):
        return LLMError(401, "Missing or invalid Anthropic API key. Set ANTHROPIC_API_KEY in backend/.env.")
    if isinstance(e, anthropic.RateLimitError):
        return LLMError(429, "Rate limited by the API. Try again shortly.")
    if isinstance(e, anthropic.APIStatusError):
        return LLMError(502, f"API error ({e.status_code}): {e.message}")
    if isinstance(e, anthropic.APIConnectionError):
        return LLMError(503, "Could not reach the Anthropic API.")
    if isinstance(e, TypeError) and "api_key" in str(e).lower():
        return LLMError(401, "No Anthropic credentials found. Set ANTHROPIC_API_KEY in backend/.env.")
    if isinstance(e, openai.AuthenticationError):
        return LLMError(401, "Invalid OpenAI API key. Check OPENAI_API_KEY in backend/.env.")
    if isinstance(e, openai.RateLimitError):
        return LLMError(429, "Rate limited by the OpenAI API. Try again shortly.")
    if isinstance(e, openai.APIStatusError):
        return LLMError(502, f"OpenAI API error ({e.status_code}): {e.message}")
    if isinstance(e, openai.APIConnectionError):
        return LLMError(503, "Could not reach the OpenAI API.")
    return LLMError(500, str(e))
