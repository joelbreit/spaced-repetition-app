# Tasks

## Features

- [ ] Dark/Light mode
- [ ] Card flip animation
- [ ] Replace `alert("Account confirmed! Please log in.");`
- [ ] Allow confirmation of prompts / form submissions with 'Enter'
  - [ ] Delete deck dialog
- [ ] **Deck folders**
- [ ] Show count of search results
- [ ] Allow for reviewing card subsets: flagged cards, new cards, etc
- [ ] Delete button doesn't show up in dark mode
- [ ] Add demo mode / tutorial
- [ ] When text from a search is found in deck titles and in card contents, prioritize decks that have that search text in the title
- [ ] Add button to allow for duplicating cards in a deck with reverse direction
- [ ] Add a icon that will show up for web app
- [ ] Email login should not be case sensitive
- [ ] User should be able to delete account or reset password
- [ ] Documentation of pages, components, algorithms, data structure
- [ ] Feature request form
- [ ] Archive decks 
- [ ] Log how much things are probably costing
- [ ] Markdown support
- [ ] Display stats e.g. num correct while reviewing cards
- [ ] More stats on deck view
- [ ] Results screen when you finish reviewing cards

### Header

- [ ] Show current streak

### Heatmap

- [ ] Label best day ever/per year

## Infrastructure

- [ ] TypeScript?
- [ ] **AWS documentation**
- [ ] **Move lambda code to external files**

## Complete

2025-12-01

- [x] GitHub style progress / day grid
- [x] Add Profile page
- [x] Pagination and component separation

2025-11-14

- [x] Add footer
- [x] Card flagging

2025-11-12

- [x] Ability to reorder decks
- [x] Fix header size on small devices
- [x] Add an export cards button
- [x] Reduce card size so everything shows up on small devices
- [x] Display card statistics on review view
- [x] Update sync timeout from 2 to 10 seconds
- [x] Update scheduling algorithm
- [x] Update card review priority order
  1) Due cards in order of most recently due first to most overdue last
  2) New cards (random order)
  3) Not yet due cards in order of due soon first to due in a long time last
- [x] Your Study Statistics section

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