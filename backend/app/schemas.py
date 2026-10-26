from typing import Literal

from pydantic import BaseModel, Field


# ---- API (frontend <-> backend) ----

class Card(BaseModel):
    id: str
    term: str
    definition: str


class ChatTurn(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    title: str = ""
    cards: list[Card] = []
    history: list[ChatTurn] = []


class NewCard(BaseModel):
    term: str
    definition: str


class CardUpdate(BaseModel):
    id: str
    term: str | None = None
    definition: str | None = None


class ChatResponse(BaseModel):
    reply: str
    add: list[NewCard] = []
    update: list[CardUpdate] = []
    delete: list[str] = []


class Segment(BaseModel):
    file: str
    loc: str  # "Slide 3", "Page 2", "Section 1"
    text: str
    doc: str | None = None  # id of the stored PDF copy (see docs.py)
    page: int | None = None  # 1-based page of that PDF


class IngestCard(BaseModel):
    term: str
    definition: str
    source: int | None = None  # 0-based index into IngestResponse.segments


class IngestResponse(BaseModel):
    title: str
    cards: list[IngestCard]
    sources: list[str]
    segments: list[Segment] = []


class ExplainRequest(BaseModel):
    term: str
    definition: str
    source_text: str = ""
    source_loc: str = ""


class ExplainOut(BaseModel):
    explanation: str = Field(description="2-4 sentences grounded in the source.")


# ---- Model output schemas (structured outputs) ----
# Cards are referenced by 1-based index (n) instead of ids to keep prompts small.

class LLMCardUpdate(BaseModel):
    n: int = Field(description="1-based card number")
    term: str | None = Field(description="New term, or null to keep")
    definition: str | None = Field(description="New definition, or null to keep")


class LLMChatOut(BaseModel):
    reply: str = Field(description="Terse reply. One short sentence unless answering a question.")
    add: list[NewCard]
    update: list[LLMCardUpdate]
    delete: list[int] = Field(description="1-based card numbers to remove")


class LLMDeckCard(BaseModel):
    term: str
    definition: str
    source: int | None = Field(description="n of the segment the card is mainly drawn from")


class LLMDeckOut(BaseModel):
    title: str
    cards: list[LLMDeckCard]


# ---- Discussion mode ----

class DiscussRequest(BaseModel):
    title: str = ""
    cards: list[Card] = []
    history: list[ChatTurn] = []  # assistant = questions/feedback, user = answers


class DiscussOut(BaseModel):
    verdict: Literal["correct", "partial", "incorrect", "none"] = Field(
        description='Assessment of the user\'s last answer; "none" if there is no answer to assess.'
    )
    feedback: str = Field(description="1-2 sentences on the last answer, or empty string if verdict is none.")
    question: str = Field(description="The next open-ended discussion question.")


# ---- Exam mode ----

QuestionType = Literal["multiple_choice", "true_false", "short_answer"]


class ExamRequest(BaseModel):
    title: str = ""
    cards: list[Card] = []
    count: int = Field(default=10, ge=1, le=50)
    types: list[QuestionType] = ["multiple_choice", "true_false", "short_answer"]


class LLMExamQuestion(BaseModel):
    type: QuestionType
    prompt: str
    choices: list[str] = Field(description='multiple_choice: exactly 4 options. true_false: ["True", "False"]. short_answer: [].')
    answer: str = Field(description='Must exactly equal one of choices for multiple_choice / true_false. For short_answer, the ideal answer.')
    card: int = Field(description="1-based number of the card this question tests")


class LLMExamOut(BaseModel):
    questions: list[LLMExamQuestion]


class ExamQuestion(BaseModel):
    id: str
    type: QuestionType
    prompt: str
    choices: list[str]
    answer: str
    card_id: str | None = None


class ExamResponse(BaseModel):
    questions: list[ExamQuestion]


class GradeItem(BaseModel):
    id: str
    prompt: str
    answer: str
    response: str


class GradeRequest(BaseModel):
    items: list[GradeItem]


class LLMGrade(BaseModel):
    n: int = Field(description="1-based item number")
    correct: bool
    feedback: str = Field(description="One short sentence.")


class LLMGradeOut(BaseModel):
    grades: list[LLMGrade]


class Grade(BaseModel):
    id: str
    correct: bool
    feedback: str


class GradeResponse(BaseModel):
    grades: list[Grade]
