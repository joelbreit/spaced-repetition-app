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

**Cloze notes** (`type: "cloze"`) hold `text` with deletions in Anki's syntax,
`{{c1::answer}}` or `{{c1::answer::hint}}`, and an optional `extra` shown on
the back. They make one `cloze` card per cloze number; the card's `ord` is its
number. On card N every `cN` deletion is a blank (`[...]` or `[hint]`) on the
front and highlighted on the back; other numbers show as plain text
(`src/services/cloze.js`). Editing the text keeps one card per number
(`setClozeText()`): a new number gets a card, and a card whose number is gone
is deleted with its review history (the editor warns first). Cloze cards of
one note are siblings, not partners: they have no `partnerCardId`, can't be
reversed, and the review order spreads them apart like partners. In memory a
cloze card also has `clozeText` and `clozeExtra` for rendering.

Cards saved before notes existed have `front`, `back` and `partnerCardId` on
the card. Loading gives each one a note (ID `note-<cardId>`); a pair whose
`partnerCardId`s point at each other and whose text mirrors shares one, with
the older card as `forward`. The next auto-save stores them that way.

### Saving and sync

The app saves by syncing (`POST /sync`), not by overwriting `data.json`, so
two devices (or tabs) editing at once are merged object by object:

- **Objects:** folders, decks (without their cards), cards and notes. Each
  change is sent on its own, stamped `updatedAt` (when it was saved). The
  server keeps the newer version of each object.
- **Deletions** leave a grave `{ type, id, at }` in `data.json`. A deletion
  beats an edit saved before it; an edit saved after it brings the object
  back. Graves are kept indefinitely.
- **Order** of decks and folders syncs as one value with its own time.
- **Pulling:** the server counts syncs in `rev` and stamps each object it
  stores with `usn` (the `rev` it was stored at). A sync sends the `rev` it
  last saw and gets back everything stored since, plus the server's version
  of anything of its own that lost. Apps sync after edits (at most every
  10 s), when the tab comes back into view, and every 5 minutes.
- **Atomic:** the server's merge reads `data.json`, merges, and writes it back
  only if it hasn't changed since (S3 conditional write), retrying otherwise.

The merge is `backend/src/functions/flashcards-api/merge.mjs`; the client side
(what changed, applying another device's changes) is `src/services/sync.js`.
An object edited locally while a sync is in flight keeps the local edit; the
next sync sends it. Reviews another device added show up in history and stats
after a reload (scheduling is up to date right away). Card order within a
deck isn't synced: a card that moves or comes back is added at the end.

## JSON Structure

`data.json`:

```json
{
	"version": "2",
	// v7 sync bookkeeping, server-side only (the app doesn't load these)
	"rev": 42, // incremented by each sync that changes something
	"graves": [
		{ "type": "card", "id": "unique-id", "at": 1234567890, "usn": 41 }
	],
	"orderAt": 1234567890, // when deck/folder order last changed
	"orderUsn": 40,
	// Every folder, deck, card and note also has (v7):
	//   "updatedAt": when a device saved its last change
	//   "usn": the rev at which the server stored it
	// Notes added in v5
	"notes": [
		{
			"noteId": "unique-id",
			"front": "Front text",
			"back": "Back text",
			"createdAt": 1234567890 // may be missing
		},
		{
			"noteId": "unique-id",
			"type": "cloze", // v6; missing = basic front/back note
			"text": "The {{c1::mitochondria}} is the {{c2::powerhouse::energy}} of the cell",
			"extra": "Optional, shown on the back",
			"createdAt": 1234567890
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
			"updatedAt": 1234567890 // v7: set by sync
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
			"updatedAt": 1234567890, // v7: set by sync
			"cards": [
				{
					"cardId": "unique-id",
					"noteId": "unique-id", // v5: the note holding this card's text
					"template": "reverse", // v5: "forward" (default, omitted) or "reverse"; v6: "cloze"
					"ord": 2, // v6, cloze cards only: the cloze number this card hides
					"whenDue": 1234567890,
					// v4 scheduling state, missing on new cards
					"interval": 1234567890, // ms, set by the last review, or halved by a catch-up since (v8)
					"reps": 3, // times reviewed
					"lapses": 1, // times graded Unfamiliar (`forgot`)
					"lastReviewed": 1234567890, // timestamp of the last review
					"isFlagged": false,
					"isStarred": false,
					"createdAt": 1234567890 // added later, may be missing
					// Before v8 a catch-up stored "reschedule": { at, interval,
					// previousWhenDue, previousReschedule? } here; loading turns it into
					// reschedule entries in the review log
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
		},
		{
			// v8: a catch-up (src/services/catchUp.js) rescheduled the card as if
			// graded Too Difficult, without a review. In memory these are on
			// `card.reschedules`, not `card.reviews`, so review stats skip them.
			"cardId": "unique-id",
			"reviewId": "reschedule-1234567890", // from the catch-up's time
			"type": "reschedule", // missing on reviews
			"timestamp": 1234567890, // when the catch-up ran
			"interval": 1234567890, // the halved interval, also stored on the card
			"lastInterval": 1234567890, // the card's interval before, for undo (null if it had none)
			"previousWhenDue": 1234567890 // for undo
		}
	]
}
```

A card's newest reschedule entry is active until its next review
(`getActiveReschedule()`). Undoing a catch-up puts back each active entry's
`previousWhenDue` and `lastInterval` and removes the entry, so the log keeps
only catch-ups that stand.

## v8 (reschedules in the review log)

- [x] Catch-ups write `type: "reschedule"` entries to the review log and set
      the card's `interval`, replacing the nested `card.reschedule` chain
- Note: existing `card.reschedule` chains are migrated on load (entries first,
  then data.json without the field)

## v7 (sync)

- [x] `POST /sync` merges changes object by object; replaces full saves and PATCH
- [x] `updatedAt`/`usn` on folders, decks, cards and notes; graves for deletions; `rev`
- Note: `POST`/`PATCH /data` remain for app versions from before v7; they don't
  set `usn`, so other devices don't pull their changes. Remove once no old tabs remain.

## v6 (cloze)

- [x] Cloze notes (`type: "cloze"`, `text`, `extra`) with one `cloze` card per number (`ord`)
- Note: no migration; existing notes are basic

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
