# Compendium (compendium.ai)

Electron + React (Vite) frontend, FastAPI backend, Claude for generating and editing cards.

- **Import** PowerPoint (`.pptx`), Word (`.docx`), PDF, or text files, one or several at a time → Claude builds a flashcard set.
- **Study** with a Quizlet-style flip card: click or press Space to flip, ← → to move, shuffle, star cards, study starred only.
- **Source-linked cards:** each imported card remembers the slide, page, or section it came from. Click the book icon (or press S) on a card, or the chip in the term list, to see the original text and speaker notes. **Explain from my notes** gives a short explanation that uses only that source (`/api/explain`). Wrong exam answers link to the source to review. Segments are stored per deck in `localStorage` (`fc.sources.v1.<deckId>`).
- **Edit** cards by hand (on the card or in the term list), or through the **assistant chat** ("add 5 cards on X", "shorten all definitions", "remove duplicates"). Replies are kept to about one sentence. The model sends back structured add/update/delete ops, and the app applies them.
- **Study modes** (dropdown on each set):
  - **Flashcards:** flip cards.
  - **Learn:** local multiple choice; cards you miss come back until you've mastered them all.
  - **Discussion:** the AI asks open-ended questions and gives feedback on your answers (`/api/discuss`).
  - **Exam:** an AI-generated practice test with multiple choice, true/false, and short-answer questions, up to 50 (`/api/exam`). Questions that fail validation are sent back to the model to regenerate. Short answers are graded by the AI (`/api/exam/grade`).
- Storage is `localStorage` for now (`src/storage.js`).

## Setup

Prerequisites: Node.js 24, Python 3.14, and Git. The desktop app runs locally;
AI features require your own Anthropic API key (with an optional OpenAI fallback).
Source previews for Word and PowerPoint files require Windows with Microsoft
Word and PowerPoint installed. Text extraction works without Office.

Clone the repository and open its folder:

```powershell
git clone https://github.com/andrewchampagne/compendium.git
cd compendium
```

On Windows, set up the backend in PowerShell:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit `backend/.env` and set `ANTHROPIC_API_KEY`. Keep this file private.
Then install the frontend dependencies from the repository root:

```powershell
cd ..
npm ci
```

On macOS/Linux, use `.venv/bin/python` instead of `.venv\Scripts\python.exe`
and `cp .env.example .env` to copy the template. If Electron's binary is missing
after installing dependencies, run `node node_modules/electron/install.js` once.

## Run

On Windows, run this in PowerShell from the repo root (no Make installation needed):

```powershell
.\start.cmd
```

You can also double-click `start.cmd` in File Explorer.

With GNU Make installed, run `make` (or `make start`) from the repo root to
start the app. `make dev` is an alias, and `make build` builds the frontend.
Complete the setup above before the first run.

You can also start it directly with npm:

```bash
npm run dev
```

This starts Vite and Electron. Electron starts the FastAPI backend on `127.0.0.1:8765` using `backend/.venv`, and stops it when the app quits.

Other scripts: `npm run dev:web` (Vite only, in a browser), `npm run backend` (API only, with reload), `npm run build` then `npm start` (run the built UI in Electron).

`npm run backend` uses the Windows virtual environment path. On macOS/Linux,
run `cd backend` then `.venv/bin/python -m uvicorn app.main:app --port 8765 --reload`.
When using `npm run dev:web`, start the backend in a second terminal.

## GitHub workflow

After editing files, save and upload your changes with:

```powershell
git add .
git commit -m "Describe your changes"
git push
```

Git ignores API key files, virtual environments, installed dependencies, build
output, and imported documents under `backend/data/`. Review `git diff --cached`
before committing to check what you are sharing. GitHub Actions builds the
frontend and checks backend startup on pushes and pull requests; no API keys are
needed for these checks. AI generation and the Electron UI need separate manual testing.

## Layout

```
backend/app/
  main.py      FastAPI routes: /api/health, /api/ingest, /api/chat, /api/explain, ...
  extract.py   pptx/docx/pdf/txt → segments (slide/page/section, includes speaker notes)
  llm.py       Claude calls (structured outputs, refusal fallback)
  schemas.py   API + model-output schemas
electron/      main process (spawns backend), preload
src/
  App.jsx                  state, layout (top bar, library sidebar, chat panel)
  components/Flashcard.jsx the study card component
  components/CardList.jsx  "Terms in this set" with inline editing
  components/ChatPanel.jsx assistant chat
  components/ImportModal.jsx
  storage.js / api.js
```

## Token usage

- Chat runs at `effort: "low"` with a terse system prompt, and returns only `{reply, add, update, delete}`.
- The deck is sent as compact numbered lines (`3. term :: definition`). The model refers to cards by number, and the backend maps numbers back to card ids.
- Chat history is capped at the last 8 turns, and only reply text is sent back.
- Deck generation runs at `effort: "medium"` with streaming.

Model defaults to `claude-opus-5-5`. Override it with `FLASHCARD_MODEL` in `backend/.env`.

**OpenAI fallback:** set `OPENAI_API_KEY` (and optionally `OPENAI_MODEL`, default `gpt-5`) in `backend/.env`. If a Claude call fails because of a bad or missing key, a rate limit, or an outage, the same request is retried on OpenAI with the same structured-output schema. Refusals and invalid output are not retried. `/api/health` reports the fallback model when one is configured.
