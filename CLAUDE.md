# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Reference

```bash
npm run dev          # Start dev server at localhost:5173
npm run build        # Production build
npm run lint         # Run ESLint
npm run format       # Format all files with Prettier
npm run format:check # Check formatting without writing
npm run preview      # Preview production build
```

Backend (from `backend/`):

```bash
sam validate --lint  # Validate the SAM template
sam build            # Build both Lambda functions
sam deploy           # Deploy the `flashcards` stack
```

## Tech Stack

- **Frontend**: React 19 + Tailwind CSS v4 + Vite 6
- **Backend**: AWS Lambda (Node.js 24.x) + API Gateway + S3 + Cognito
- **Infrastructure**: AWS SAM (`backend/template.yaml`, stack name `flashcards`)
- **State**: React Context (Theme → Auth → Notification → AppData)
- **Icons**: lucide-react only
- **Charts**: Recharts
- **Drag/Drop**: @dnd-kit

## Architecture

Guest mode is in-memory demo data (resets on reload); authenticated mode uses AWS (Cognito → API Gateway → Lambda → S3). Read aloud is signed-in only.

Key files:

- `src/contexts/AppDataContext.jsx` - Central data state, auto-sync with 10s debounce
- `src/contexts/AuthContext.jsx` - Cognito auth, token refresh every 45 min
- `src/services/cardCalculations.js` - Spaced repetition algorithm
- `src/services/apiStorage.js` - API client (`/data` GET, `/sync` POST, `/reviews` GET/POST)
- `src/services/sync.js` + `backend/.../merge.mjs` - Saves merge object by object across devices (`updatedAt`, graves, `rev`/`usn`)
- `src/services/reviewLog.js` - Reviews live in a separate monthly review log in S3, put back on cards in memory
- `src/services/notes.js` - Card text lives in notes; reversed partners are two cards of one note. Edit text through the note, not `card.front`
- `src/services/cloze.js` - Cloze deletions (`{{c1::answer::hint}}`); a cloze note makes one card per number
- `src/services/media.js` + `backend/.../media.mjs` - Card images: `![alt](media:{sha256}.{ext})`, one S3 object each, uploaded/downloaded with signed URLs and cached in the browser
- `src/components/CardText.jsx` - Renders card text as Markdown (highlighting and Mermaid load on demand); `src/services/markdown.js` has the cloze plugin and `speakableText`
- `backend/template.yaml` - SAM template (all backend infrastructure)
- `backend/src/functions/flashcards-api/index.mjs` - Lambda CRUD endpoint
- `backend/src/functions/flashcards-read-aloud/index.mjs` - AWS Polly TTS endpoint (Cognito JWT authorizer at the gateway; `readAloudAPI()` takes `{ authToken, refreshToken }`)

## Code Patterns

### State Updates

Always use `setAppData` with immutable updates - it triggers auto-save:

```jsx
const { appData, setAppData } = useAppData();

setAppData((prev) => ({
	...prev,
	decks: prev.decks.map((d) =>
		d.deckId === deckId ? { ...d, ...updates } : d
	),
}));
```

### Styling

- Tailwind utility classes everywhere, no CSS-in-JS
- Dark mode: always include `dark:` variants
- Primary gradient: `bg-linear-to-r from-teal-500 to-cyan-500`

### IDs

UUIDs via `crypto.randomUUID()`. Timestamps in milliseconds (Unix epoch).

## Documentation

- `docs/Data.md` - JSON schema for folders, decks, cards, reviews
- `docs/Design.md` - Colors, typography, component patterns
- `docs/AWS Architecture.md` - AWS resources, IAM, deployment
- `AGENTS.md` - Full architecture overview
- `src/AGENTS.md` - Frontend component details

## Spaced Repetition Algorithm

Review results affect next interval:

- **Unfamiliar** (`forgot`): Reset to minimum (~10 min)
- **Too Difficult** (`sooner`): 0.5x previous interval
- **Effortful** (`right`): 1x previous interval
- **Too Easy** (`later`): 2x previous interval

Saved as `result: 'forgot' | 'sooner' | 'right' | 'later'`; the button labels come from `RESULT_LABELS` in `src/services/grades.js` and can change without migrating data. Don't reuse Anki's Again/Hard/Good/Easy names: the meanings differ. Grades saved before the rename as `again`/`hard`/`good`/`easy` are renamed when data loads (`src/services/grades.js`).

Review priority: Overdue → New (random) → Future (soonest first)
