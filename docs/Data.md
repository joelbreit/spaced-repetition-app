# Data

## Storage

Each user's data is split in two in S3:

- `users/{sub}/data.json`: folders, decks and cards (below), **without** reviews.
- `users/{sub}/reviews/YYYY-MM.json`: the review log, one object per UTC month of
  the review's timestamp: `{ "reviews": [ ... ] }`, sorted by timestamp. Each
  review carries its `cardId`. Saving a grade rewrites one small month file, not
  the whole dataset.

In memory the app puts each card's reviews back on it as `card.reviews`, so
stats and history code read them as before (`src/services/reviewLog.js`).
Auto-save sends reviews that aren't in the log yet (and removes undone ones or
ones whose card was deleted) **before** saving `data.json`, so a `data.json`
without reviews never reaches S3 ahead of them.

Scheduling never needs the review log: each card stores its scheduling state
(`interval`, `reps`, `lapses`, `lastReviewed`). New cards may have none of
these. If a card's `reps` doesn't match its reviews when loading, the state is
worked out again from the reviews (`deriveSchedulingState()` in
`src/services/cardCalculations.js`).

Data saved before the review log existed has reviews nested in each card in
`data.json`. Loading still reads them, and the next auto-save moves them into
the log.

### Notes and cards

A card's text lives in a **note** (`notes` in `data.json`); the card holds
scheduling and points at its note with `noteId`. A card's `template` says
which side of the note it shows first: `forward` (the default, not stored)
shows the note's front, `reverse` its back. A reversed partner card is a
second card of the same note, so partners always mirror each other and can
sit in different decks. Deleting one keeps the note for the other; a note
with no cards left is dropped.

In memory each card also has `front`, `back` and `partnerCardId`, filled in
from its note by `resolveNotes()` (`src/services/notes.js`) after every
update. They aren't stored. To change a card's text, change its note
(`setCardText()`), never `card.front`/`card.back`: those are overwritten from
the note.

Cards saved before notes existed have `front`, `back` and `partnerCardId` on
the card. Loading gives each one a note (ID `note-<cardId>`); a pair whose
`partnerCardId`s point at each other and whose text mirrors shares one, with
the older card as `forward`. The next auto-save stores them that way.

## JSON Structure

`data.json`:

```json
{
	"version": "2",
	"updatedAt": 1234567890, // not fully implemented yet
	// Notes added in v5
	"notes": [
		{
			"noteId": "unique-id",
			"front": "Front text",
			"back": "Back text",
			"createdAt": 1234567890 // may be missing
		}
	],
	// Folders added in v2
	"folders": [
		{
			"folderId": "unique-id",
			"folderName": "Folder Name",
			"folderDescription": "Optional description",
			"folderColor": "blue", // optional key from src/config/containerColors.js, defaults to "teal"
			"folderSymbol": "folder", // lucide icon key from src/config/containerIcons.js
			"parentFolderId": null, // null or missing = root level, otherwise references another folderId
			"createdAt": 1234567890,
			"updatedAt": 1234567890 // not fully implemented yet
		}
	],
	"decks": [
		{
			"deckId": "unique-id",
			"deckName": "Deck Name",
			"deckSymbol": "book-open", // optional lucide icon key from src/config/containerIcons.js; unknown values (e.g. legacy emoji) render the default
			"deckColor": "violet", // optional key from src/config/containerColors.js, defaults to "teal"
			"parentFolderId": null, // v2, null or missing = root level, otherwise references another folderId
			"isArchived": false, // optional, defaults to false. Archived decks are excluded from folder stats and Study All, but still viewable and studyable directly
			"createdAt": 1234567890, // added later, may be missing
			"updatedAt": 1234567890, // not fully implemented yet
			"cards": [
				{
					"cardId": "unique-id",
					"noteId": "unique-id", // v5: the note holding this card's text
					"template": "reverse", // v5: "forward" (default, omitted) or "reverse"
					"whenDue": 1234567890,
					// v4 scheduling state, missing on new cards
					"interval": 1234567890, // ms, set by the last review
					"reps": 3, // times reviewed
					"lapses": 1, // times graded Unfamiliar (`forgot`)
					"lastReviewed": 1234567890, // timestamp of the last review
					"isFlagged": false,
					"isStarred": false,
					"createdAt": 1234567890, // added later, may be missing
					// optional, set by a catch-up (src/services/catchUp.js): the card was
					// rescheduled as if graded Too Difficult (`sooner`), without recording a review.
					// getInterval() uses `interval` until the next real review.
					"reschedule": {
						"at": 1234567890, // when the catch-up ran
						"interval": 1234567890, // halved interval, ms
						"previousWhenDue": 1234567890, // for undo
						"previousReschedule": {} // optional, an earlier reschedule, for undo
					}
				}
			]
		}
	]
}
```

`reviews/YYYY-MM.json`:

```json
{
	"reviews": [
		{
			"cardId": "unique-id",
			"reviewId": "unique-id", // unique within its card
			"timestamp": 1234567890,
			"reviewDuration": 1234567890, // v3: ms spent reviewing the card, may be missing
			"interval": 1234567890, // added later, may be missing
			"result": "forgot" | "sooner" | "right" | "later" // older data may have "again" | "hard" | "good" | "easy", renamed on load
		}
	]
}
```

## v5 (notes)

- [x] Move card text into notes; cards point at them with `noteId` and `template`
- [x] Reversed partners are two cards of one note (`partnerCardId` is no longer stored)
- Note: existing data is migrated by the app on its first save after loading.

## v4 (review log)

- [x] Move reviews out of `data.json` into monthly review log files
- [x] Store scheduling state (`interval`, `reps`, `lapses`, `lastReviewed`) on each card
- Note: existing data is migrated by the app on its first save after loading.

## v3 (review times)

- [ ] Add `reviewDuration` to the review object

## v2 (folders)

- [x] v2: Folders
    - [x] Add the folders array to the data
    - [x] folders/decks with no parent folder should be in the root level folder
    - Note: There will be no representation of the root level folder in the data, but it will be implied. The root level folder doesn't have a color, symbol, or description; it is simply the implied parent of all folders and decks.
