import { useEffect, useState } from "react";
import * as api from "../api.js";
import { loadExam, saveExam } from "../storage.js";
import { Rotate } from "./icons.jsx";
import SourcePanel, { SourceChip } from "./SourcePanel.jsx";

const TYPES = [
  ["multiple_choice", "Multiple choice"],
  ["true_false", "True / False"],
  ["short_answer", "Short answer"],
];
const TYPE_LABEL = Object.fromEntries(TYPES);

// Persisted exam shape: { config, questions, responses: {id: string}, results: {id: {correct, feedback}} | null }
export default function ExamMode({ deck, sources = {}, onUpdateCard }) {
  const [exam, setExam] = useState(() => loadExam(deck.id));
  const [config, setConfig] = useState(() => exam?.config ?? {
    count: Math.min(10, Math.max(1, deck.cards.length)),
    types: TYPES.map(([t]) => t),
  });
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [reviewOpen, setReviewOpen] = useState(null); // question id whose source is expanded

  useEffect(() => {
    saveExam(deck.id, exam);
  }, [deck.id, exam]);

  const generate = async () => {
    setBusy("Writing your exam…");
    setError("");
    try {
      const res = await api.generateExam({ title: deck.title, cards: deck.cards, ...config });
      setExam({ config, questions: res.questions, responses: {}, results: null });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  };

  const respond = (id, value) =>
    setExam((x) => ({ ...x, responses: { ...x.responses, [id]: value } }));

  const submit = async () => {
    const { questions, responses } = exam;
    const results = {};
    for (const q of questions) {
      if (q.type !== "short_answer") {
        results[q.id] = { correct: responses[q.id] === q.answer };
      }
    }
    const sa = questions.filter((q) => q.type === "short_answer");
    setError("");
    if (sa.length) {
      setBusy("Grading short answers…");
      try {
        const res = await api.gradeShortAnswers(
          sa.map((q) => ({ id: q.id, prompt: q.prompt, answer: q.answer, response: responses[q.id] ?? "" }))
        );
        for (const g of res.grades) results[g.id] = { correct: g.correct, feedback: g.feedback };
      } catch (e) {
        setError(e.message);
        setBusy("");
        return;
      }
    }
    setBusy("");
    setExam((x) => ({ ...x, results }));
    document.querySelector(".main")?.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (deck.cards.length === 0) {
    return <div className="mode-empty"><p>Add some cards to generate an exam.</p></div>;
  }

  if (busy && !exam?.questions) {
    return <div className="mode-start"><span className="spinner dark" /><p className="muted">{busy}</p></div>;
  }

  // ---- Setup ----
  if (!exam?.questions) {
    const toggleType = (t) =>
      setConfig((c) => {
        const has = c.types.includes(t);
        const types = has ? c.types.filter((x) => x !== t) : [...c.types, t];
        return { ...c, types: types.length ? types : c.types };
      });
    return (
      <div className="exam-setup">
        <h2>Set up your exam</h2>
        <div className="set-row">
          <div className="set-row-text">
            <div className="set-row-title">Questions</div>
            <div className="set-row-desc">Up to 50.</div>
          </div>
          <input className="field exam-count" type="number" min="1" max="50" value={config.count}
            onChange={(e) => setConfig((c) => ({ ...c, count: Math.min(50, Math.max(1, Number(e.target.value) || 1)) }))} />
        </div>
        {TYPES.map(([t, label]) => (
          <div className="set-row" key={t}>
            <div className="set-row-title">{label}</div>
            <label className="toggle">
              <input type="checkbox" checked={config.types.includes(t)} onChange={() => toggleType(t)} />
              <span className="toggle-track"><span className="toggle-thumb" /></span>
            </label>
          </div>
        ))}
        {error && <p className="error">{error}</p>}
        <div className="exam-actions">
          <button className="btn btn-primary" onClick={generate}>Generate exam</button>
        </div>
      </div>
    );
  }

  // ---- Taking / results ----
  const { questions, responses, results } = exam;
  const answered = questions.filter((q) => (responses[q.id] ?? "").trim()).length;
  const score = results ? questions.filter((q) => results[q.id]?.correct).length : 0;

  return (
    <div className="exam">
      {results ? (
        <div className="exam-score">
          <div className="exam-score-num">{Math.round((score / questions.length) * 100)}%</div>
          <div>
            <div className="set-row-title">{score} of {questions.length} correct</div>
            <div className="row gap exam-score-actions">
              <button className="btn" onClick={() => setExam((x) => ({ ...x, responses: {}, results: null }))}>
                <Rotate size={16} /> Retake
              </button>
              <button className="btn btn-primary" onClick={() => setExam(null)}>New exam</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="exam-bar">
          <span className="muted small">{answered} / {questions.length} answered</span>
          <button className="link-btn" onClick={() => setExam(null)}>Change settings</button>
        </div>
      )}

      {questions.map((q, i) => {
        const r = results?.[q.id];
        const resp = responses[q.id] ?? "";
        const qCard = q.card_id ? deck.cards.find((c) => c.id === q.card_id) : null;
        const qSource = qCard?.sourceId ? sources[qCard.sourceId] : null;
        return (
          <div key={q.id} className={`exam-q ${r ? (r.correct ? "is-right" : "is-wrong") : ""}`}>
            <div className="exam-q-head">
              <span className="fc-label">{TYPE_LABEL[q.type]}</span>
              <span className="muted small">{i + 1} of {questions.length}</span>
            </div>
            <div className="exam-q-prompt">{q.prompt}</div>

            {q.type === "short_answer" ? (
              <textarea className="field exam-sa" rows={2} value={resp} disabled={!!results}
                placeholder="Type your answer" onChange={(e) => respond(q.id, e.target.value)} />
            ) : (
              <div className={`exam-choices ${q.type === "true_false" ? "tf" : ""}`}>
                {q.choices.map((c) => {
                  const state = !results ? (resp === c ? "picked" : "")
                    : c === q.answer ? "right" : resp === c ? "wrong" : "dim";
                  return (
                    <button key={c} className={`learn-option ${state}`} disabled={!!results}
                      onClick={() => respond(q.id, c)}>{c}</button>
                  );
                })}
              </div>
            )}

            {r && (
              <div className={`exam-q-result ${r.correct ? "right" : "wrong"}`}>
                <strong>{r.correct ? "Correct" : "Incorrect"}</strong>
                {!r.correct && q.type === "short_answer" && <span> · Answer: {q.answer}</span>}
                {!r.correct && q.type !== "short_answer" && !resp && <span> · Not answered</span>}
                {r.feedback && <div className="muted small">{r.feedback}</div>}
                {!r.correct && qSource && (
                  <div className="exam-review">
                    <SourceChip source={{ ...qSource, loc: `Review: ${qSource.loc}` }} open={reviewOpen === q.id}
                      onClick={() => setReviewOpen((o) => (o === q.id ? null : q.id))} />
                  </div>
                )}
              </div>
            )}
            {r && !r.correct && qSource && reviewOpen === q.id && (
              <SourcePanel card={qCard} source={qSource} onUpdate={onUpdateCard} onClose={() => setReviewOpen(null)} />
            )}
          </div>
        );
      })}

      {!results && (
        <div className="exam-submit">
          {error && <p className="error">{error}</p>}
          <p className="muted">{answered < questions.length ? `${questions.length - answered} unanswered.` : "All questions answered."}</p>
          <button className="btn btn-primary" onClick={submit} disabled={!!busy}>
            {busy ? <><span className="spinner" /> {busy}</> : "Submit exam"}
          </button>
        </div>
      )}
    </div>
  );
}
