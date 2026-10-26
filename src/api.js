const API = window.env?.apiBase ?? "http://127.0.0.1:8765";

async function handle(res) {
  if (res.ok) return res.json();
  let detail = `Request failed (${res.status})`;
  try {
    const body = await res.json();
    if (body?.detail) detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
  } catch {}
  throw new Error(detail);
}

async function request(path, init) {
  try {
    return await handle(await fetch(`${API}${path}`, init));
  } catch (e) {
    if (e instanceof TypeError) throw new Error("Backend is not reachable on " + API);
    throw e;
  }
}

export const health = () => request("/api/health");

export function ingest(files, instructions = "") {
  const form = new FormData();
  for (const f of files) form.append("files", f);
  form.append("instructions", instructions);
  return request("/api/ingest", { method: "POST", body: form });
}

export function chat({ message, title, cards, history }) {
  return request("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      title,
      cards: cards.map(({ id, term, definition }) => ({ id, term, definition })),
      history: history.map(({ role, content }) => ({ role, content })),
    }),
  });
}

const cardsPayload = (cards) => cards.map(({ id, term, definition }) => ({ id, term, definition }));
const post = (path, body) =>
  request(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

export const discuss = ({ title, cards, history }) =>
  post("/api/discuss", { title, cards: cardsPayload(cards), history: history.map(({ role, content }) => ({ role, content })) });

export const generateExam = ({ title, cards, count, types }) =>
  post("/api/exam", { title, cards: cardsPayload(cards), count, types });

export const gradeShortAnswers = (items) => post("/api/exam/grade", { items });

export const explain = ({ term, definition, source }) =>
  post("/api/explain", { term, definition, source_text: source?.text ?? "", source_loc: source?.loc ?? "" });

// PDF copy of an imported file, opened at the source's page (Chromium's viewer reads #page=).
// The ?t= makes each open a real navigation, so a reused window jumps to the new page.
export const docUrl = (source) => `${API}/api/docs/${source.doc}?t=${Date.now()}#page=${source.page ?? 1}`;
