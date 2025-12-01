import "../config/amplify";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import AuthView from "../components/AuthView";
import { LogOut, User as UserIcon, ChevronDown } from "lucide-react";
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
import DeckView from "../components/DeckView";
import CardEditView from "../components/CardEditView";
import CardReviewView from "../components/CardReviewView";
import { NotificationProvider } from "../contexts/NotificationContext.jsx";
import { ThemeProvider } from "../contexts/ThemeContext";
import { useNotification } from "../hooks/useNotification";
import NotificationContainer from "../components/NotificationContainer";
import { loadFromAPI, saveToAPI, checkAPIHealth } from "../services/apiStorage";

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
	const [showUserMenu, setShowUserMenu] = useState(false);
	// Removed lastSyncTime as it was unused
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

			{/* Header */}
			<header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg border-b border-gray-100 dark:border-slate-700 shadow-sm">
				<div className="mx-auto max-w-7xl px-4 sm:px-6">
					<div className="flex h-14 sm:h-16 items-center justify-between">
						{/* Title - shorter on mobile */}
						<div className="flex items-center min-w-0 flex-1">
							<h1 className="text-lg sm:text-2xl font-bold bg-linear-to-r from-teal-500 to-cyan-500 bg-clip-text text-transparent truncate">
								<span className="hidden sm:inline">
									Spaced Repetition Flashcards
								</span>
								<span className="sm:hidden">Flashcards</span>
							</h1>
						</div>

						{/* Desktop: Show all items */}
						<div className="hidden md:flex items-center space-x-3 shrink-0">
							{/* User Info */}
							<div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 dark:bg-slate-700">
								<UserIcon className="h-3 w-3 text-gray-600 dark:text-slate-400" />
								<span className="text-xs text-gray-600 dark:text-slate-400 truncate max-w-[120px]">
									{user?.signInDetails?.loginId || "User"}
								</span>
							</div>

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

							{/* Export Button */}
							<button
								onClick={handleExportData}
								className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 font-medium rounded-xl transition-colors duration-200"
								title="Export data"
							>
								<Download className="h-4 w-4" />
								Export
							</button>

							{/* Logout Button */}
							<button
								onClick={handleLogout}
								className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 font-medium rounded-xl transition-colors duration-200"
							>
								<LogOut className="h-4 w-4" />
								Logout
							</button>
						</div>

						{/* Mobile: Dropdown menu */}
						<div className="md:hidden relative shrink-0">
							<button
								onClick={() => setShowUserMenu(!showUserMenu)}
								className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg transition-colors duration-200"
							>
								<UserIcon className="h-4 w-4 text-gray-600 dark:text-slate-400" />
								<ChevronDown
									className={`h-4 w-4 text-gray-600 dark:text-slate-400 transition-transform ${
										showUserMenu ? "rotate-180" : ""
									}`}
								/>
							</button>

							{/* Dropdown Menu */}
							{showUserMenu && (
								<>
									{/* Backdrop */}
									<div
										className="fixed inset-0 z-10"
										onClick={() => setShowUserMenu(false)}
									/>
									{/* Menu */}
									<div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 z-20 py-2">
										{/* User Email */}
										<div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700">
											<div className="flex items-center gap-2">
												<UserIcon className="h-4 w-4 text-gray-600 dark:text-slate-400" />
												<span className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">
													{user?.signInDetails
														?.loginId || "User"}
												</span>
											</div>
										</div>

										{/* Sync Status */}
										<div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700">
											<div className="flex items-center gap-2">
												{isSaving ? (
													<>
														<div className="animate-spin h-4 w-4 border-2 border-teal-500 border-t-transparent rounded-full" />
														<span className="text-sm text-gray-600 dark:text-slate-400">
															Saving...
														</span>
													</>
												) : isOnline ? (
													<>
														<Cloud className="h-4 w-4 text-green-500" />
														<span className="text-sm text-gray-600 dark:text-slate-400">
															Synced
														</span>
													</>
												) : (
													<>
														<CloudOff className="h-4 w-4 text-orange-500" />
														<span className="text-sm text-gray-600 dark:text-slate-400">
															Offline
														</span>
													</>
												)}
											</div>
										</div>

										{/* Export */}
										<button
											onClick={() => {
												setShowUserMenu(false);
												handleExportData();
											}}
											className="w-full flex items-center gap-2 px-4 py-3 text-left text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors duration-200"
										>
											<Download className="h-4 w-4" />
											Export Data
										</button>

										{/* Logout */}
										<button
											onClick={() => {
												setShowUserMenu(false);
												handleLogout();
											}}
											className="w-full flex items-center gap-2 px-4 py-3 text-left text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors duration-200"
										>
											<LogOut className="h-4 w-4" />
											Logout
										</button>
									</div>
								</>
							)}
						</div>
					</div>
				</div>
			</header>

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

			{/* Footer */}
			<footer className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg border-t border-gray-100 dark:border-slate-700 mt-auto">
				<div className="mx-auto max-w-7xl px-4 sm:px-6 py-6">
					<div className="flex flex-col sm:flex-row items-center justify-between gap-4">
						<p className="text-sm text-gray-600 dark:text-slate-400 text-center sm:text-left">
							Created by{" "}
							<span className="font-semibold text-gray-900 dark:text-slate-100">
								Joel Breit
							</span>
						</p>
						<div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
							<a
								href="https://joelbreit.com"
								target="_blank"
								rel="noopener noreferrer"
								className="text-sm text-gray-600 dark:text-slate-400 hover:text-teal-500 dark:hover:text-teal-400 transition-colors duration-200"
							>
								Website
							</a>
							<a
								href="https://github.com/joelbreit"
								target="_blank"
								rel="noopener noreferrer"
								className="text-sm text-gray-600 dark:text-slate-400 hover:text-teal-500 dark:hover:text-teal-400 transition-colors duration-200"
							>
								GitHub
							</a>
							<a
								href="https://www.linkedin.com/in/joel-breit"
								target="_blank"
								rel="noopener noreferrer"
								className="text-sm text-gray-600 dark:text-slate-400 hover:text-teal-500 dark:hover:text-teal-400 transition-colors duration-200"
							>
								LinkedIn
							</a>
							<a
								href="mailto:joel@joelbreit.com"
								className="text-sm text-gray-600 dark:text-slate-400 hover:text-teal-500 dark:hover:text-teal-400 transition-colors duration-200"
							>
								Email
							</a>
						</div>
					</div>
				</div>
			</footer>
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
