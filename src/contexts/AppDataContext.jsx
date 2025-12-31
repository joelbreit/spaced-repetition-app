import { createContext, useContext, useState, useEffect, useRef } from "react";
import { useAuth } from "./AuthContext";
import { useNotification } from "../hooks/useNotification";
import {
	loadFromAPI,
	saveToAPI,
	patchToAPI,
	checkAPIHealth,
} from "../services/apiStorage";

const AppDataContext = createContext();

// Initial sample data (used only if API has no data)
const initialData = {
	folders: [],
	decks: [
		{
			deckId: "1",
			deckName: "Spanish Vocabulary",
			cards: [
				{
					cardId: "1",
					front: "Hello",
					back: "Hola",
					reviews: [],
					whenDue: Date.now(),
				},
				{
					cardId: "2",
					front: "Goodbye",
					back: "Adiós",
					reviews: [],
					whenDue: Date.now(),
				},
			],
		},
		{
			deckId: "2",
			deckName: "Math Facts",
			cards: [
				{
					cardId: "3",
					front: "2 + 2",
					back: "4",
					reviews: [],
					whenDue: Date.now(),
				},
			],
		},
	],
};

export function AppDataProvider({ children }) {
	const { authToken, isAuthenticated } = useAuth();
	const { showSuccess, showError, showWarning } = useNotification();

	const [appData, setAppData] = useState(initialData);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [isOnline, setIsOnline] = useState(true);

	const saveTimeoutRef = useRef(null);
	const lastSaveTime = useRef(null);
	const appDataRef = useRef(appData);
	const lastSavedStateRef = useRef(null);
	const healthCheckInProgress = useRef(false);

	// Check API health on mount
	useEffect(() => {
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
	}, []);

	// Load from API on mount
	useEffect(() => {
		async function loadData() {
			if (!isAuthenticated || !authToken) return;

			setIsLoading(true);
			try {
				const cloudData = await loadFromAPI(authToken);

				let finalData;
				if (
					!cloudData ||
					!cloudData.decks ||
					cloudData.decks.length === 0
				) {
					const localData = localStorage.getItem("spacedRepData");
					if (localData) {
						const parsed = JSON.parse(localData);
						setAppData(parsed);
						await saveToAPI(parsed, authToken);
						lastSaveTime.current = Date.now();
						showSuccess("Local data synced to cloud");
						finalData = parsed;
					} else {
						setAppData(initialData);
						finalData = initialData;
					}
				} else {
					setAppData(cloudData);
					localStorage.setItem(
						"spacedRepData",
						JSON.stringify(cloudData)
					);
					finalData = cloudData;
				}

				// Initialize last saved state after loading
				lastSavedStateRef.current = JSON.parse(
					JSON.stringify(finalData)
				);
				setIsOnline(true);
			} catch (error) {
				console.error("Failed to load from API:", error);
				showError(
					"Failed to load data from cloud. Using local backup."
				);
				setIsOnline(false);

				const localData = localStorage.getItem("spacedRepData");
				let fallbackData;
				if (localData) {
					fallbackData = JSON.parse(localData);
					setAppData(fallbackData);
				} else {
					fallbackData = initialData;
					setAppData(initialData);
				}
				// Initialize last saved state with fallback data
				lastSavedStateRef.current = JSON.parse(
					JSON.stringify(fallbackData)
				);
			} finally {
				setIsLoading(false);
			}
		}
		loadData();
	}, [isAuthenticated, authToken, showError, showSuccess]);

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
				changedCardsByDeck[currentDeck.deckId] = "new-deck";
				continue;
			}

			// Check if deck name changed
			if (savedDeck.deckName !== currentDeck.deckName) {
				changedDecks.push(currentDeck);
				changedCardsByDeck[currentDeck.deckId] = "deck-name-changed";
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
					changedCardsByDeck[currentDeck.deckId] = "cards-deleted";
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
					type: "card",
					deckId: changedDeck.deckId,
					card: changeType[0],
				};
			}

			// Otherwise, use deck-level patch
			return {
				type: "deck",
				deck: changedDeck,
			};
		}

		// No changes detected
		return null;
	};

	// Auto-save data to cloud with minimum 10-second interval
	useEffect(() => {
		if (isLoading || !isAuthenticated || !authToken) return;

		const currentAuthToken = authToken;

		if (saveTimeoutRef.current) {
			return;
		}

		const performSave = async () => {
			setIsSaving(true);
			const dataToSave = appDataRef.current;
			const tokenToUse = currentAuthToken;
			try {
				// Try to compute patch data
				const patchData = computePatchData(
					dataToSave,
					lastSavedStateRef.current
				);

				if (patchData) {
					// Use PATCH for incremental update
					await patchToAPI(patchData, tokenToUse);
				} else {
					// Fall back to POST for full save
					await saveToAPI(dataToSave, tokenToUse);
				}

				// Update local storage
				localStorage.setItem(
					"spacedRepData",
					JSON.stringify(dataToSave)
				);

				// Update last saved state
				lastSavedStateRef.current = JSON.parse(
					JSON.stringify(dataToSave)
				);
				setIsOnline(true);
				lastSaveTime.current = Date.now();
			} catch (error) {
				console.error("Failed to save to API:", error);
				showError("Failed to save to cloud. Data saved locally.");
				setIsOnline(false);
				localStorage.setItem(
					"spacedRepData",
					JSON.stringify(dataToSave)
				);
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
	}, [appData, isLoading, isAuthenticated, authToken, showError]);

	const value = {
		appData,
		setAppData,
		isLoading,
		isSaving,
		isOnline,
	};

	return (
		<AppDataContext.Provider value={value}>
			{children}
		</AppDataContext.Provider>
	);
}

export function useAppData() {
	const context = useContext(AppDataContext);
	if (context === undefined) {
		throw new Error("useAppData must be used within an AppDataProvider");
	}
	return context;
}
