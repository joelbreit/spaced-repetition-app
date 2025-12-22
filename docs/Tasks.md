# Tasks

## Issues

- [ ] Wide card content on small devices
- [ ] Scroll to top of new pages/views

## Features

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
  - [x] Add duplication button
  - [x] Check for partner cards before duplicating
  - [ ] Track partner cards that are tied to each other
    - [ ] When deleting a card, ask if you want to delete the related card
    - [ ] When deleting a deck with cards that are tied to partner cards
      - [ ] Ask which cards to delete (all, some, none)
    - [ ] When editing a card, ask if you want to edit the partner card
    - [ ] Show partner cards in card view
- [ ] Track related cards
- [ ] **Cloze deletions**
- [ ] Email login should not be case sensitive
- [ ] User should be able to delete account or reset password
- [ ] Documentation of pages, components, algorithms, data structure
- [ ] Feature request form
- [ ] Ability to archive decks 
- [ ] Log how much things are probably costing
- [ ] Markdown support
- [ ] Track Lambda code in functions/ folder
- [ ] Reduce front page stats hero section size

### Account Management

- [ ] Change email
- [ ] Reset password
  - [ ] After logging in
  - [ ] From login page based on email

### Header

- [ ] Show current streak

### Footer

- [ ] Feature request form
- [ ] App version history

### Overview View

- [ ] **Reduce intro stats section size**
- [ ] Break progress bar into sections: due, new, learned

### Card Review View

- [ ] Display stats e.g. num correct while reviewing cards
- [ ] Results screen when you finish reviewing cards
- [ ] Create views for when you finish the due and new sections

### Card View

- [ ] Add card view
- [ ] View review history
- [ ] View all stats/info
- [ ] Show card edit history?

### Edit Card View

- [ ] Add flag/star to edit card view

### Deck View

- [ ] Add stats/info
- [ ] Card search functionality
- [ ] Filter cards by flag, star, etc
- [ ] Sort cards by due date, creation date, **review order**, num reviews, etc
- [ ] Color selection for folders and decks
- [ ] Icon selection for folders and decks

### Profile Page

- [ ] Columns / rows on larger screens
- [ ] ~~Progress chart doesn't seem to track all cards~~ Progress chart can't track historical "total cards" until creation dates are added
- [ ] Study progress should have stacked new, struggling, learning, and mastered cards

#### Heatmap

- [ ] Label best day ever/per year

## Infrastructure

- [ ] TypeScript?
- [ ] **Move lambda code to external files**
- [ ] Create an AWS tag for all resources associated with this app
- [ ] Some sort of database that's not a giant JSON file
- [ ] Separate pages for deck view, card view, review screen

## Complete

2025-12-22

- [x] Add PATCH method to API for incrementing card review updates

2025-12-03

- [x] Show today on activity heatmap
- [x] Created Segmented Progress Bar
- [x] Randomize order of new cards
- [x] Fix calculation of due, new, and learned cards
- [x] **Add a icon that will show up for web app**

2025-12-02

- [x] Import data
- [x] Condense Deck view buttons on small devices
- [x] Profile header dropdown depth
- [x] Star cards
- [x] Progress charts

2025-12-01

- [x] Add button to allow for duplicating cards in a deck with reverse direction
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