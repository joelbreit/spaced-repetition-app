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
import { useAppData } from "../contexts/AppDataContext";
import { useDeckOperations } from "../hooks/useDeckOperations";
import { calculateNextInterval } from "../services/cardCalculations";

function OverviewPage() {
	const { user, isAuthenticated, isLoading: authLoading } = useAuth();
	const { appData, setAppData, isLoading, isSaving, isOnline } = useAppData();

	// Review session state
	const [selectedCardId, setSelectedCardId] = useState(null);
	const [editingDeckId, setEditingDeckId] = useState(null);
	const [currentDeckForReview, setCurrentDeckForReview] = useState(null);
	const [currentCardIndex, setCurrentCardIndex] = useState(0);
	const [isFlipped, setIsFlipped] = useState(false);
	const [reviewSections, setReviewSections] = useState([]);
	const [sessionReviews, setSessionReviews] = useState([]);
	const deckBeforeReviewRef = useRef(null);

	// View state for edit/review overlays
	const [currentView, setCurrentView] = useState(null); // null, "edit", "review", "summary"

	const { updateCard, addCard, toggleCardFlag, toggleCardStar } =
		useDeckOperations();

	const startReview = (deckId) => {
		const deck = appData.decks?.find((d) => d.deckId === deckId);
		if (deck) {
			deckBeforeReviewRef.current = JSON.parse(JSON.stringify(deck));
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

	const recordReview = (result, timestamp = Date.now()) => {
		if (!currentDeckForReview) return;

		const card = currentDeckForReview.cards[currentCardIndex];
		if (!card) return;

		const interval = calculateNextInterval(result, card, timestamp);
		const nextDue = timestamp + interval;

		const review = {
			reviewId: `${timestamp}-${Math.random().toString(36).slice(2, 11)}`,
			timestamp: timestamp,
			interval: interval,
			result,
		};

		setSessionReviews((prev) => [
			...prev,
			{ cardId: card.cardId, result, timestamp },
		]);

		const updatedCard = {
			...card,
			reviews: [...card.reviews, review],
			whenDue: nextDue,
		};

		setAppData((prev) => ({
			decks: (prev.decks || []).map((deck) =>
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

		const updatedCards = currentDeckForReview.cards.map((c) =>
			c.cardId === card.cardId ? updatedCard : c
		);
		setCurrentDeckForReview({
			...currentDeckForReview,
			cards: updatedCards,
		});

		setIsFlipped(false);
		if (currentCardIndex < currentDeckForReview.cards.length - 1) {
			setCurrentCardIndex(currentCardIndex + 1);
		} else {
			setCurrentView("summary");
		}
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
		deckBeforeReviewRef.current = null;
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

			<Header user={user} isSaving={isSaving} isOnline={isOnline} />

			{/* Main content */}
			<main className="flex-1 mx-auto max-w-7xl px-6 py-8">
				{currentView === null && (
					<Routes>
						<Route
							path="/"
							element={
								<FolderBrowserView
									onStartReview={startReview}
								/>
							}
						/>
						<Route
							path="/folder/:folderId"
							element={
								<FolderBrowserView
									onStartReview={startReview}
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
							handleEditCard(currentDeckForReview.deckId, cardId);
						}}
						onEndReview={handleEndReview}
						onToggleFlag={(cardId) => {
							toggleCardFlag(currentDeckForReview.deckId, cardId);
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
							toggleCardStar(currentDeckForReview.deckId, cardId);
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
						deckBefore={deckBeforeReviewRef.current}
						deckAfter={appData.decks?.find(
							(d) => d.deckId === currentDeckForReview.deckId
						)}
						onClose={handleCloseSummary}
					/>
				)}
			</main>

			<Footer />
		</div>
	);
}

export default OverviewPage;
