import {
	createContext,
	useContext,
	useState,
	useEffect,
	useRef,
	useCallback,
} from 'react';
import { useAuth } from './AuthContext';
import { useNotification } from '../hooks/useNotification';
import {
	loadFromAPI,
	saveToAPI,
	patchToAPI,
	checkAPIHealth,
} from '../services/apiStorage';

const AppDataContext = createContext();

// Demo data for guest users - tutorial cards explaining how to use the app
const demoData = {
	folders: [],
	decks: [
		{
			deckId: 'demo-getting-started',
			deckName: 'Getting Started',
			deckSymbol: '📚',
			cards: [
				{
					cardId: 'demo-1',
					front: 'What is spaced repetition?',
					back: 'Spaced repetition is a learning technique that reviews cards at increasing intervals. Cards you struggle with appear more often, while cards you know well appear less frequently. This helps you learn more efficiently!',
					reviews: [],
					whenDue: Date.now(),
				},
				{
					cardId: 'demo-2',
					front: 'Why are there 4 result buttons?',
					back: 'The 4 levels allow for distinguishing between common, but important levels or remembering. The difference allows cards to be scheduled at the appropriate intervals.',
					reviews: [],
					whenDue: Date.now(),
				},
				{
					cardId: 'demo-3',
					front: "What does 'Again' mean?",
					back: "Again means you didn't know the answer. It resets the review to the minimum interval e.g. 10 minutes.",
					reviews: [],
					whenDue: Date.now(),
				},
				{
					cardId: 'demo-4',
					front: "What does 'Hard' mean?",
					back: "Rating a card as 'Hard' means it is more difficult to remember than you would like. This rating reduces the review interval so that you'll be prompted to review it sooner next time.",
					reviews: [],
					whenDue: Date.now(),
				},
				{
					cardId: 'demo-5',
					front: "What does 'Good' mean?",
					back: "Rating a card as 'Good' means it is about as difficult to remember as you would like. This rating keeps the review interval the same as the last time you reviewed it.",
					reviews: [],
					whenDue: Date.now(),
				},
				{
					cardId: 'demo-6',
					front: "What does 'Easy' mean?",
					back: "Rating a card as 'Easy' means it is easy to remember and did not need to be due yet. This rating increases the review interval so that you'll be prompted to review it later next time.",
					reviews: [],
					whenDue: Date.now(),
				},
			],
		},
	],
};

export function AppDataProvider({ children }) {
	const { authToken, isAuthenticated, refreshToken } = useAuth();
	const { showError } = useNotification();

	const [appData, setAppData] = useState(demoData);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [isOnline, setIsOnline] = useState(true);
	const [hasGuestEdits, setHasGuestEdits] = useState(false);

	const saveTimeoutRef = useRef(null);
	const lastSaveTime = useRef(null);
	const appDataRef = useRef(appData);
	const lastSavedStateRef = useRef(null);
	const healthCheckInProgress = useRef(false);

	// Wrapped setter that tracks guest edits
	const setAppDataTracked = useCallback(
		(updater) => {
			if (!isAuthenticated) {
				setHasGuestEdits(true);
			}
			setAppData(updater);
		},
		[isAuthenticated]
	);

	// Check API health on mount (only for authenticated users)
	useEffect(() => {
		if (!isAuthenticated) {
			setIsOnline(false); // Guests are always "offline" (local only)
			return;
		}

		async function checkHealth() {
			if (healthCheckInProgress.current) {
				return;
			}

			healthCheckInProgress.current = true;
			try {
				const healthy = await checkAPIHealth();
				setIsOnline(healthy);
			} finally {
				healthCheckInProgress.current = false;
			}
		}
		checkHealth();
	}, [isAuthenticated]);

	// Load data - from API if authenticated, in-memory demo data if guest
	useEffect(() => {
		async function loadData() {
			setIsLoading(true);

			// Guest mode: always start from demo data (in-memory only, no persistence)
			if (!isAuthenticated || !authToken) {
				setAppData(demoData);
				lastSavedStateRef.current = JSON.parse(
					JSON.stringify(demoData)
				);
				setIsOnline(false);
				setIsLoading(false);
				return;
			}

			// Authenticated mode: load from API
			try {
				const cloudData = await loadFromAPI(authToken, refreshToken);

				let finalData;
				if (
					!cloudData ||
					!cloudData.decks ||
					cloudData.decks.length === 0
				) {
					finalData = { folders: [], decks: [] };
				} else {
					finalData = cloudData;
				}

				setAppData(finalData);
				lastSavedStateRef.current = JSON.parse(
					JSON.stringify(finalData)
				);
				setIsOnline(true);
			} catch (error) {
				console.error('Failed to load from API:', error);
				showError('Failed to load data from cloud.');
				setIsOnline(false);
				const emptyData = { folders: [], decks: [] };
				setAppData(emptyData);
				lastSavedStateRef.current = JSON.parse(
					JSON.stringify(emptyData)
				);
			} finally {
				setIsLoading(false);
			}
		}
		loadData();
	}, [isAuthenticated, authToken, refreshToken, showError]);

	// Keep appDataRef in sync with appData
	useEffect(() => {
		appDataRef.current = appData;
	}, [appData]);

	// Helper function to compute patch data from changes
	const computePatchData = (currentData, lastSavedState) => {
		if (!lastSavedState || !lastSavedState.decks) {
			return null; // No previous state, need full save
		}

		const currentDecks = currentData.decks || [];
		const savedDecks = lastSavedState.decks || [];

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

			// Check if deck name changed
			if (savedDeck.deckName !== currentDeck.deckName) {
				changedDecks.push(currentDeck);
				changedCardsByDeck[currentDeck.deckId] = 'deck-name-changed';
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
		return null;
	};

	// Auto-save data - to cloud if authenticated, no-op if guest
	useEffect(() => {
		if (isLoading) return;

		if (saveTimeoutRef.current) {
			return;
		}

		const performSave = async () => {
			setIsSaving(true);
			const dataToSave = appDataRef.current;

			// Guest mode: data lives in React state only — nothing to persist
			if (!isAuthenticated || !authToken) {
				lastSavedStateRef.current = JSON.parse(
					JSON.stringify(dataToSave)
				);
				lastSaveTime.current = Date.now();
				setIsSaving(false);
				saveTimeoutRef.current = null;
				return;
			}

			// Authenticated mode: save to cloud
			const currentAuthToken = authToken;
			try {
				// Try to compute patch data
				const patchData = computePatchData(
					dataToSave,
					lastSavedStateRef.current
				);

				if (patchData) {
					// Use PATCH for incremental update
					await patchToAPI(patchData, currentAuthToken, refreshToken);
				} else {
					// Fall back to POST for full save
					await saveToAPI(dataToSave, currentAuthToken, refreshToken);
				}

				// Update last saved state
				lastSavedStateRef.current = JSON.parse(
					JSON.stringify(dataToSave)
				);
				setIsOnline(true);
				lastSaveTime.current = Date.now();
			} catch (error) {
				console.error('Failed to save to API:', error);
				showError('Failed to save to cloud.');
				setIsOnline(false);
				lastSaveTime.current = Date.now();
			} finally {
				setIsSaving(false);
				saveTimeoutRef.current = null;
			}
		};

		const now = Date.now();
		const timeSinceLastSave = lastSaveTime.current
			? now - lastSaveTime.current
			: Infinity;
		const MIN_SAVE_INTERVAL = 10000; // 10 seconds

		const delay = Math.max(0, MIN_SAVE_INTERVAL - timeSinceLastSave);
		saveTimeoutRef.current = setTimeout(performSave, delay);

		return () => {
			if (saveTimeoutRef.current) {
				clearTimeout(saveTimeoutRef.current);
				saveTimeoutRef.current = null;
			}
		};
	}, [
		appData,
		isLoading,
		isAuthenticated,
		authToken,
		refreshToken,
		showError,
	]);

	const value = {
		appData,
		setAppData: setAppDataTracked,
		isLoading,
		isSaving,
		isOnline,
		hasGuestEdits,
	};

	// if there are decks, but no folders in appData, log an issue
	useEffect(() => {
		// Example data has 2 decks and no folders, so we'll use that as the threshold
		if (
			appData.decks.length > 2 &&
			(!appData.folders || appData.folders.length === 0)
		) {
			console.error('No folders in appData, but there are decks');
		}
	}, [appData]);

	return (
		<AppDataContext.Provider value={value}>
			{children}
		</AppDataContext.Provider>
	);
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAppData() {
	const context = useContext(AppDataContext);
	if (context === undefined) {
		throw new Error('useAppData must be used within an AppDataProvider');
	}
	return context;
}
