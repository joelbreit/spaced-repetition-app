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

The app uses a JSON structure (see [Data.md](docs/Data.md)) for storing deck and card data.

## How Spaced Repetition Works

All cards are scheduled to be reviewed at intervals that adapt to the card's review history. Each time cards are reviewed, they are marked with a result that decides when the card comes back: forgot, sooner, right, or later.

- **Forgot**: Starts the card over at the minimum interval
- **Sooner**: Schedules the card for review in half the previous interval
- **Right**: Schedules the card again at the previous interval
- **Later**: Schedules the card again in twice the previous interval

The system tracks all your reviews and schedules cards based on your performance to optimize long-term retention.
