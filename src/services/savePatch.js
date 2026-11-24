// What an auto-save has to send, worked out by comparing the stored form
// of the app data (see toStored in AppDataContext) with the last save.
import { diffNotes } from './notes';

// Helper function to compute patch data from changes. Returns null for a
// full save, false for no changes, or a patch: a card or deck change
// and/or note changes ({ notes: { upsert, remove } }).
export const computePatchData = (currentData, lastSavedState) => {
	if (!lastSavedState || !lastSavedState.decks) {
		return null; // No previous state, need full save
	}

	const deckPatch = computeDeckPatch(currentData, lastSavedState);
	if (deckPatch === null) return null;
	// Editing a card's text changes only its note
	const notesPatch = diffNotes(currentData.notes, lastSavedState.notes);
	if (!notesPatch) return deckPatch;
	return { ...(deckPatch || {}), notes: notesPatch };
};

const computeDeckPatch = (currentData, lastSavedState) => {
	// Everything outside the decks and notes arrays (folders, etc.) is
	// small, so any change there - including folder icons and colors -
	// gets a full save
	const {
		decks: currentDecks = [],
		notes: _currentNotes,
		...currentRest
	} = currentData;
	const {
		decks: savedDecks = [],
		notes: _savedNotes,
		...savedRest
	} = lastSavedState;
	if (JSON.stringify(currentRest) !== JSON.stringify(savedRest)) {
		return null;
	}

	// Track which decks have changes
	const changedDecks = [];
	const changedCardsByDeck = {};

	// Check each deck
	for (const currentDeck of currentDecks) {
		const savedDeck = savedDecks.find(
			(d) => d.deckId === currentDeck.deckId
		);

		if (!savedDeck) {
			// New deck - this requires a deck-level patch
			changedDecks.push(currentDeck);
			changedCardsByDeck[currentDeck.deckId] = 'new-deck';
			continue;
		}

		// Check deck-level fields (name, icon, color, folder, archived...)
		const { cards: _currentCards, ...currentMeta } = currentDeck;
		const { cards: _savedCards, ...savedMeta } = savedDeck;
		if (JSON.stringify(currentMeta) !== JSON.stringify(savedMeta)) {
			changedDecks.push(currentDeck);
			changedCardsByDeck[currentDeck.deckId] = 'deck-meta-changed';
			continue;
		}

		// Check for card changes
		const currentCards = currentDeck.cards || [];
		const savedCards = savedDeck.cards || [];
		const changedCards = [];

		// Check each card in current deck
		for (const currentCard of currentCards) {
			const savedCard = savedCards.find(
				(c) => c.cardId === currentCard.cardId
			);

			if (!savedCard) {
				// New card
				changedCards.push(currentCard);
			} else {
				// Check if card changed (compare JSON strings for deep equality)
				const currentCardStr = JSON.stringify(currentCard);
				const savedCardStr = JSON.stringify(savedCard);
				if (currentCardStr !== savedCardStr) {
					changedCards.push(currentCard);
				}
			}
		}

		// Check for deleted cards
		for (const savedCard of savedCards) {
			const currentCard = currentCards.find(
				(c) => c.cardId === savedCard.cardId
			);
			if (!currentCard) {
				// Card was deleted - need to update the deck
				changedDecks.push(currentDeck);
				changedCardsByDeck[currentDeck.deckId] = 'cards-deleted';
				break;
			}
		}

		if (changedCards.length > 0) {
			changedDecks.push(currentDeck);
			changedCardsByDeck[currentDeck.deckId] = changedCards;
		}
	}

	// Check for deleted decks
	for (const savedDeck of savedDecks) {
		const currentDeck = currentDecks.find(
			(d) => d.deckId === savedDeck.deckId
		);
		if (!currentDeck) {
			// Deck was deleted - need full save (can't patch delete)
			return null;
		}
	}

	// Check for deck reordering (same decks but different order)
	if (currentDecks.length === savedDecks.length) {
		const orderChanged = currentDecks.some((deck, index) => {
			return savedDecks[index]?.deckId !== deck.deckId;
		});
		if (orderChanged && changedDecks.length === 0) {
			// Only order changed, no content changes - need full save
			return null;
		}
	}

	// If multiple decks changed, fall back to full save
	if (changedDecks.length > 1) {
		return null;
	}

	// If one deck changed
	if (changedDecks.length === 1) {
		const changedDeck = changedDecks[0];
		const changeType = changedCardsByDeck[changedDeck.deckId];

		// If only one card changed, use card-level patch
		if (Array.isArray(changeType) && changeType.length === 1) {
			return {
				type: 'card',
				deckId: changedDeck.deckId,
				card: changeType[0],
			};
		}

		// Otherwise, use deck-level patch
		return {
			type: 'deck',
			deck: changedDeck,
		};
	}

	// No changes detected
	return false;
};
