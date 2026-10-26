import { useEffect, useMemo, useState } from "react";
import { loadSources } from "../storage.js";
import Flashcard from "./Flashcard.jsx";
import CardList from "./CardList.jsx";
import ModePicker from "./ModePicker.jsx";
import LearnMode from "./LearnMode.jsx";
import DiscussionMode from "./DiscussionMode.jsx";
import ExamMode from "./ExamMode.jsx";
import GamesMode from "./GamesMode.jsx";
import { Trash } from "./icons.jsx";

export default function DeckView({ deck, onRename, onDeleteDeck, onUpdateCard, onDeleteCard, onToggleStar, onAddCard, newCardId, frontSide, shuffleByDefault, mode, onModeChange }) {
  const [title, setTitle] = useState(deck.title);
  // Reload when cards change so newly imported segments show up.
  const sources = useMemo(() => loadSources(deck.id), [deck.id, deck.cards]);
  useEffect(() => {
    setTitle(deck.title);
  }, [deck.id, deck.title]);

  const commitTitle = () => {
    const t = title.trim() || "Untitled set";
    setTitle(t);
    if (t !== deck.title) onRename(t);
  };

  return (
    <div className="deck">
      <div className="deck-head">
        <input
          className="deck-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          aria-label="Set title"
        />
        <button className="icon-btn danger" title="Delete set" onClick={onDeleteDeck}><Trash /></button>
      </div>
      {deck.sources?.length > 0 && (
        <p className="muted small deck-sources">From: {deck.sources.join(", ")}</p>
      )}

      <div className="modes">
        <ModePicker mode={mode} onChange={onModeChange} />
      </div>

      {mode === "learn" ? (
        <LearnMode cards={deck.cards} />
      ) : mode === "discussion" ? (
        <DiscussionMode deck={deck} />
      ) : mode === "games" ? (
        <GamesMode deck={deck} />
      ) : mode === "exam" ? (
        <ExamMode deck={deck} sources={sources} onUpdateCard={onUpdateCard} />
      ) : (
        <>
          <Flashcard cards={deck.cards} sources={sources} onUpdate={onUpdateCard} onToggleStar={onToggleStar}
            frontSide={frontSide} shuffleByDefault={shuffleByDefault} />
          <CardList cards={deck.cards} sources={sources} onUpdate={onUpdateCard} onDelete={onDeleteCard}
            onToggleStar={onToggleStar} onAdd={onAddCard} newCardId={newCardId} />
        </>
      )}
    </div>
  );
}
