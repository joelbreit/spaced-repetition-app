# AGENTS.md - Spaced Repetition Flashcards App

## Project Overview

A modern React flashcards application with spaced repetition scheduling, built with:
- **Frontend**: React 19, Tailwind CSS v4, Vite
- **Backend**: AWS Lambda + API Gateway + S3 + Cognito
- **State**: React Context (AuthContext, AppDataContext, ThemeContext, NotificationContext)

## Quick Start

```bash
npm install
npm run dev     # Start development server at localhost:5173
npm run build   # Production build
```

## Architecture Summary

```
User (Browser)
    │
    ├── Guest Mode → localStorage only
    │
    └── Authenticated Mode
            │
            ├── AWS Cognito (auth)
            └── API Gateway → Lambda → S3 (data storage)
```

### Key Data Flow

1. **Loading**: `AppDataContext` loads data from API (authenticated) or localStorage (guest)
2. **Auto-save**: Changes debounced to 10 seconds, uses PATCH for incremental saves when possible
3. **Offline fallback**: Falls back to localStorage if API is unavailable

## Important Files & Directories

| Path | Purpose |
|------|---------|
| `src/App.jsx` | Root component, context providers, routing |
| `src/contexts/AppDataContext.jsx` | Central data state, save/load logic, PATCH optimization |
| `src/contexts/AuthContext.jsx` | Cognito auth, token refresh, user state |
| `src/services/apiStorage.js` | API client (GET/POST/PATCH/read-aloud) |
| `src/services/cardCalculations.js` | Spaced repetition algorithm |
| `src/functions/flashcards-api/index.mjs` | Lambda: CRUD for flashcard data |
| `src/functions/flashcards-read-aloud/index.mjs` | Lambda: AWS Polly text-to-speech |
| `docs/Data.md` | Data schema documentation |
| `docs/Design.md` | UI/UX design system (colors, components, animations) |

## Data Structure

User data is stored as JSON in S3 at `users/{userId}/data.json`:

```json
{
  "folders": [
    {
      "folderId": "uuid",
      "folderName": "Name",
      "parentFolderId": null,  // null = root level
      "folderSymbol": "📁",
      "folderColor": "#3b82f6"
    }
  ],
  "decks": [
    {
      "deckId": "uuid",
      "deckName": "Deck Name",
      "deckSymbol": "📚",
      "parentFolderId": null,  // null = root level
      "cards": [
        {
          "cardId": "uuid",
          "front": "Question",
          "back": "Answer",
          "whenDue": 1234567890,  // Unix timestamp (ms)
          "reviews": [
            {
              "reviewId": "uuid",
              "timestamp": 1234567890,
              "result": "again|hard|good|easy",
              "interval": 86400000,
              "reviewDuration": 5000
            }
          ],
          "isFlagged": false,
          "isStarred": false,
          "partnerCardId": "uuid"  // For reverse cards
        }
      ]
    }
  ]
}
```

## Spaced Repetition Algorithm

Review results affect the next due date:
- **Again**: Reset to minimum interval (~10 minutes)
- **Hard**: Halve the previous interval
- **Good**: Keep the same interval
- **Easy**: Double the interval

Card priority during review:
1. Overdue cards (most recently due first)
2. New cards (randomized)
3. Future cards (due soonest first)

## Component Patterns

### Context Usage
```jsx
import { useAppData } from './contexts/AppDataContext';
import { useAuth } from './contexts/AuthContext';
import { useNotification } from './hooks/useNotification';

const { appData, setAppData, isLoading } = useAppData();
const { user, isAuthenticated, authToken } = useAuth();
const { showSuccess, showError } = useNotification();
```

### Modifying Data
Always use `setAppData` from AppDataContext - it handles auto-save:
```jsx
setAppData(prev => ({
  ...prev,
  decks: prev.decks.map(d => d.deckId === deckId ? updatedDeck : d)
}));
```

## UI/UX Guidelines

- **Design system**: See `docs/Design.md` for colors, spacing, components
- **Icons**: Use `lucide-react` exclusively
- **Theme**: Teal-cyan gradient primary, full dark mode support
- **Animations**: Subtle transitions (200-300ms), avoid during rapid interactions
- **Mobile-first**: Responsive at sm/md/lg breakpoints

## Environment Variables

Required in `.env.local`:
```
VITE_API_ENDPOINT=https://xxx.execute-api.us-east-1.amazonaws.com/prod
VITE_USER_POOL_ID=us-east-1_xxx
VITE_USER_POOL_CLIENT_ID=xxx
VITE_AWS_REGION=us-east-1
```

## AWS Resources

See `docs/AWS Architecture.md` for full details:
- **S3 Bucket**: `spaced-rep-flashcards-data` (versioning enabled)
- **Lambda**: `flashcards-api` (Node.js 20.x)
- **API Gateway**: HTTP API with `/data` and `/read-aloud` endpoints
- **Cognito**: `flashcards-users` pool with email-based auth

## Common Tasks

### Adding a New Feature
1. Update data structure in `docs/Data.md` if needed
2. Update `AppDataContext` if state changes are required
3. Create/modify components in `src/components/`
4. Follow existing patterns for styling (Tailwind, dark mode variants)

### Modifying the API
1. Update Lambda code in `src/functions/flashcards-api/index.mjs`
2. Deploy using `scripts/deploy-lambdas.sh`
3. Update `src/services/apiStorage.js` client if endpoints change

### Adding New Card/Deck Properties
1. Add to data schema in `docs/Data.md`
2. Handle missing values gracefully (properties may not exist on old data)
3. Update relevant components to use the new property

## Testing Considerations

- Guest mode should work fully offline (localStorage only)
- Auth token expires after 1 hour; refresh happens every 45 minutes
- PATCH optimization only works for single deck/card changes; bulk operations use POST
- Demo data loads for new guest users

## Known Issues & TODOs

See `docs/Tasks.md` for the full list. Key issues:
- Firefox: Back of cards shows dimly when flipped
- Orphaned folders/decks should show an error
- Missing `createdAt` values on some old data

