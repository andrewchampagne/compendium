// localStorage persistence. Swap this module for a real DB later.
const DECKS_KEY = "fc.decks.v1";
const CHAT_KEY = (deckId) => `fc.chat.v1.${deckId}`;

export const uid = () =>
  (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36));

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn("localStorage write failed", e);
  }
}

export const loadDecks = () => read(DECKS_KEY, []);
export const saveDecks = (decks) => write(DECKS_KEY, decks);

export const loadChat = (deckId) => read(CHAT_KEY(deckId), []);
export const saveChat = (deckId, msgs) => write(CHAT_KEY(deckId), msgs);
export const clearChat = (deckId) => {
  try {
    localStorage.removeItem(CHAT_KEY(deckId));
  } catch {}
};

export const newCard = (term = "", definition = "", sourceId = null) => ({
  id: uid(),
  term,
  definition,
  starred: false,
  sourceId,
});

// ---- Source segments (slide/page/section text a card came from) ----
// Kept out of the deck list so it stays small: { [segId]: { file, loc, text } }
const SOURCES_KEY = (deckId) => `fc.sources.v1.${deckId}`;
export const loadSources = (deckId) => read(SOURCES_KEY(deckId), {});
export const saveSources = (deckId, sources) => write(SOURCES_KEY(deckId), sources);
export function addSources(deckId, segments) {
  const map = loadSources(deckId);
  const ids = segments.map((seg) => {
    const id = uid();
    map[id] = { file: seg.file, loc: seg.loc, text: seg.text, doc: seg.doc ?? null, page: seg.page ?? null };
    return id;
  });
  saveSources(deckId, map);
  return ids;
}

export const newDeck = (title = "Untitled set", cards = [], sources = []) => ({
  id: uid(),
  title,
  cards,
  sources,
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

// ---- Settings ----
const SETTINGS_KEY = "fc.settings.v1";
export const DEFAULT_SETTINGS = {
  // General
  openChatOnStart: true,
  confirmDelete: true,
  frontSide: "term", // "term" | "definition"
  shuffleByDefault: false,
  // Appearance
  theme: "system", // "system" | "light" | "dark"
  fontSize: 15, // px
  chatColor: null, // null = default, or a palette hex
  bubbleColors: "random", // "random" | "chat"
};
export const loadSettings = () => ({ ...DEFAULT_SETTINGS, ...read(SETTINGS_KEY, {}) });
export const saveSettings = (s) => write(SETTINGS_KEY, s);

export function clearAllData() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith("fc."))
      .forEach((k) => localStorage.removeItem(k));
  } catch {}
}

// ---- Per-deck study mode state ----
const DISCUSS_KEY = (deckId) => `fc.discuss.v1.${deckId}`;
const EXAM_KEY = (deckId) => `fc.exam.v1.${deckId}`;
export const loadDiscussion = (deckId) => read(DISCUSS_KEY(deckId), []);
export const saveDiscussion = (deckId, msgs) => write(DISCUSS_KEY(deckId), msgs);
export const loadExam = (deckId) => read(EXAM_KEY(deckId), null);
export const saveExam = (deckId, exam) => write(EXAM_KEY(deckId), exam);

export function clearDeckData(deckId) {
  for (const key of [CHAT_KEY(deckId), DISCUSS_KEY(deckId), EXAM_KEY(deckId), SOURCES_KEY(deckId)]) {
    try {
      localStorage.removeItem(key);
    } catch {}
  }
}

// ---- Game best scores: { [gameId]: number } per deck ----
const GAMES_KEY = (deckId) => `fc.games.v1.${deckId}`;
export const loadBest = (deckId, game) => read(GAMES_KEY(deckId), {})[game] ?? null;
export function saveBest(deckId, game, value) {
  const map = read(GAMES_KEY(deckId), {});
  map[game] = value;
  write(GAMES_KEY(deckId), map);
}
