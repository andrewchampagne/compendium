import { useCallback, useEffect, useMemo, useState } from "react";
import * as api from "./api.js";
import logoUrl from "./assets/logo.png";
import { addSources, clearAllData, clearChat, clearDeckData, loadChat, loadDecks, loadSettings, newCard, newDeck, saveChat, saveDecks, saveSettings } from "./storage.js";
import DeckView from "./components/DeckView.jsx";
import ChatPanel from "./components/ChatPanel.jsx";
import Splitter from "./components/Splitter.jsx";
import ImportModal from "./components/ImportModal.jsx";
import SettingsModal from "./components/SettingsModal.jsx";
import { Folder, Gear, Home, Plus, Search, Sparkle, Upload } from "./components/icons.jsx";

const C = {
  teal: "#52b1b6", lime: "#d5d156", yellow: "#f4cd5c",
  magenta: "#b8428d", pink: "#d85f9a", salmon: "#e17a8c",
  orange: "#de713e", red: "#d23d46", crimson: "#c83b52",
};

function BrandMark() {
  return <img src={logoUrl} width="30" height="30" alt="" className="brand-mark" />;
}

const BUBBLE_COLORS = Object.values(C);

// 10 letters: all 9 colors, teal used twice, fixed shuffled order.
const WORD_COLORS = [C.orange, C.teal, C.crimson, C.lime, C.pink, C.yellow, C.teal, C.red, C.salmon, C.magenta];

function TopBar({ query, setQuery, onImport, onCreate, chatOpen, onToggleChat, onSettings }) {
  return (
    <header className="topbar">
      <div className="brand">
        <BrandMark />
        <span className="brand-word">{[..."Compendium"].map((ch, i) => <span key={i} style={{ color: WORD_COLORS[i] }}>{ch}</span>)}</span>
      </div>
      <div className="search">
        <Search size={18} />
        <input placeholder="Search your sets" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <div className="topbar-actions">
        <button className="btn" onClick={onImport}><Upload size={18} /> Import</button>
        <button className="btn btn-primary" onClick={onCreate}><Plus size={18} /> Create</button>
        <button className={`btn ${chatOpen ? "btn-active" : ""}`} onClick={onToggleChat} title="Assistant">
          <Sparkle size={24} />
        </button>
        <button className="btn btn-icon" onClick={onSettings} title="Settings" aria-label="Settings">
          <Gear size={20} />
        </button>
      </div>
    </header>
  );
}

const REM = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
const SIDE_MAX = 15 * REM;
const CHAT_MAX = 23 * REM;
const MIN_FRACTION = 0.6; // narrower than this collapses the panel

function Sidebar({ decks, activeId, onHome, onOpen }) {
  return (
    <nav className="sidebar">
      <button className={`nav-item ${!activeId ? "active" : ""}`} onClick={onHome}><Home /> Home</button>
      <div className="nav-section"><Folder size={18} /> Your library</div>
      <div className="nav-decks">
        {decks.length === 0 && <p className="muted small nav-empty">No sets yet</p>}
        {decks.map((d) => (
          <button key={d.id} className={`nav-deck ${d.id === activeId ? "active" : ""}`} onClick={() => onOpen(d.id)}>
            <span className="nav-deck-title">{d.title}</span>
            <span className="nav-deck-count">{d.cards.length}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

function HomeView({ decks, onOpen, onImport }) {
  return (
    <div className="home">
      <h2 className="home-heading">Your sets</h2>
      {decks.length === 0 ? (
        <button className="home-drop" onClick={onImport}>
          <Upload size={32} />
          <strong>Import PowerPoint slides or documents</strong>
          <span className="muted">We'll turn them into a flashcard set.</span>
        </button>
      ) : (
        <div className="deck-grid">
          {decks.map((d) => (
            <button key={d.id} className="deck-tile" onClick={() => onOpen(d.id)}>
              <span className="deck-tile-title">{d.title}</span>
              <span className="pill">{d.cards.length} terms</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [decks, setDecks] = useState(loadDecks);
  const [activeId, setActiveId] = useState(() => loadDecks()[0]?.id ?? null);
  const [query, setQuery] = useState("");
  const [settings, setSettings] = useState(loadSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(() => loadSettings().openChatOnStart);
  const [chatMsgs, setChatMsgs] = useState([]);
  const [sideW, setSideW] = useState(SIDE_MAX);
  const [chatW, setChatW] = useState(CHAT_MAX);
  const [chatBusy, setChatBusy] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [importError, setImportError] = useState("");
  const [newCardId, setNewCardId] = useState(null);
  const [mode, setMode] = useState("flashcards");

  const deck = decks.find((d) => d.id === activeId) ?? null;

  useEffect(() => {
    saveDecks(decks);
  }, [decks]);
  useEffect(() => {
    saveSettings(settings);
    const root = document.documentElement;
    // Body text is 15px at a 16px root; scale the root so all rem sizes follow.
    root.style.fontSize = `${(settings.fontSize / 15) * 16}px`;
    if (settings.theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", settings.theme);
  }, [settings]);
  useEffect(() => {
    setChatMsgs(activeId ? loadChat(activeId) : []);
  }, [activeId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? decks.filter((d) => d.title.toLowerCase().includes(q)) : decks;
  }, [decks, query]);

  const mutateDeck = useCallback((id, fn) => {
    setDecks((ds) => ds.map((d) => (d.id === id ? { ...fn(d), updatedAt: Date.now() } : d)));
  }, []);

  const mutateCards = (fn) => deck && mutateDeck(deck.id, (d) => ({ ...d, cards: fn(d.cards) }));

  const updateCard = (cardId, patch) =>
    mutateCards((cs) => cs.map((c) => (c.id === cardId ? { ...c, ...patch } : c)));
  const deleteCard = (cardId) => mutateCards((cs) => cs.filter((c) => c.id !== cardId));
  const toggleStar = (cardId) =>
    mutateCards((cs) => cs.map((c) => (c.id === cardId ? { ...c, starred: !c.starred } : c)));
  const addCard = () => {
    const c = newCard();
    setNewCardId(c.id);
    mutateCards((cs) => [...cs, c]);
  };

  const createDeck = () => {
    const d = newDeck();
    setDecks((ds) => [d, ...ds]);
    setActiveId(d.id);
  };

  const deleteDeck = () => {
    if (!deck) return;
    if (settings.confirmDelete && !confirm(`Delete "${deck.title}"? This can't be undone.`)) return;
    clearDeckData(deck.id);
    const rest = decks.filter((d) => d.id !== deck.id);
    setDecks(rest);
    setActiveId(rest[0]?.id ?? null);
  };

  const runImport = async (files, instructions, target) => {
    setImportBusy(true);
    setImportError("");
    try {
      const res = await api.ingest(files, instructions);
      const append = target === "append" && deck;
      const d = append ? null : newDeck(res.title, [], res.sources);
      const segIds = addSources(append ? deck.id : d.id, res.segments ?? []);
      const cards = res.cards.map((c) => newCard(c.term, c.definition, c.source != null ? segIds[c.source] ?? null : null));
      if (append) {
        mutateDeck(deck.id, (d) => ({
          ...d,
          cards: [...d.cards, ...cards],
          sources: [...new Set([...(d.sources ?? []), ...res.sources])],
        }));
      } else {
        d.cards = cards;
        setDecks((ds) => [d, ...ds]);
        setActiveId(d.id);
      }
      setImportOpen(false);
    } catch (e) {
      setImportError(e.message);
    } finally {
      setImportBusy(false);
    }
  };

  const sendChat = async (message) => {
    if (!deck) return;
    const deckId = deck.id;
    const history = chatMsgs.filter((m) => !m.error);
    const lastColor = [...chatMsgs].reverse().find((m) => m.role === "user")?.color;
    const choices = BUBBLE_COLORS.filter((c) => c !== lastColor);
    const color = settings.bubbleColors === "chat" && settings.chatColor
      ? settings.chatColor
      : choices[Math.floor(Math.random() * choices.length)];
    const withUser = [...chatMsgs, { role: "user", content: message, color }];
    setChatMsgs(withUser);
    saveChat(deckId, withUser);
    setChatBusy(true);
    try {
      const res = await api.chat({ message, title: deck.title, cards: deck.cards, history });
      const del = new Set(res.delete);
      const upd = new Map(res.update.map((u) => [u.id, u]));
      mutateDeck(deckId, (d) => ({
        ...d,
        cards: [
          ...d.cards
            .filter((c) => !del.has(c.id))
            .map((c) => {
              const u = upd.get(c.id);
              if (!u) return c;
              return { ...c, term: u.term ?? c.term, definition: u.definition ?? c.definition };
            }),
          ...res.add.map((a) => newCard(a.term, a.definition)),
        ],
      }));
      const reply = {
        role: "assistant",
        content: res.reply,
        ops: { add: res.add.length, update: res.update.length, delete: res.delete.length },
      };
      const next = [...withUser, reply];
      setChatMsgs(next);
      saveChat(deckId, next);
    } catch (e) {
      const next = [...withUser, { role: "assistant", content: e.message, error: true }];
      setChatMsgs(next);
      saveChat(deckId, next);
    } finally {
      setChatBusy(false);
    }
  };

  return (
    <div
      className={`app ${chatOpen ? "chat-open" : ""}`}
      style={{ "--side-w": `${sideW}px`, "--chat-w": `${chatOpen ? chatW : 0}px` }}
    >
      <TopBar
        query={query}
        setQuery={setQuery}
        onImport={() => { setImportError(""); setImportOpen(true); }}
        onCreate={createDeck}
        chatOpen={chatOpen}
        onToggleChat={() => setChatOpen((o) => !o)}
        onSettings={() => setSettingsOpen(true)}
      />
      {sideW > 0 && <Sidebar decks={filtered} activeId={activeId} onHome={() => setActiveId(null)} onOpen={setActiveId} />}
      <main className="main">
        {deck ? (
          <DeckView
            key={deck.id}
            deck={deck}
            onRename={(title) => mutateDeck(deck.id, (d) => ({ ...d, title }))}
            onDeleteDeck={deleteDeck}
            onUpdateCard={updateCard}
            onDeleteCard={deleteCard}
            onToggleStar={toggleStar}
            onAddCard={addCard}
            newCardId={newCardId}
            frontSide={settings.frontSide}
            shuffleByDefault={settings.shuffleByDefault}
            mode={mode}
            onModeChange={setMode}
          />
        ) : (
          <HomeView decks={filtered} onOpen={setActiveId} onImport={() => setImportOpen(true)} />
        )}
      </main>
      <Splitter side="left" width={sideW} min={SIDE_MAX * MIN_FRACTION} max={SIDE_MAX} onChange={setSideW} />
      <Splitter
        side="right"
        width={chatOpen ? chatW : 0}
        min={CHAT_MAX * MIN_FRACTION}
        max={CHAT_MAX}
        onChange={(w) => {
          if (w === 0) { setChatOpen(false); setChatW(CHAT_MAX); }
          else { setChatOpen(true); setChatW(w); }
        }}
      />
      {chatOpen && (
        <ChatPanel
          deck={deck}
          messages={chatMsgs}
          busy={chatBusy}
          chatColor={settings.chatColor}
          onSend={sendChat}
          onClear={() => { if (deck) clearChat(deck.id); setChatMsgs([]); }}
          onClose={() => setChatOpen(false)}
        />
      )}
      {importOpen && (
        <ImportModal
          canAppend={!!deck}
          busy={importBusy}
          error={importError}
          onSubmit={runImport}
          onClose={() => setImportOpen(false)}
        />
      )}
      {settingsOpen && (
        <SettingsModal
          settings={settings}
          onChange={setSettings}
          onClose={() => setSettingsOpen(false)}
          onClearData={() => {
            if (!confirm("Delete all sets, chats, and settings? This can't be undone.")) return;
            clearAllData();
            location.reload();
          }}
        />
      )}
    </div>
  );
}
