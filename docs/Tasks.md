# Tasks

## Issues

- [ ] Scroll to top of new pages/views
- [ ] Disconnecting:
  - Error: "Failed to save to cloud. Data saved locally"
  - Offline
  - 401
  - Error: "Unauthorized - please log in again"
- [ ] I should be able to edit cards from the review screen
- [ ] Should show an error if a folder or deck is orphaned (parentFolderId is not null and can't be found)
- [ ] You can very breifly see the back of the next card when it flips into place

v2 (folders) issues:
- [ ] Root level "Study All" button doesn't work
- [ ] Sortable folder components should have Due/New/Learned counts, mastery/burden stats, and a Study button
- [ ] Review summary doesn't show due/new/learned count changes when reviewing a folder
- [ ] All folders (not just root level) should have Due/New/Studied/Burden stats at top

## Features

- [ ] Configurable minimum interval +1
- [ ] Math/paper aesthetic?
- [ ] No more emojis in text
- [ ] Replace `alert("Account confirmed! Please log in.");`
- [ ] Allow confirmation of prompts / form submissions with 'Enter'
  - [ ] Delete deck dialog
- [ ] Show count of search results
- [ ] Allow for reviewing card subsets: flagged cards, new cards, etc
- [ ] Add demo mode / tutorial
- [ ] When text from a search is found in deck titles and in card contents, prioritize decks that have that search text in the title
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
- [ ] Reduce front page stats hero section size

### Account Management

- [ ] Change email
- [ ] Reset password
  - [ ] After logging in
  - [ ] From login page based on email

### Header

- [ ] Highlight/don't highlight streak if today is included in the streak
- [ ] Reconnect by clicking "Offline"

### Footer

- [ ] Feature request form
- [ ] App version history

### Overview View


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
- [ ] Disable "Duplicate" when all cards in the deck already have a partner card
- [ ] Show whether cards already have a partner card - link to it if so
- [ ] Show how many cards in deck have a partner card

### Profile Page

- [ ] Columns / rows on larger screens
- [ ] ~~Progress chart doesn't seem to track all cards~~ Progress chart can't track historical "total cards" until creation dates are added
- [ ] Study progress should have stacked new, struggling, learning, and mastered cards

#### Heatmap

- [ ] Label best day ever/per year

## Infrastructure

- [ ] Create an AWS tag for all resources associated with this app
- [ ] Some sort of database that's not a giant JSON file
- [ ] Separate pages for deck view, card view, review screen

## Complete

2026-12-31

TODO:
- [ ] Add forgot password functionality and login page button
- [ ] Add change email functionality and profile page button
- [ ] Add change password functionality and profile page button

Done:
- [x] Standardized interval display formatting
- [x] Fixed folders disappearing after review summary
- [x] Highlight/don't highlight streak if today is included in the streak

2025-12-30
- [x] Add Study All functionality for folders
- [x] Add Move to Folder functionality to DeckCardsView
- [x] Folder functionality! New FolderBrowserView, SortableContainerItem, and several other components
- [x] Skip summary if no cards were reviewed
- [x] Keep steak, reviews count, and sync status in header on small devices
- [x] Reposition buttons on deck cards

2025-12-29

- [x] Continue showing result buttons after initial flip 
- [x] Symbol selection for decks
- [x] Show overview after "End Review" button is clicked
- [x] Fix edit, delete, etc buttons not showing up issue
- [x] Show burden/day in card review view

2025-12-27

- [x] Cap burden/day at 1 per day
- [x] Show burden/day in deck view
- [x] Add filter/sort to deck view

2025-12-26

- [x] Color coded % mastery
- [x] Added reviews/day rate
- [x] Update timing logic

2025-12-22

- [x] Add PATCH method to API for incrementing card review updates
- [x] Show current streak in header
- [x] Show reviews today in header
- [x] Add learning strength to card review view

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