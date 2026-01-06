import { useAppData } from "../contexts/AppDataContext";

export function useDeckOperations() {
	const { setAppData } = useAppData();

	const addDeck = (deckName, deckSymbol = "📚", parentFolderId = null) => {
		const newDeck = {
			deckId: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
			deckName,
			deckSymbol,
			parentFolderId,
			createdAt: Date.now(),
			cards: [],
		};
		setAppData((prev) => ({
			...prev,
			decks: [...(prev.decks || []), newDeck],
		}));
	};

	const updateDeck = (deckId, deckName, deckSymbol) => {
		setAppData((prev) => ({
			...prev,
			decks: (prev.decks || []).map((deck) =>
				deck.deckId === deckId
					? { ...deck, deckName, deckSymbol }
					: deck
			),
		}));
	};

	const deleteDeck = (deckId) => {
		setAppData((prev) => ({
			...prev,
			decks: (prev.decks || []).filter((deck) => deck.deckId !== deckId),
		}));
	};

	const moveDeck = (deckId, newParentFolderId) => {
		setAppData((prev) => ({
			...prev,
			decks: (prev.decks || []).map((deck) =>
				deck.deckId === deckId
					? { ...deck, parentFolderId: newParentFolderId }
					: deck
			),
		}));
	};

	const reorderDecks = (sourceIndex, destinationIndex) => {
		if (sourceIndex === destinationIndex) return;

		setAppData((prev) => {
			const newDecks = [...(prev.decks || [])];
			const [removed] = newDecks.splice(sourceIndex, 1);
			newDecks.splice(destinationIndex, 0, removed);
			return {
				...prev,
				decks: newDecks,
			};
		});
	};

	const addCard = (deckId, front, back) => {
		const newCard = {
			cardId: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
			front,
			back,
			reviews: [],
			whenDue: Date.now(),
			createdAt: Date.now(),
		};
		setAppData((prev) => ({
			...prev,
			decks: (prev.decks || []).map((deck) =>
				deck.deckId === deckId
					? { ...deck, cards: [...deck.cards, newCard] }
					: deck
			),
		}));
	};

	const updateCard = (deckId, cardId, front, back) => {
		setAppData((prev) => ({
			...prev,
			decks: (prev.decks || []).map((deck) =>
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
			...prev,
			decks: (prev.decks || []).map((deck) =>
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
			...prev,
			decks: (prev.decks || []).map((deck) =>
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

	const toggleCardStar = (deckId, cardId) => {
		setAppData((prev) => ({
			...prev,
			decks: (prev.decks || []).map((deck) =>
				deck.deckId === deckId
					? {
						...deck,
						cards: deck.cards.map((card) =>
							card.cardId === cardId
								? {
									...card,
									isStarred: !(
										card.isStarred || false
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
			const deck = (prev.decks || []).find((d) => d.deckId === deckId);
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
					createdAt: now,
				};
			});

			return {
				...prev,
				decks: (prev.decks || []).map((d) => {
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

	const addFolder = (folderName, folderSymbol = "📁", parentFolderId = null) => {
		const newFolder = {
			folderId: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
			folderName,
			folderSymbol,
			parentFolderId,
			createdAt: Date.now(),
			updatedAt: Date.now(),
		};
		setAppData((prev) => ({
			...prev,
			folders: [...(prev.folders || []), newFolder],
		}));
	};

	const updateFolder = (folderId, folderName, folderSymbol) => {
		setAppData((prev) => ({
			...prev,
			folders: (prev.folders || []).map((folder) =>
				folder.folderId === folderId
					? { ...folder, folderName, folderSymbol, updatedAt: Date.now() }
					: folder
			),
		}));
	};

	const deleteFolder = (folderId) => {
		setAppData((prev) => ({
			...prev,
			folders: (prev.folders || []).filter((folder) => folder.folderId !== folderId),
		}));
	};

	const reorderContainers = (sourceIndex, destinationIndex, items) => {
		if (sourceIndex === destinationIndex) return;

		setAppData((prev) => {
			const item = items[sourceIndex];
			if (item.type === "folder") {
				const folders = [...(prev.folders || [])];
				const sourceFolderIndex = folders.findIndex(f => f.folderId === item.id);
				const destFolderIndex = folders.findIndex(f => f.folderId === items[destinationIndex].id);
				if (sourceFolderIndex !== -1 && destFolderIndex !== -1) {
					const [removed] = folders.splice(sourceFolderIndex, 1);
					folders.splice(destFolderIndex, 0, removed);
					return { ...prev, folders };
				}
			} else if (item.type === "deck") {
				const decks = [...(prev.decks || [])];
				const sourceDeckIndex = decks.findIndex(d => d.deckId === item.id);
				const destDeckIndex = decks.findIndex(d => d.deckId === items[destinationIndex].id);
				if (sourceDeckIndex !== -1 && destDeckIndex !== -1) {
					const [removed] = decks.splice(sourceDeckIndex, 1);
					decks.splice(destDeckIndex, 0, removed);
					return { ...prev, decks };
				}
			}
			return prev;
		});
	};

	return {
		addDeck,
		updateDeck,
		deleteDeck,
		moveDeck,
		reorderDecks,
		addCard,
		updateCard,
		deleteCard,
		toggleCardFlag,
		toggleCardStar,
		duplicateCardsReversed,
		addFolder,
		updateFolder,
		deleteFolder,
		reorderContainers,
	};
}

