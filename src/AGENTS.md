# AGENTS.md - Frontend Source Code

## Directory Structure

```
src/
├── App.jsx              # Root component with provider hierarchy
├── main.jsx             # React entry point
├── index.css            # Global styles (Tailwind directives)
├── components/          # UI components
├── contexts/            # React Context providers
├── hooks/               # Custom hooks
├── pages/               # Page-level components
├── services/            # API and utility services
├── config/              # Configuration (Amplify)
└── functions/           # AWS Lambda source code
```

## Context Provider Hierarchy

The app wraps contexts in this order (outermost to innermost):

```jsx
<ThemeProvider>         // Dark/light mode
  <AuthProvider>        // Cognito auth state
    <NotificationProvider>  // Toast notifications
      <AppDataProvider>     // Flashcard data + auto-save
        <Router>            // React Router
```

**Important**: `AppDataProvider` depends on `AuthContext` for authentication state.

## Key Contexts

### `AppDataContext.jsx`

- **Purpose**: Manages all flashcard data (folders, decks, cards)
- **Key exports**: `useAppData()` hook
- **State**: `appData`, `isLoading`, `isSaving`, `isOnline`, `hasGuestEdits`
- **Features**:
    - Auto-saves with 10-second debounce
    - Syncs only changed objects (`services/sync.js`); pulls other devices' changes on focus and every 5 min
    - Guest mode is in-memory only — no localStorage persistence
    - `hasGuestEdits` flag tracks whether the guest has modified demo data

### `AuthContext.jsx`

- **Purpose**: Cognito authentication
- **Key exports**: `useAuth()` hook
- **State**: `user`, `authToken`, `isAuthenticated`, `isLoading`
- **Features**:
    - Token auto-refresh every 45 minutes
    - Login, register, confirm, logout, changePassword

### `ThemeContext.jsx`

- **Purpose**: Theme preference — `system` (follows the OS), `light` or `dark`
- **Key exports**: `useTheme()` hook → `{ isDark, preference, setPreference, toggleTheme }`
- **Persists**: `themePreference` in localStorage. An inline script in `index.html` applies it before first paint
- **Styling**: Tailwind's `dark:` variant is bound to the `.dark` class (`@custom-variant` in `index.css`), so the OS setting only matters through `system`

### `NotificationContext.jsx`

- **Purpose**: Toast notifications
- **Key exports**: `useNotification()` hook via `hooks/useNotification.js`
- **Methods**: `showSuccess()`, `showError()`, `showInfo()`, `showConfirmation()`
- **`showConfirmation()`** resolves `true` (confirm), `false` (cancel button) or `null` (dismissed with Escape, the X or the backdrop). Enter confirms

## Component Organization

### Pages (`pages/`)

| Component          | Route      | Purpose                                          |
| ------------------ | ---------- | ------------------------------------------------ |
| `OverviewPage.jsx` | `/*`       | Main app shell, folder/deck browser, review mode |
| `ProfilePage.jsx`  | `/profile` | User stats, settings, change password            |

### Core Components (`components/`)

| Component                   | Purpose                                   |
| --------------------------- | ----------------------------------------- |
| `Header.jsx`                | App header with nav, streak, sync status  |
| `Footer.jsx`                | Links and app info                        |
| `FolderBrowserView.jsx`     | Navigate folders, view decks              |
| `DeckCardsView.jsx`         | View/manage cards in a deck               |
| `CardEditView.jsx`          | Modal for editing a card, with preview    |
| `NewCardModal.jsx`          | Modal for adding basic or cloze cards     |
| `CardPreview.jsx`           | Live Markdown preview of a card's sides   |
| `MarkdownTextarea.jsx`      | Card text field that takes images         |
| `MediaImage.jsx`            | Shows an uploaded card image              |
| `ImportPackModal.jsx`       | Import Pack: check, preview, apply a pack |
| `SortableContainerItem.jsx` | Draggable folder/deck item (uses dnd-kit) |
| `StudyStatistics.jsx`       | Stats display (due/new/learned, mastery)  |
| `AuthView.jsx`              | Login/signup forms                        |
| `DemoBanner.jsx`            | Banner for guest mode                     |

### Review Components (`components/Review/`)

| Component                    | Purpose                                        |
| ---------------------------- | ---------------------------------------------- |
| `CardReviewView.jsx`         | Main review interface, card flip logic         |
| `CardSide.jsx`               | Renders front or back of card                  |
| `CardActionButtons.jsx`      | Star and flag buttons                          |
| `ReviewSummary.jsx`          | Session results, celebration, study-ahead/undo |
| `KeyboardShortcutsModal.jsx` | `?` overlay listing review shortcuts           |
| `ReadAloudButton.jsx`        | Text-to-speech via AWS Polly                   |

### Profile Components (`components/Profile/`)

Most sections take a `stats` prop computed once in `ProfilePage` by `computeStudyStats` (`services/statsCalculations.js`).

| Component             | Purpose                                                        |
| --------------------- | -------------------------------------------------------------- |
| `StudyRecords.jsx`    | Streaks, best day/week, study time, sessions                   |
| `ActivityHeatmap.jsx` | GitHub-style review activity grid                              |
| `DueForecast.jsx`     | Cards coming due over the next 30 days                         |
| `CardMaturity.jsx`    | New / learning / young / mature breakdown                      |
| `RetentionStats.jsx`  | Recall rate by time since last review, and by week             |
| `ProgressChart.jsx`   | Cards created/studied and reviews over time, with range toggle |
| `StudyHabits.jsx`     | Weekday × hour grid and answer time by grade                   |
| `DeckBreakdown.jsx`   | Per-deck reviews, recall, overdue share; most neglected deck   |
| `HardestCards.jsx`    | Cards marked Unfamiliar or Too Difficult most often            |
| `AdditionalStats.jsx` | On-demand totals plus a collapsed "Data health" section        |
| `StatsCard.jsx`       | Shared card, tile, tooltip and toggle building blocks          |
| `chartTheme.js`       | Recharts colors for light/dark and grade colors                |

## Services (`services/`)

### `apiStorage.js`

API client for backend communication:

```javascript
loadFromAPI(authToken, refreshToken); // GET /data
syncToAPI({ since, changes }, authToken, refreshToken); // POST /sync (merge; returns other devices' changes)
loadReviewsFromAPI(authToken, refreshToken); // GET /reviews (the whole review log)
saveReviewsToAPI({ add, remove }, authToken, refreshToken); // POST /reviews (batched)
checkAPIHealth(); // OPTIONS /data
readAloudAPI(text, voiceId, engine, { authToken, refreshToken }); // POST /read-aloud (signed-in only)
```

### `cardCalculations.js`

Spaced repetition logic:

- Calculate next due date based on review result
- Determine card status (new, learning, struggling, mastered)
- Sort cards by review priority

### `streak.js`

`calculateStreakStats(decks)` → `{ streak, reviewsToday }`, shared by the header and review summary.

### `repairCreatedAt.js`

Utility to add missing `createdAt` timestamps to old data.

## Hooks (`hooks/`)

### `useDeckOperations.js`

Common deck operations:

- Create, rename, delete decks
- Duplicate cards (create reverse cards)
- Move deck to folder

### `useNotification.js`

Wrapper for NotificationContext.

### `useAuth.js`

Re-export of auth context hook.

## Styling Patterns

### Tailwind CSS v4

- Use CSS variables via `@theme` directive
- Dark mode: use `dark:` variant on all color classes
- Gradients: `bg-linear-to-r from-teal-500 to-cyan-500`

### Common Patterns

```jsx
// Card container
<div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6">

// Primary button
<button className="px-4 py-2 bg-linear-to-r from-teal-500 to-cyan-500
  hover:from-teal-600 hover:to-cyan-600 text-white rounded-xl">

// Interactive card with hover lift
<div className="transform hover:-translate-y-1 hover:shadow-xl
  transition-all duration-300 cursor-pointer">
```

## State Management Patterns

### Reading Data

```jsx
const { appData } = useAppData();
const deck = appData.decks.find((d) => d.deckId === deckId);
const folders = appData.folders.filter(
	(f) => f.parentFolderId === currentFolderId
);
```

### Updating Data

Always use immutable updates with `setAppData`:

```jsx
const { setAppData } = useAppData();

// Update a card
setAppData((prev) => ({
	...prev,
	decks: prev.decks.map((deck) =>
		deck.deckId === deckId
			? {
					...deck,
					cards: deck.cards.map((card) =>
						card.cardId === cardId ? { ...card, ...updates } : card
					),
				}
			: deck
	),
}));
```

### Card Text and Partners

A card's text lives in its note (`appData.notes`); `card.front`, `card.back`
and `card.partnerCardId` are filled in from the note after every
`setAppData` and are never stored. Change text with `updateCard()` /
`setCardText()` (`services/notes.js`), which edits the note, so a reversed
partner changes too. New cards: `newNoteAndCard()`; a reversed partner:
`reversedCard()`.

Cloze notes (`services/cloze.js`): `addClozeNote(deckId, text, extra)` makes
one card per `{{cN::...}}` number. Editing a cloze card through `updateCard`
passes the note's text as `front` and its extra as `back`, and adds or
deletes cards as numbers appear or disappear. Render any card side with
`<CardText text={card.front} cloze={clozeProps(card, 'front')} />` (Markdown,
code highlighting and Mermaid diagrams; `clozeProps` is null for basic cards);
`card.front`/`card.back` are the unrendered text (search, stats), and
read-aloud speaks `speakableText()` from `services/markdown.js`. Use `canReverse(card)` rather
than checking `partnerCardId`.

Import Cards (`DeckCardsView`) reads a TSV file with `parseCardImport()`
(`services/importCards.js`): each row is `front<TAB>back`, or cloze text (with
`{{cN::...}}`) and an optional extra. Quoted fields can span lines, and
Anki's `#separator:`/`#html:` header lines are understood.

### Adding Reviews

Use `applyReview()` from `services/cardCalculations.js`: it appends the review
and updates the card's scheduling state (`whenDue`, `interval`, `reps`,
`lapses`, `lastReviewed`) together. Code that restores a card's schedule (like
undo) should copy all of `SCHEDULE_FIELDS` (`pickSchedule(card)`). Check
whether a card is new with `isReviewed(card)`, not `card.reviews.length`.

```jsx
const updatedCard = applyReview(card, 'right', Date.now(), timeSpentMs);
```

Auto-save sends the new review to the review log; no other step is needed.

## Navigation

Uses React Router v7 with a single catch-all route for the main app:

```jsx
<Routes>
	<Route path="/*" element={<OverviewPage />} />
	<Route path="/profile" element={<ProfilePage />} />
</Routes>
```

`OverviewPage` handles internal navigation state for:

- Folder browsing
- Deck card view
- Card review mode

## Drag and Drop

Uses `@dnd-kit` for reordering:

- `SortableContainerItem` wraps folder/deck items
- Reordering updates the array order in `appData`

## Keyboard Shortcuts

In review mode (`CardReviewView.jsx`):

- `Space` / `Enter`: Flip card or select "Effortful"
- `1-4`: Select Unfamiliar/Too Difficult/Effortful/Too Easy
- `Arrow keys`: Navigate results

## Error Handling

- API errors show toast notifications via `showError()`
- No localStorage fallback — data stays in React state on network failure, retried on next save
- Token expiry triggers automatic refresh, retries request once
