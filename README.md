# Spaced Repetition Flashcards App

A modern flashcards application built with React, Tailwind CSS, and spaced repetition algorithms. Create and manage your flashcard decks, review them with an intelligent scheduling system, and track your learning progress.

## Tech Stack

- **React** - UI framework
- **Tailwind CSS v4** - Styling
- **Lucide React** - Icons
- **Vite** - Build tool

## Getting Started

1. Install dependencies

```bash
npm install
```

2. Run the development server

```bash
npm run dev
```

Visit `http://localhost:5173` in your browser.

## Building for Production

```bash
npm run build
npm run preview
```

## Data Structure

The app uses a JSON structure for storing deck and card data:

```json
{
  "decks": [
    {
      "deckId": "unique-id",
      "deckName": "Deck Name",
      "cards": [
        {
          "cardId": "unique-id",
          "front": "Question or front of card",
          "back": "Answer or back of card",
          "reviews": [
            {
              "reviewId": "unique-id",
              "timestamp": 1234567890,
              "result": "again" | "hard" | "good" | "easy"
            }
          ],
          "whenDue": 1234567890
        }
      ]
    }
  ]
}
```

## How Spaced Repetition Works

The app uses a time-based spaced repetition algorithm that adapts to each card's review history:

- **Again**: Card is scheduled for 1 day from now
- **Hard**: Card is scheduled for now + 0.5× time since last review
- **Good**: Card is scheduled for now + 1× time since last review
- **Easy**: Card is scheduled for now + 2× time since last review

The system tracks all your reviews and schedules cards based on your performance to optimize long-term retention.