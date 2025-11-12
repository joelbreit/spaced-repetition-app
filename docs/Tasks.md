# Tasks

## Prototype

- [ ] Dark/Light mode
- [ ] Card flip animation
- [ ] TypeScript?
- [ ] Replace `alert("Account confirmed! Please log in.");`
- [ ] Allow confirmation of prompts / form submissions with 'Enter'
  - [ ] Delete deck dialog
- [ ] Deck folders
- [ ] Show count of search results
- [ ] Reduce card size so everything shows up on small devices
- [ ] Allow for deck folders
- [ ] Allow for prioritizing cards
  1) Due cards
  2) New cards
- [ ] Update scheduling to 
  - If easy, set next review to 2x time since last review
  - If good, set next review to time since last review
  - If hard, set next review to time since last review / 2
  - If again, set next review to now
- [ ] Display, num review, percent, time since last review on cards
- [ ] Allow for reviewing cards flagged to be fixed
- [ ] Move lambda code to external files
- [ ] Delete button doesn't show up in dark mode
- [ ] Add demo mode / tutorial
- [ ] When text from a search is found in deck titles and in card contents, prioritize decks that have that search text in the title
- [ ] Add button to allow for duplicating cards in a deck with reverse direction

## Optional additional libraries

```bash

# Data visualization libraries
npm i plotly.js
npm i chart.js

# Mermaid diagramming
npm i mermaid
```

## Complete

2025-11-12

- [x] Ability to reorder decks
- [x] Fix header size on small devices
- [x] Add an export cards button

2025-10-30

- [x] Review cards in randomized order

2025-10-28

- [x] Database
- [x] User login

2025-10-26

- [x] Allow search to search card front and back, not just deck names
- [x] App name/title
- [x] App Icon
- [x] Create a component to replace `alert()` usage
- [x] When loading decks from JSON via "Upload", replace existing decks that have the same deckId as decks in the uploaded JSON with the new deck
- [x] Update color theme
- [x] Creat simple prototype using JSON upload/download