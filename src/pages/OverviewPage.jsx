import "../config/amplify";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import AuthView from "../components/AuthView";
import { useState, useEffect, useRef } from "react";
import DeckView from "../components/DeckView";
import CardEditView from "../components/CardEditView";
import CardReviewView from "../components/CardReviewView";
import Header from "../components/Header";
import { NotificationProvider } from "../contexts/NotificationContext.jsx";
import { ThemeProvider } from "../contexts/ThemeContext";
import { useNotification } from "../hooks/useNotification";
import NotificationContainer from "../components/NotificationContainer";
import { loadFromAPI, saveToAPI, checkAPIHealth } from "../services/apiStorage";
import Footer from "../components/Footer.jsx";

// Initial sample data (used only if API has no data)
const initialData = {
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
function AppContent() {
	const {
		user,
		authToken,
		isAuthenticated,
		isLoading: authLoading,
		logout,
	} = useAuth();

	const [appData, setAppData] = useState(initialData);
	const [currentView, setCurrentView] = useState("deck");
	const [selectedDeckId, setSelectedDeckId] = useState(null);
	const [selectedCardId, setSelectedCardId] = useState(null);
	const [currentDeckForReview, setCurrentDeckForReview] = useState(null);
	const [currentCardIndex, setCurrentCardIndex] = useState(0);
	const [isFlipped, setIsFlipped] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [isOnline, setIsOnline] = useState(true);
	const { showSuccess, showError, showWarning } = useNotification();
	const saveTimeoutRef = useRef(null);
	const lastSaveTime = useRef(null);
	const appDataRef = useRef(appData);
	const healthCheckInProgress = useRef(false);

	// Check API health on mount
	useEffect(() => {
		async function checkHealth() {
			// Prevent concurrent health checks
			if (healthCheckInProgress.current) {
				return;
			}

			healthCheckInProgress.current = true;
			try {
				const healthy = await checkAPIHealth();
				setIsOnline(healthy);
				// if (!healthy) {
				// 	showWarning(
				// 		"API is not accessible. Using local data only."
				// 	);
				// }
			} finally {
				healthCheckInProgress.current = false;
			}
		}
		checkHealth();
	}, [showWarning]);

	// Load from API on mount
	// Update loadFromAPI calls to include authToken
	useEffect(() => {
		async function loadData() {
			if (!isAuthenticated || !authToken) return;

			setIsLoading(true);
			try {
				const cloudData = await loadFromAPI(authToken);

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
					} else {
						setAppData(initialData);
					}
				} else {
					setAppData(cloudData);
					localStorage.setItem(
						"spacedRepData",
						JSON.stringify(cloudData)
					);
				}

				// Removed lastSyncTime update
				setIsOnline(true);
			} catch (error) {
				console.error("Failed to load from API:", error);
				showError(
					"Failed to load data from cloud. Using local backup."
				);
				setIsOnline(false);

				const localData = localStorage.getItem("spacedRepData");
				if (localData) {
					setAppData(JSON.parse(localData));
				} else {
					setAppData(initialData);
				}
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

	// Auto-save data to cloud with minimum 10-second interval
	useEffect(() => {
		if (isLoading || !isAuthenticated || !authToken) return;

		// Store current authToken in a ref for the save function
		const currentAuthToken = authToken;

		// If there's already a pending save, don't reschedule
		// The pending save will use the latest data from appDataRef
		// Exception: if authToken changed, we need to reschedule to use the new token
		if (saveTimeoutRef.current) {
			return;
		}

		const performSave = async () => {
			// Always use the latest data from the ref
			setIsSaving(true);
			const dataToSave = appDataRef.current;
			// Use the authToken from when the save was scheduled
			const tokenToUse = currentAuthToken;
			try {
				await saveToAPI(dataToSave, tokenToUse);
				localStorage.setItem(
					"spacedRepData",
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
				// Still update lastSaveTime even if API save failed, since we saved locally
				lastSaveTime.current = Date.now();
			} finally {
				setIsSaving(false);
				saveTimeoutRef.current = null;
			}
		};

		// Calculate time since last save
		const now = Date.now();
		const timeSinceLastSave = lastSaveTime.current
			? now - lastSaveTime.current
			: Infinity;
		const MIN_SAVE_INTERVAL = 10000; // 10 seconds

		// Calculate delay: if less than 10 seconds since last save, wait for remaining time
		// Otherwise, schedule immediately (0 delay)
		const delay = Math.max(0, MIN_SAVE_INTERVAL - timeSinceLastSave);
		saveTimeoutRef.current = setTimeout(performSave, delay);

		return () => {
			if (saveTimeoutRef.current) {
				clearTimeout(saveTimeoutRef.current);
				saveTimeoutRef.current = null;
			}
		};
	}, [appData, isLoading, isAuthenticated, authToken, showError]);

	// Manual sync function
	// const handleManualSync = async () => {
	//     try {
	//         setIsSaving(true);
	//         await saveToAPI(appData);
	//         // Removed lastSyncTime update
	//         setIsOnline(true);
	//         showSuccess("Data synced successfully!");
	//     } catch (error) {
	//         showError("Failed to sync data");
	//         setIsOnline(false);
	//     } finally {
	//         setIsSaving(false);
	//     }
	// };

	// Removed unused handleUpload and handleDownload

	const addDeck = (deckName) => {
		const newDeck = {
			deckId: Date.now().toString(),
			deckName,
			cards: [],
		};
		setAppData((prev) => ({
			decks: [...prev.decks, newDeck],
		}));
	};

	const updateDeck = (deckId, deckName) => {
		setAppData((prev) => ({
			decks: prev.decks.map((deck) =>
				deck.deckId === deckId ? { ...deck, deckName } : deck
			),
		}));
	};

	const deleteDeck = (deckId) => {
		setAppData((prev) => ({
			decks: prev.decks.filter((deck) => deck.deckId !== deckId),
		}));
		if (selectedDeckId === deckId) {
			setCurrentView("deck");
			setSelectedDeckId(null);
		}
	};

	const reorderDecks = (sourceIndex, destinationIndex) => {
		if (sourceIndex === destinationIndex) return;

		setAppData((prev) => {
			const newDecks = [...prev.decks];
			const [removed] = newDecks.splice(sourceIndex, 1);
			newDecks.splice(destinationIndex, 0, removed);
			return {
				decks: newDecks,
			};
		});
	};

	const addCard = (deckId, front, back) => {
		const newCard = {
			cardId: Date.now().toString(),
			front,
			back,
			reviews: [],
			whenDue: Date.now(),
		};
		setAppData((prev) => ({
			decks: prev.decks.map((deck) =>
				deck.deckId === deckId
					? { ...deck, cards: [...deck.cards, newCard] }
					: deck
			),
		}));
	};

	const updateCard = (deckId, cardId, front, back) => {
		setAppData((prev) => ({
			decks: prev.decks.map((deck) =>
				deck.deckId === deckId
					? {
							...deck,
							cards: deck.cards.map((card) =>
								card.cardId === cardId
									? { ...card, front, back }
									: card
							),
					  }
					: deck
			),
		}));
	};

	const deleteCard = (deckId, cardId) => {
		setAppData((prev) => ({
			decks: prev.decks.map((deck) =>
				deck.deckId === deckId
					? {
							...deck,
							cards: deck.cards.filter(
								(card) => card.cardId !== cardId
							),
					  }
					: deck
			),
		}));
	};

	const toggleCardFlag = (deckId, cardId) => {
		setAppData((prev) => ({
			decks: prev.decks.map((deck) =>
				deck.deckId === deckId
					? {
							...deck,
							cards: deck.cards.map((card) =>
								card.cardId === cardId
									? {
											...card,
											isFlagged: !(
												card.isFlagged || false
											),
									  }
									: card
							),
					  }
					: deck
			),
		}));
	};

	const startReview = (deckId) => {
		const deck = appData.decks.find((d) => d.deckId === deckId);
		if (deck) {
			// Create a copy of cards without mutating stored deck
			const cards = deck.cards.slice();
			const now = Date.now();

			// Separate cards into three groups
			const dueCards = cards.filter((card) => card.whenDue <= now);
			const newCards = cards.filter(
				(card) => card.reviews.length === 0 && card.whenDue > now
			);
			const notYetDueCards = cards.filter(
				(card) => card.whenDue > now && card.reviews.length > 0
			);

			// Sort due cards by whenDue DESCENDING (most recently due first, most overdue last)
			dueCards.sort((a, b) => b.whenDue - a.whenDue);

			// Shuffle new cards randomly
			for (let i = newCards.length - 1; i > 0; i -= 1) {
				const j = Math.floor(Math.random() * (i + 1));
				const temp = newCards[i];
				newCards[i] = newCards[j];
				newCards[j] = temp;
			}

			// Sort not yet due cards by whenDue ASCENDING (due soon first, due in a long time last)
			notYetDueCards.sort((a, b) => a.whenDue - b.whenDue);

			// Combine groups in priority order: due → new → not yet due
			const orderedCards = [...dueCards, ...newCards, ...notYetDueCards];

			setCurrentDeckForReview({ ...deck, cards: orderedCards });
			setCurrentCardIndex(0);
			setIsFlipped(false);
			setCurrentView("review");
		}
	};

	const recordReview = (result) => {
		if (!currentDeckForReview) return;

		const card = currentDeckForReview.cards[currentCardIndex];
		if (!card) return;

		const review = {
			reviewId: Date.now().toString(),
			timestamp: Date.now(),
			result, // "again", "hard", "good", "easy"
		};

		// Calculate next due date based on time since last review
		const now = Date.now();
		const reviews = card.reviews || [];

		// Calculate time since last review, or use 1 day default for first review
		const timeSinceLastReview =
			reviews.length > 0
				? now - reviews[reviews.length - 1].timestamp
				: 1 * 24 * 60 * 60 * 1000; // Default 1 day for first review

		let nextDue = now;

		if (result === "again") {
			nextDue = now + 1 * 24 * 60 * 60 * 1000; // 1 day
		} else if (result === "hard") {
			nextDue = now + 0.5 * timeSinceLastReview;
		} else if (result === "good") {
			nextDue = now + timeSinceLastReview;
		} else if (result === "easy") {
			nextDue = now + 2 * timeSinceLastReview;
		}

		// Update the card in the data
		const updatedCard = {
			...card,
			reviews: [...card.reviews, review],
			whenDue: nextDue,
		};

		setAppData((prev) => ({
			decks: prev.decks.map((deck) =>
				deck.deckId === currentDeckForReview.deckId
					? {
							...deck,
							cards: deck.cards.map((c) =>
								c.cardId === card.cardId ? updatedCard : c
							),
					  }
					: deck
			),
		}));

		// Update current deck for review
		const updatedCards = currentDeckForReview.cards.map((c) =>
			c.cardId === card.cardId ? updatedCard : c
		);
		setCurrentDeckForReview({
			...currentDeckForReview,
			cards: updatedCards,
		});

		// Move to next card
		setIsFlipped(false);
		if (currentCardIndex < currentDeckForReview.cards.length - 1) {
			setCurrentCardIndex(currentCardIndex + 1);
		} else {
			// End of review
			showSuccess("Review complete!");
			setCurrentView("deck");
			setCurrentDeckForReview(null);
			setCurrentCardIndex(0);
		}
	};

	// Handle logout
	const handleLogout = async () => {
		const result = await logout();
		if (result.success) {
			showSuccess("Logged out successfully");
		}
	};

	// Handle export data
	const handleExportData = () => {
		try {
			const dataStr = JSON.stringify(appData, null, 2);
			const dataBlob = new Blob([dataStr], { type: "application/json" });
			const url = URL.createObjectURL(dataBlob);
			const link = document.createElement("a");
			link.href = url;
			link.download = `flashcards-export-${
				new Date().toISOString().split("T")[0]
			}.json`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);
			showSuccess("Data exported successfully!");
		} catch (error) {
			console.error("Failed to export data:", error);
			showError("Failed to export data");
		}
	};

	// Show auth screen if not authenticated
	if (authLoading) {
		return (
			<div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin h-12 w-12 border-4 border-teal-500 border-t-transparent rounded-full mx-auto mb-4" />
					<p className="text-gray-600 dark:text-slate-400 text-lg">
						Checking authentication...
					</p>
				</div>
			</div>
		);
	}

	if (!isAuthenticated) {
		return <AuthView />;
	}

	if (isLoading) {
		return (
			<div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin h-12 w-12 border-4 border-teal-500 border-t-transparent rounded-full mx-auto mb-4" />
					<p className="text-gray-600 dark:text-slate-400 text-lg">
						Loading your flashcards...
					</p>
					<p className="text-gray-500 dark:text-slate-500 text-sm mt-2">
						Syncing with cloud
					</p>
				</div>
			</div>
		);
	}
	return (
		<div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col">
			<NotificationContainer />

			<Header
				user={user}
				isSaving={isSaving}
				isOnline={isOnline}
				onExport={handleExportData}
				onLogout={handleLogout}
			/>

			{/* Main content */}
			<main className="flex-1 mx-auto max-w-7xl px-6 py-8">
				{currentView === "deck" && (
					<DeckView
						appData={appData}
						selectedDeckId={selectedDeckId}
						onSelectDeck={setSelectedDeckId}
						onAddDeck={addDeck}
						onUpdateDeck={updateDeck}
						onDeleteDeck={deleteDeck}
						onReorderDecks={reorderDecks}
						onAddCard={addCard}
						onUpdateCard={updateCard}
						onDeleteCard={deleteCard}
						onEditCard={(deckId, cardId) => {
							setSelectedDeckId(deckId);
							setSelectedCardId(cardId);
							setCurrentView("edit");
						}}
						onStartReview={startReview}
						onToggleCardFlag={toggleCardFlag}
					/>
				)}
				{currentView === "edit" && (
					<CardEditView
						appData={appData}
						deckId={selectedDeckId}
						cardId={selectedCardId}
						onSave={(deckId, cardId, front, back) => {
							if (cardId) {
								updateCard(deckId, cardId, front, back);
							} else {
								addCard(deckId, front, back);
							}
							setCurrentView("deck");
							setSelectedCardId(null);
						}}
						onCancel={() => {
							setCurrentView("deck");
							setSelectedCardId(null);
						}}
					/>
				)}
				{currentView === "review" && currentDeckForReview && (
					<CardReviewView
						deck={currentDeckForReview}
						currentCardIndex={currentCardIndex}
						isFlipped={isFlipped}
						onFlip={() => setIsFlipped(!isFlipped)}
						onReview={recordReview}
						onEditCard={(cardId) => {
							setSelectedDeckId(currentDeckForReview.deckId);
							setSelectedCardId(cardId);
							setCurrentView("edit");
						}}
						onEndReview={() => {
							setCurrentView("deck");
							setCurrentDeckForReview(null);
							setCurrentCardIndex(0);
							setIsFlipped(false);
						}}
						onToggleFlag={(cardId) => {
							toggleCardFlag(currentDeckForReview.deckId, cardId);
							// Also update the current deck for review
							const updatedCards = currentDeckForReview.cards.map(
								(c) =>
									c.cardId === cardId
										? {
												...c,
												isFlagged: !(
													c.isFlagged || false
												),
										  }
										: c
							);
							setCurrentDeckForReview({
								...currentDeckForReview,
								cards: updatedCards,
							});
						}}
					/>
				)}
			</main>

			<Footer />
		</div>
	);
}

function Overview() {
	return (
		<ThemeProvider>
			<AuthProvider>
				<NotificationProvider>
					<AppContent />
				</NotificationProvider>
			</AuthProvider>
		</ThemeProvider>
	);
}

export default Overview;
