# Tasks

## Features

- [ ] Dark/Light mode
- [ ] Card flip animation
- [ ] Replace `alert("Account confirmed! Please log in.");`
- [ ] Allow confirmation of prompts / form submissions with 'Enter'
  - [ ] Delete deck dialog
- [ ] **Deck folders**
  - Decks view:
    - [ ] Add folder function
    - [ ] Show folders
    - [ ] Hide decks that are in a folder
  - Deck view:
    - [ ] Add to folder
      - [ ] Add to existing folder
      - [ ] Create new folder
    - [ ] Remove from folder
  - Folder view (new):
    - [ ] Add deck
    - [ ] Remove deck
    - [ ] Rename folder
    - [ ] Delete folder
    - [ ] When a deck is selected, go to its deck view
- [ ] Show count of search results
- [ ] Allow for reviewing card subsets: flagged cards, new cards, etc
- [ ] Delete button doesn't show up in dark mode
- [ ] Add demo mode / tutorial
- [ ] When text from a search is found in deck titles and in card contents, prioritize decks that have that search text in the title
- [ ] **Add button to allow for duplicating cards in a deck with reverse direction**
  - [ ] Track partner cards that are tied to each other
    - [ ] When deleting a card, ask if you want to delete the related card
    - When deleting a deck with cards that are tied to partner cards
      - [ ] Ask which cards to delete (all, some, none)
    - [ ] When editing a card, ask if you want to edit the partner card
- [ ] Track related cards 
- [ ] **Readd import button**
- [ ] **Cloze deletions**
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
- [ ] Color selection for folders and decks
- [ ] Icon selection for folders and decks
- [ ] Track Lambda code in functions/ folder
- [ ] Reduce front page stats hero section size

### Account Management

- [ ] Change email
- [ ] Reset password
  - [ ] After logging in
  - [ ] From login page based on email

### Header

- [ ] Show current streak

### Heatmap

- [ ] Label best day ever/per year

### Profile Page

- [ ] Progress charts

## Infrastructure

- [ ] TypeScript?
- [ ] **Move lambda code to external files**
- [ ] Create an AWS tag for all resources associated with this app
- [ ] Some sort of database that's not a giant JSON file

## Complete

2025-12-01

- [x] AWS documentation
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