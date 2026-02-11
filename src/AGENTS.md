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
- **State**: `appData`, `isLoading`, `isSaving`, `isOnline`
- **Features**:
    - Auto-saves with 10-second debounce
    - PATCH optimization for single card/deck changes
    - Falls back to localStorage when offline
    - Merges local data on signup

### `AuthContext.jsx`

- **Purpose**: Cognito authentication
- **Key exports**: `useAuth()` hook
- **State**: `user`, `authToken`, `isAuthenticated`, `isLoading`
- **Features**:
    - Token auto-refresh every 45 minutes
    - Login, register, confirm, logout, changePassword

### `ThemeContext.jsx`

- **Purpose**: Dark/light theme toggle
- **Key exports**: `useTheme()` hook
- **Persists**: to localStorage

### `NotificationContext.jsx`

- **Purpose**: Toast notifications
- **Key exports**: `useNotification()` hook via `hooks/useNotification.js`
- **Methods**: `showSuccess()`, `showError()`, `showInfo()`

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
| `CardEditView.jsx`          | Modal for creating/editing cards          |
| `SortableContainerItem.jsx` | Draggable folder/deck item (uses dnd-kit) |
| `StudyStatistics.jsx`       | Stats display (due/new/learned, mastery)  |
| `AuthView.jsx`              | Login/signup forms                        |
| `DemoBanner.jsx`            | Banner for guest mode                     |

### Review Components (`components/Review/`)

| Component               | Purpose                                |
| ----------------------- | -------------------------------------- |
| `CardReviewView.jsx`    | Main review interface, card flip logic |
| `CardSide.jsx`          | Renders front or back of card          |
| `CardActionButtons.jsx` | Again/Hard/Good/Easy buttons           |
| `ReviewSummary.jsx`     | Session results after review ends      |
| `ReadAloudButton.jsx`   | Text-to-speech via AWS Polly           |
| `AnimationOverlay.jsx`  | Confetti and visual feedback           |

### Profile Components (`components/Profile/`)

| Component             | Purpose                               |
| --------------------- | ------------------------------------- |
| `ActivityHeatmap.jsx` | GitHub-style review activity grid     |
| `ProgressChart.jsx`   | Line chart of card progress over time |
| `AdditionalStats.jsx` | Detailed statistics                   |

## Services (`services/`)

### `apiStorage.js`

API client for backend communication:

```javascript
loadFromAPI(authToken, refreshToken); // GET /data
saveToAPI(data, authToken, refreshToken); // POST /data (full save)
patchToAPI(patchData, authToken, refreshToken); // PATCH /data (incremental)
checkAPIHealth(); // OPTIONS /data
readAloudAPI(text); // POST /read-aloud
```

### `cardCalculations.js`

Spaced repetition logic:

- Calculate next due date based on review result
- Determine card status (new, learning, struggling, mastered)
- Sort cards by review priority

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

### Adding Reviews

```jsx
const newReview = {
	reviewId: crypto.randomUUID(),
	timestamp: Date.now(),
	result: 'good',
	interval: newInterval,
	reviewDuration: timeSpentMs,
};

// Update card with new review
const updatedCard = {
	...card,
	reviews: [...card.reviews, newReview],
	whenDue: Date.now() + newInterval,
};
```

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

- `Space` / `Enter`: Flip card or select "Good"
- `1-4`: Select Again/Hard/Good/Easy
- `Arrow keys`: Navigate results

## Error Handling

- API errors show toast notifications via `showError()`
- Falls back to localStorage on network failure
- Token expiry triggers automatic refresh, retries request once
