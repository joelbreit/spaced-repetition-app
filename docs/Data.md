# Data

## JSON Structure

```json
{
	"version": "2",
	// Folders added in v2
	"folders": [
		{
			"folderId": "unique-id",
			"folderName": "Folder Name",
			"folderDescription": "Optional description",
			"folderColor": "#3b82f6",
			"folderSymbol": "📁",
			"parentFolderId": null, // null or missing = root level, otherwise references another folderId
			"createdAt": 1234567890,
			"updatedAt": 1234567890
		},
	],
	"decks": [
	{
		"deckId": "unique-id",
		"deckName": "Deck Name",
		"deckSymbol": "📚", // optional, defaults to "📚"
		"parentFolderId": null, // v2, null or missing = root level, otherwise references another folderId
		"createdAt": 1234567890, // added later, may be missing
		"updatedAt": 1234567890, // v2
		"cards": [
		{
			"cardId": "unique-id",
			"front": "Front text",
			"back": "Back text",
			"reviews": [
			{
			"reviewId": "unique-id",
			"timestamp": 1234567890,
			"interval": 1234567890, // added later, may be missing
			"result": "again" | "hard" | "good" | "easy"
			}
			],
			"whenDue": 1234567890,
			"partnerCardId": "unique-id",
			"isFlagged": false,
			"isStarred": false,
			"createdAt": 1234567890, // added later, may be missing
		}
		],
	}
	]
}
```

### To Do

- [x] v2: Folders
  - [x] Add the folders array to the data
  - [x] folders/decks with no parent folder should be in the root level folder
  - Note: There will be no representation of the root level folder in the data, but it will be implied. The root level folder doesn't have a color, symbol, or description; it is simply the implied parent of all folders and decks.