import { useAuth } from "../contexts/AuthContext";
import AuthView from "../components/AuthView";
import { useState } from "react";
import DeckView from "../components/DeckView";
import CardEditView from "../components/CardEditView";
import CardReviewView from "../components/CardReviewView";
import Header from "../components/Header";
import { useNotification } from "../hooks/useNotification";
import NotificationContainer from "../components/NotificationContainer";
import Footer from "../components/Footer.jsx";
import { useAppData } from "../contexts/AppDataContext";

function OverviewPage() {
	const { user, isAuthenticated, isLoading: authLoading } = useAuth();

	const { appData, setAppData, isLoading, isSaving, isOnline } = useAppData();
	const [currentView, setCurrentView] = useState("deck");
	const [selectedDeckId, setSelectedDeckId] = useState(null);
	const [selectedCardId, setSelectedCardId] = useState(null);
	const [currentDeckForReview, setCurrentDeckForReview] = useState(null);
	const [currentCardIndex, setCurrentCardIndex] = useState(0);
	const [isFlipped, setIsFlipped] = useState(false);
	const { showSuccess } = useNotification();

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

	const duplicateCardsReversed = (deckId) => {
		setAppData((prev) => {
			const deck = prev.decks.find((d) => d.deckId === deckId);
			if (!deck || deck.cards.length === 0) return prev;

			const now = Date.now();

			// Only select cards that do not already have a partnerCardId
			const cardsToDuplicate = deck.cards.filter(
				(card) => !card.partnerCardId
			);

			if (cardsToDuplicate.length === 0) return prev;

			// Generate new cards just for those without partner
			const newCards = cardsToDuplicate.map((card, idx) => {
				const newCardId = `${now}-${idx}`;
				return {
					cardId: newCardId,
					front: card.back,
					back: card.front,
					reviews: [],
					whenDue: now,
					partnerCardId: card.cardId,
				};
			});

			return {
				decks: prev.decks.map((d) => {
					if (d.deckId !== deckId) return d;

					// Update only original cards that did not have a partner
					const updatedCards = d.cards.map((card) => {
						const idx = cardsToDuplicate.findIndex(
							(c) => c.cardId === card.cardId
						);
						if (idx !== -1) {
							return {
								...card,
								partnerCardId: newCards[idx].cardId,
							};
						}
						return card;
					});

					return {
						...d,
						cards: [...updatedCards, ...newCards],
					};
				}),
			};
		});
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
						onDuplicateCardsReversed={duplicateCardsReversed}
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

export default OverviewPage;
