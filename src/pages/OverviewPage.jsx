import { useAuth } from "../contexts/AuthContext";
import AuthView from "../components/AuthView";
import { useState, useRef } from "react";
import { Routes, Route } from "react-router-dom";
import FolderBrowserView from "../components/FolderBrowserView";
import DeckCardsView from "../components/DeckCardsView";
import CardEditView from "../components/CardEditView";
import CardReviewView from "../components/CardReviewView";
import ReviewSummary from "../components/ReviewSummary";
import Header from "../components/Header";
import NotificationContainer from "../components/NotificationContainer";
import Footer from "../components/Footer.jsx";
import DemoBanner from "../components/DemoBanner";
import { useAppData } from "../contexts/AppDataContext";
import { useDeckOperations } from "../hooks/useDeckOperations";
import { calculateNextInterval } from "../services/cardCalculations";

function OverviewPage() {
	const { user, isAuthenticated, isLoading: authLoading } = useAuth();
	const { appData, setAppData, isLoading, isSaving, isOnline } = useAppData();
	const [showAuthModal, setShowAuthModal] = useState(false);

	// Review session state
	const [selectedCardId, setSelectedCardId] = useState(null);
	const [editingDeckId, setEditingDeckId] = useState(null);
	const [currentDeckForReview, setCurrentDeckForReview] = useState(null);
	const [currentCardIndex, setCurrentCardIndex] = useState(0);
	const [isFlipped, setIsFlipped] = useState(false);
	const [reviewSections, setReviewSections] = useState([]);
	const [sessionReviews, setSessionReviews] = useState([]);
	const cardsCollectionBeforeReviewRef = useRef(null);

	// View state for edit/review overlays
	const [currentView, setCurrentView] = useState(null); // null, "edit", "review", "summary"

	const { updateCard, addCard, toggleCardFlag, toggleCardStar } =
		useDeckOperations();

	const startReview = (deckId) => {
		const deck = appData.decks?.find((d) => d.deckId === deckId);
		if (deck) {
			cardsCollectionBeforeReviewRef.current = JSON.parse(
				JSON.stringify(deck)
			);
			setSessionReviews([]);

			const cards = deck.cards.slice();
			const now = Date.now();

			const dueCards = cards.filter(
				(card) => card.whenDue <= now && card.reviews.length > 0
			);
			const newCards = cards.filter((card) => card.reviews.length === 0);
			const notYetDueCards = cards.filter(
				(card) => card.whenDue > now && card.reviews.length > 0
			);

			dueCards.sort((a, b) => b.whenDue - a.whenDue);

			for (let i = newCards.length - 1; i > 0; i -= 1) {
				const j = Math.floor(Math.random() * (i + 1));
				const temp = newCards[i];
				newCards[i] = newCards[j];
				newCards[j] = temp;
			}

			notYetDueCards.sort((a, b) => a.whenDue - b.whenDue);

			const orderedCards = [...dueCards, ...newCards, ...notYetDueCards];

			const sections = [
				{ type: "due", label: "Due", total: dueCards.length },
				{ type: "new", label: "New", total: newCards.length },
				{
					type: "learned",
					label: "Learned",
					total: notYetDueCards.length,
				},
			];

			setCurrentDeckForReview({ ...deck, cards: orderedCards });
			setReviewSections(sections);
			setCurrentCardIndex(0);
			setIsFlipped(false);
			setCurrentView("review");
		}
	};

	const startFolderReview = (folderId) => {
		// Get all decks in the folder (folderId can be null for root)
		let folderDecks = (appData.decks || []).filter(
			(d) => d.parentFolderId === folderId
		);

		if (folderId === null) {
			folderDecks = appData.decks || [];
		}

		if (folderDecks.length === 0) {
			return; // No decks in folder
		}

		// Collect all cards from all decks, tagging each with its source deckId
		const allCards = [];
		folderDecks.forEach((deck) => {
			deck.cards.forEach((card) => {
				allCards.push({
					...card,
					sourceDeckId: deck.deckId, // Track which deck this card belongs to
				});
			});
		});

		if (allCards.length === 0) {
			return; // No cards in any deck
		}

		// Create a snapshot of all decks before review for summary
		const decksBefore = folderDecks.map((deck) =>
			JSON.parse(JSON.stringify(deck))
		);
		cardsCollectionBeforeReviewRef.current = decksBefore;
		setSessionReviews([]);

		const now = Date.now();

		const dueCards = allCards.filter(
			(card) => card.whenDue <= now && card.reviews.length > 0
		);
		const newCards = allCards.filter((card) => card.reviews.length === 0);
		const notYetDueCards = allCards.filter(
			(card) => card.whenDue > now && card.reviews.length > 0
		);

		dueCards.sort((a, b) => b.whenDue - a.whenDue);

		for (let i = newCards.length - 1; i > 0; i -= 1) {
			const j = Math.floor(Math.random() * (i + 1));
			const temp = newCards[i];
			newCards[i] = newCards[j];
			newCards[j] = temp;
		}

		notYetDueCards.sort((a, b) => a.whenDue - b.whenDue);

		const orderedCards = [...dueCards, ...newCards, ...notYetDueCards];

		const sections = [
			{ type: "due", label: "Due", total: dueCards.length },
			{ type: "new", label: "New", total: newCards.length },
			{
				type: "learned",
				label: "Learned",
				total: notYetDueCards.length,
			},
		];

		// Create a virtual deck object for the folder review
		const folder = folderId
			? appData.folders?.find((f) => f.folderId === folderId)
			: null;
		const virtualDeck = {
			deckId: folderId || "root-folder", // Use folderId or special ID for root
			deckName: folder ? `${folder.folderName} (All Decks)` : "All Decks",
			deckSymbol: folder?.folderSymbol || "📁",
			cards: orderedCards,
			isFolderReview: true, // Flag to indicate this is a folder review
		};

		setCurrentDeckForReview(virtualDeck);
		setReviewSections(sections);
		setCurrentCardIndex(0);
		setIsFlipped(false);
		setCurrentView("review");
	};

	const recordReview = (
		result,
		timestamp = Date.now(),
		reviewDuration = 0
	) => {
		if (!currentDeckForReview) return;

		const card = currentDeckForReview.cards[currentCardIndex];
		if (!card) return;

		// Get the deckId for this card (use sourceDeckId for folder reviews)
		const deckId = card.sourceDeckId || currentDeckForReview.deckId;

		const interval = calculateNextInterval(result, card, timestamp);
		const nextDue = timestamp + interval;

		console.log("reviewDuration", reviewDuration);

		const review = {
			reviewId: `${timestamp}-${Math.random().toString(36).slice(2, 11)}`,
			timestamp: timestamp,
			interval: interval,
			result,
			reviewDuration: reviewDuration,
		};

		setSessionReviews((prev) => [
			...prev,
			{ cardId: card.cardId, result, timestamp, reviewDuration },
		]);

		const updatedCard = {
			...card,
			reviews: [...card.reviews, review],
			whenDue: nextDue,
		};

		setAppData((prev) => ({
			...prev,
			decks: (prev.decks || []).map((deck) =>
				deck.deckId === deckId
					? {
							...deck,
							cards: deck.cards.map((c) =>
								c.cardId === card.cardId ? updatedCard : c
							),
					  }
					: deck
			),
		}));

		const updatedCards = currentDeckForReview.cards.map((c) =>
			c.cardId === card.cardId ? updatedCard : c
		);
		setCurrentDeckForReview({
			...currentDeckForReview,
			cards: updatedCards,
		});

		setIsFlipped(false);

		// Delay showing the next card until the current one has flipped back enough
		// so the back side isn't visible. This prevents seeing the next card's back
		// during the flip-back animation.
		setTimeout(() => {
			if (currentCardIndex < currentDeckForReview.cards.length - 1) {
				setCurrentCardIndex(currentCardIndex + 1);
			} else {
				setCurrentView("summary");
			}
		}, 300);
	};

	const handleEditCard = (deckId, cardId) => {
		setEditingDeckId(deckId);
		setSelectedCardId(cardId);
		setCurrentView("edit");
	};

	const handleSaveCard = (deckId, cardId, front, back) => {
		if (cardId) {
			updateCard(deckId, cardId, front, back);
		} else {
			addCard(deckId, front, back);
		}
		setCurrentView(null);
		setSelectedCardId(null);
		setEditingDeckId(null);
	};

	const handleCancelEdit = () => {
		setCurrentView(null);
		setSelectedCardId(null);
		setEditingDeckId(null);
	};

	const handleEndReview = () => {
		if (sessionReviews.length > 0) {
			setCurrentView("summary");
		} else {
			setCurrentView(null);
		}
	};

	const handleCloseSummary = () => {
		setCurrentView(null);
		setCurrentDeckForReview(null);
		setCurrentCardIndex(0);
		setReviewSections([]);
		setIsFlipped(false);
		setSessionReviews([]);
		cardsCollectionBeforeReviewRef.current = null;
	};

	// Show loading screen while checking auth or loading data
	if (authLoading || isLoading) {
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

			<DemoBanner />

			<Header
				user={user}
				isSaving={isSaving}
				isOnline={isOnline}
				onSignInClick={() => setShowAuthModal(true)}
			/>

			{/* Main content */}
			<main className="flex-1 mx-auto max-w-7xl px-6 py-8">
				{currentView === null && (
					<Routes>
						<Route
							path="/"
							element={
								<FolderBrowserView
									onStartReview={startReview}
									onStartFolderReview={startFolderReview}
								/>
							}
						/>
						<Route
							path="/folder/:folderId"
							element={
								<FolderBrowserView
									onStartReview={startReview}
									onStartFolderReview={startFolderReview}
								/>
							}
						/>
						<Route
							path="/deck/:deckId"
							element={
								<DeckCardsView
									onEditCard={handleEditCard}
									onStartReview={startReview}
								/>
							}
						/>
					</Routes>
				)}

				{/* Edit overlay */}
				{currentView === "edit" && editingDeckId && (
					<CardEditView
						appData={appData}
						deckId={editingDeckId}
						cardId={selectedCardId}
						onSave={handleSaveCard}
						onCancel={handleCancelEdit}
					/>
				)}

				{/* Review overlay */}
				{currentView === "review" && currentDeckForReview && (
					<CardReviewView
						deck={currentDeckForReview}
						currentCardIndex={currentCardIndex}
						isFlipped={isFlipped}
						sections={reviewSections}
						onFlip={() => setIsFlipped(!isFlipped)}
						onReview={recordReview}
						onEditCard={(cardId) => {
							const card = currentDeckForReview.cards.find(
								(c) => c.cardId === cardId
							);
							const deckId =
								card?.sourceDeckId ||
								currentDeckForReview.deckId;
							handleEditCard(deckId, cardId);
						}}
						onEndReview={handleEndReview}
						onToggleFlag={(cardId) => {
							const card = currentDeckForReview.cards.find(
								(c) => c.cardId === cardId
							);
							const deckId =
								card?.sourceDeckId ||
								currentDeckForReview.deckId;
							toggleCardFlag(deckId, cardId);
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
						onToggleStar={(cardId) => {
							const card = currentDeckForReview.cards.find(
								(c) => c.cardId === cardId
							);
							const deckId =
								card?.sourceDeckId ||
								currentDeckForReview.deckId;
							toggleCardStar(deckId, cardId);
							const updatedCards = currentDeckForReview.cards.map(
								(c) =>
									c.cardId === cardId
										? {
												...c,
												isStarred: !(
													c.isStarred || false
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

				{/* Summary overlay */}
				{currentView === "summary" && currentDeckForReview && (
					<ReviewSummary
						sessionReviews={sessionReviews}
						cardsCollectionBefore={
							currentDeckForReview.isFolderReview
								? {
										cards:
											cardsCollectionBeforeReviewRef.current?.flatMap(
												(deck) => deck.cards
											) || [],
								  }
								: cardsCollectionBeforeReviewRef.current
						}
						cardsCollectionAfter={
							currentDeckForReview.isFolderReview
								? {
										cards: (appData.decks || [])
											.filter((d) =>
												cardsCollectionBeforeReviewRef.current?.some(
													(beforeDeck) =>
														beforeDeck.deckId ===
														d.deckId
												)
											)
											.flatMap((deck) => deck.cards),
								  }
								: appData.decks?.find(
										(d) =>
											d.deckId ===
											currentDeckForReview.deckId
								  )
						}
						onClose={handleCloseSummary}
					/>
				)}
			</main>

			<Footer />

			{/* Auth Modal - shown when user clicks Sign In or Sign Up */}
			{!isAuthenticated && showAuthModal && (
				<AuthView onClose={() => setShowAuthModal(false)} />
			)}
		</div>
	);
}

export default OverviewPage;
