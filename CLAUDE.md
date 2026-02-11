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

## Tech Stack

- **Frontend**: React 19 + Tailwind CSS v4 + Vite 6
- **Backend**: AWS Lambda (Node.js 20.x) + API Gateway + S3 + Cognito
- **State**: React Context (Theme → Auth → Notification → AppData)
- **Icons**: lucide-react only
- **Charts**: Recharts
- **Drag/Drop**: @dnd-kit

## Architecture

Guest mode uses localStorage; authenticated mode uses AWS (Cognito → API Gateway → Lambda → S3).

Key files:

- `src/contexts/AppDataContext.jsx` - Central data state, auto-save with 10s debounce, PATCH optimization
- `src/contexts/AuthContext.jsx` - Cognito auth, token refresh every 45 min
- `src/services/cardCalculations.js` - Spaced repetition algorithm
- `src/services/apiStorage.js` - API client (GET/POST/PATCH)
- `src/functions/flashcards-api/index.mjs` - Lambda CRUD endpoint
- `src/functions/flashcards-read-aloud/index.mjs` - AWS Polly TTS endpoint

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

- **Again**: Reset to minimum (~10 min)
- **Hard**: 0.5x previous interval
- **Good**: 1x previous interval
- **Easy**: 2x previous interval

Review priority: Overdue → New (random) → Future (soonest first)
