import { useState, useEffect, useRef } from "react";
import {
	Upload,
	Download,
	Home,
	Edit,
	RotateCcw,
	Check,
	X,
	Moon,
	Sun,
	Wifi,
	WifiOff,
	Cloud,
	CloudOff,
} from "lucide-react";
import DeckView from "./components/DeckView";
import CardEditView from "./components/CardEditView";
import CardReviewView from "./components/CardReviewView";
import { NotificationProvider } from "./contexts/NotificationContext.jsx";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import { useNotification } from "./hooks/useNotification";
import NotificationContainer from "./components/NotificationContainer";
import { loadFromAPI, saveToAPI, checkAPIHealth } from "./services/apiStorage";

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
	const [lastSyncTime, setLastSyncTime] = useState(null);
	const { showSuccess, showError, showWarning } = useNotification();
	const { isDark, toggleTheme } = useTheme();
	const saveTimeoutRef = useRef(null);
	const hasMadeChanges = useRef(false);

	// Check API health on mount
	useEffect(() => {
		async function checkHealth() {
			const healthy = await checkAPIHealth();
			setIsOnline(healthy);
			if (!healthy) {
				showWarning("API is not accessible. Using local data only.");
			}
		}
		checkHealth();
	}, []);

	// Load from API on mount
	useEffect(() => {
		async function loadData() {
			setIsLoading(true);
			try {
				const cloudData = await loadFromAPI();

				// If API returns empty data, check localStorage
				if (
					!cloudData ||
					!cloudData.decks ||
					cloudData.decks.length === 0
				) {
					const localData = localStorage.getItem("spacedRepData");
					if (localData) {
						const parsed = JSON.parse(localData);
						setAppData(parsed);
						// Upload local data to API
						await saveToAPI(parsed);
						showSuccess("Local data synced to cloud");
					} else {
						setAppData(initialData);
					}
				} else {
					setAppData(cloudData);
					// Also save to localStorage as backup
					localStorage.setItem(
						"spacedRepData",
						JSON.stringify(cloudData)
					);
				}

				setLastSyncTime(new Date());
				setIsOnline(true);
			} catch (error) {
				console.error("Failed to load from API:", error);
				showError(
					"Failed to load data from cloud. Using local backup."
				);
				setIsOnline(false);

				// Fallback to localStorage
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
	}, []);

	// Auto-save to API (debounced)
	useEffect(() => {
		if (isLoading) return;
		if (!hasMadeChanges.current) {
			hasMadeChanges.current = true;
			return; // Skip first render
		}

		// Clear existing timeout
		if (saveTimeoutRef.current) {
			clearTimeout(saveTimeoutRef.current);
		}

		// Set saving indicator
		setIsSaving(true);

		// Save after 2 seconds of no changes
		saveTimeoutRef.current = setTimeout(async () => {
			try {
				await saveToAPI(appData);
				// Also save to localStorage as backup
				localStorage.setItem("spacedRepData", JSON.stringify(appData));
				setLastSyncTime(new Date());
				setIsOnline(true);
			} catch (error) {
				console.error("Failed to save to API:", error);
				showError("Failed to save to cloud. Data saved locally.");
				setIsOnline(false);
				// Still save to localStorage
				localStorage.setItem("spacedRepData", JSON.stringify(appData));
			} finally {
				setIsSaving(false);
			}
		}, 2000);

		return () => {
			if (saveTimeoutRef.current) {
				clearTimeout(saveTimeoutRef.current);
			}
		};
	}, [appData, isLoading]);

	// Manual sync function
	const handleManualSync = async () => {
		try {
			setIsSaving(true);
			await saveToAPI(appData);
			setLastSyncTime(new Date());
			setIsOnline(true);
			showSuccess("Data synced successfully!");
		} catch (error) {
			showError("Failed to sync data");
			setIsOnline(false);
		} finally {
			setIsSaving(false);
		}
	};

	const handleUpload = (event) => {
		const file = event.target.files[0];
		if (file && file.type === "application/json") {
			const reader = new FileReader();
			reader.onload = (e) => {
				try {
					const uploadedData = JSON.parse(e.target.result);
					setAppData((prev) => {
						const uploadedDecksMap = new Map();
						uploadedData.decks.forEach((deck) => {
							uploadedDecksMap.set(deck.deckId, deck);
						});

						const existingDecks = prev.decks.filter(
							(deck) => !uploadedDecksMap.has(deck.deckId)
						);

						return {
							decks: [...existingDecks, ...uploadedData.decks],
						};
					});
					showSuccess("Data uploaded successfully!");
				} catch {
					showError("Error parsing JSON file");
				}
			};
			reader.readAsText(file);
		} else {
			showError("Please upload a valid JSON file");
		}
		event.target.value = "";
	};

	const handleDownload = () => {
		const dataStr = JSON.stringify(appData, null, 2);
		const dataBlob = new Blob([dataStr], { type: "application/json" });
		const url = URL.createObjectURL(dataBlob);
		const link = document.createElement("a");
		link.href = url;
		link.download = "spaced-repetition-data.json";
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	};

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

	const startReview = (deckId) => {
		const deck = appData.decks.find((d) => d.deckId === deckId);
		if (deck) {
			setCurrentDeckForReview(deck);
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

		// Calculate next due date based on SM-2 algorithm
		const now = Date.now();
		let nextDue = now;

		if (result === "again") {
			nextDue = now; // Due immediately
		} else if (result === "hard") {
			nextDue = now + 1.2 * 24 * 60 * 60 * 1000; // 1.2 days
		} else if (result === "good") {
			nextDue = now + 2 * 24 * 60 * 60 * 1000; // 2 days
		} else if (result === "easy") {
			nextDue = now + 4 * 24 * 60 * 60 * 1000; // 4 days
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
		<div className="min-h-screen bg-gray-50 dark:bg-slate-900">
			<NotificationContainer />
			{/* Header */}
			<header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg border-b border-gray-100 dark:border-slate-700 shadow-sm">
				<div className="mx-auto max-w-7xl px-6">
					<div className="flex h-16 items-center justify-between">
						<div className="flex items-center space-x-4">
							<h1 className="text-2xl font-bold bg-gradient-to-r from-teal-500 to-cyan-500 bg-clip-text text-transparent">
								Spaced Repetition Flashcards
							</h1>

							{/* Sync Status Indicator */}
							<div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 dark:bg-slate-700">
								{isSaving ? (
									<>
										<div className="animate-spin h-3 w-3 border-2 border-teal-500 border-t-transparent rounded-full" />
										<span className="text-xs text-gray-600 dark:text-slate-400">
											Saving...
										</span>
									</>
								) : isOnline ? (
									<>
										<Cloud className="h-3 w-3 text-green-500" />
										<span className="text-xs text-gray-600 dark:text-slate-400">
											Synced
										</span>
									</>
								) : (
									<>
										<CloudOff className="h-3 w-3 text-orange-500" />
										<span className="text-xs text-gray-600 dark:text-slate-400">
											Offline
										</span>
									</>
								)}
							</div>
						</div>
						<div className="flex items-center space-x-3">
							{/* Manual Sync Button */}
							<button
								onClick={handleManualSync}
								disabled={isSaving}
								className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 rounded-xl transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-50"
								title="Sync now"
							>
								<RotateCcw
									className={`h-5 w-5 ${
										isSaving ? "animate-spin" : ""
									}`}
								/>
							</button>

							{currentView !== "deck" && (
								<button
									onClick={() => {
										setCurrentView("deck");
										setSelectedDeckId(null);
										setSelectedCardId(null);
										setIsFlipped(false);
									}}
									className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 font-medium rounded-xl transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
								>
									<Home className="h-5 w-5" />
								</button>
							)}
							<input
								type="file"
								accept=".json"
								onChange={handleUpload}
								className="hidden"
								id="upload-file"
							/>
							<label
								htmlFor="upload-file"
								className="inline-flex cursor-pointer items-center px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
							>
								<Upload className="mr-2 h-5 w-5" />
								Upload
							</label>
							<button
								onClick={handleDownload}
								className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
							>
								<Download className="mr-2 h-5 w-5" />
								Download
							</button>
						</div>
					</div>
				</div>
			</header>

			{/* Main content */}
			<main className="mx-auto max-w-7xl px-6 py-8">
				{currentView === "deck" && (
					<DeckView
						appData={appData}
						selectedDeckId={selectedDeckId}
						onSelectDeck={setSelectedDeckId}
						onAddDeck={addDeck}
						onUpdateDeck={updateDeck}
						onDeleteDeck={deleteDeck}
						onAddCard={addCard}
						onUpdateCard={updateCard}
						onDeleteCard={deleteCard}
						onEditCard={(deckId, cardId) => {
							setSelectedDeckId(deckId);
							setSelectedCardId(cardId);
							setCurrentView("edit");
						}}
						onStartReview={startReview}
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
					/>
				)}
			</main>
		</div>
	);
}

function App() {
	return (
		<ThemeProvider>
			<NotificationProvider>
				<AppContent />
			</NotificationProvider>
		</ThemeProvider>
	);
}

export default App;
