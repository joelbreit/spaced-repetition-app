# Data

## JSON Structure

```json
{
  "decks": [
    {
      "deckId": "unique-id",
      "deckName": "Deck Name",
      "cards": [
        {
          "cardId": "unique-id",
          "front": "Front text",
          "back": "Back text",
          "reviews": [
			{
				"reviewId": "unique-id",
				"timestamp": 1234567890,
				"result": "again" | "hard" | "good" | "easy"
			}
		  ],
		  "whenDue": 1234567890,
		  "partnerCardId": "unique-id",
		  "isFlagged": false,
		  "isStarred": false
		}
	  ]
	}
  ]
}
```

### To Do

- [ ] Folders
  - [ ] Add "folderId" to decks
  - [ ] Add "folders" object to data
    - [ ] Add "folderName" to folders
    - [ ] Add "folderDescription" to folders
    - [ ] Add "folderColor" to folders
    - [ ] Add "folderIcon" to folders
    - [ ] Add "folderCreatedAt" to folders
    - [ ] Add "folderUpdatedAt" to folders
- [ ] Related cards (TBD)
  - Embed in card front/back text? Like in a markdown sort of format
- [ ] Add creation date
  - [ ] For old cards 
    - [ ] ...with no reviews, make creation date 24 hours before the due date
    - [ ] ...with reviews, make creation date the first review timestamp
  - [ ] All new cards should have creation dates set