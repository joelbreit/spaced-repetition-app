import { useAppData } from '../contexts/AppDataContext';
import {
	DEFAULT_DECK_ICON,
	DEFAULT_FOLDER_ICON,
} from '../config/containerIcons';
import { DEFAULT_CONTAINER_COLOR } from '../config/containerColors';
import {
	canReverse,
	newClozeNoteAndCards,
	newNoteAndCard,
	reversedCard,
	setCardText,
} from '../services/notes';

export function useDeckOperations() {
	const { setAppData } = useAppData();

	const addDeck = (
		deckName,
		deckSymbol = DEFAULT_DECK_ICON,
		parentFolderId = null,
		deckColor = DEFAULT_CONTAINER_COLOR
	) => {
		const newDeck = {
			deckId: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
			deckName,
			deckSymbol,
			deckColor,
			parentFolderId,
			createdAt: Date.now(),
			cards: [],
		};
		setAppData((prev) => ({
			...prev,
			decks: [...(prev.decks || []), newDeck],
		}));
	};

	const updateDeck = (deckId, deckName, deckSymbol, deckColor) => {
		setAppData((prev) => ({
			...prev,
			decks: (prev.decks || []).map((deck) =>
				deck.deckId === deckId
					? { ...deck, deckName, deckSymbol, deckColor }
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

	const toggleArchiveDeck = (deckId) => {
		setAppData((prev) => ({
			...prev,
			decks: (prev.decks || []).map((deck) =>
				deck.deckId === deckId
					? { ...deck, isArchived: !(deck.isArchived || false) }
					: deck
			),
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
		const { note, card: newCard } = newNoteAndCard(front, back);
		setAppData((prev) => ({
			...prev,
			notes: [...(prev.notes || []), note],
			decks: (prev.decks || []).map((deck) =>
				deck.deckId === deckId
					? { ...deck, cards: [...deck.cards, newCard] }
					: deck
			),
		}));
	};

	// A cloze note and one card per cloze number in `text`
	const addClozeNote = (deckId, text, extra = '') => {
		const { note, cards } = newClozeNoteAndCards(text, extra);
		if (cards.length === 0) return;
		setAppData((prev) => ({
			...prev,
			notes: [...(prev.notes || []), note],
			decks: (prev.decks || []).map((deck) =>
				deck.deckId === deckId
					? { ...deck, cards: [...deck.cards, ...cards] }
					: deck
			),
		}));
	};

	// Changes the card's note, so a reversed partner card changes with it
	const updateCard = (deckId, cardId, front, back) => {
		setAppData((prev) => setCardText(prev, deckId, cardId, front, back));
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

			// Only basic cards whose note has no reversed card yet
			const cardsToDuplicate = deck.cards.filter(canReverse);

			if (cardsToDuplicate.length === 0) return prev;

			// A new card for the other side of each one's note
			const newCards = cardsToDuplicate.map((card, idx) =>
				reversedCard(card, `${now}-${idx}`, now)
			);

			return {
				...prev,
				decks: (prev.decks || []).map((d) =>
					d.deckId === deckId
						? { ...d, cards: [...d.cards, ...newCards] }
						: d
				),
			};
		});
	};

	// Move cards (from any deck) into a target deck. Pass either
	// { deckId } for an existing deck, or { newDeck: { deckName, parentFolderId } }
	// to create the deck in the same update. Returns the target deckId.
	const moveCards = (cardIds, target) => {
		const ids = new Set(cardIds);
		const targetDeckId =
			target.deckId ??
			`${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

		setAppData((prev) => {
			const decks = prev.decks || [];
			const moving = [];
			let stripped = decks.map((deck) => {
				if (deck.deckId === targetDeckId) return deck;
				if (!deck.cards.some((c) => ids.has(c.cardId))) return deck;
				return {
					...deck,
					cards: deck.cards.filter((card) => {
						if (ids.has(card.cardId)) {
							moving.push(card);
							return false;
						}
						return true;
					}),
				};
			});

			if (target.newDeck) {
				stripped = [
					...stripped,
					{
						deckId: targetDeckId,
						deckName: target.newDeck.deckName,
						deckSymbol: DEFAULT_DECK_ICON,
						deckColor: DEFAULT_CONTAINER_COLOR,
						parentFolderId: target.newDeck.parentFolderId ?? null,
						createdAt: Date.now(),
						cards: [],
					},
				];
			}

			return {
				...prev,
				decks: stripped.map((deck) =>
					deck.deckId === targetDeckId
						? { ...deck, cards: [...deck.cards, ...moving] }
						: deck
				),
			};
		});

		return targetDeckId;
	};

	// Delete cards from any deck. A surviving partner keeps the note and can
	// be reverse-duplicated again; a note with no cards left is dropped.
	const deleteCards = (cardIds) => {
		const ids = new Set(cardIds);
		setAppData((prev) => ({
			...prev,
			decks: (prev.decks || []).map((deck) =>
				deck.cards.some((c) => ids.has(c.cardId))
					? {
							...deck,
							cards: deck.cards.filter(
								(card) => !ids.has(card.cardId)
							),
						}
					: deck
			),
		}));
	};

	const addFolder = (
		folderName,
		folderSymbol = DEFAULT_FOLDER_ICON,
		parentFolderId = null,
		folderColor = DEFAULT_CONTAINER_COLOR
	) => {
		const newFolder = {
			folderId: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
			folderName,
			folderSymbol,
			folderColor,
			parentFolderId,
			createdAt: Date.now(),
			updatedAt: Date.now(),
		};
		setAppData((prev) => ({
			...prev,
			folders: [...(prev.folders || []), newFolder],
		}));
	};

	const updateFolder = (folderId, folderName, folderSymbol, folderColor) => {
		setAppData((prev) => ({
			...prev,
			folders: (prev.folders || []).map((folder) =>
				folder.folderId === folderId
					? {
							...folder,
							folderName,
							folderSymbol,
							folderColor,
							updatedAt: Date.now(),
						}
					: folder
			),
		}));
	};

	const deleteFolder = (folderId) => {
		setAppData((prev) => ({
			...prev,
			folders: (prev.folders || []).filter(
				(folder) => folder.folderId !== folderId
			),
		}));
	};

	const reorderContainers = (sourceIndex, destinationIndex, items) => {
		if (sourceIndex === destinationIndex) return;

		setAppData((prev) => {
			const item = items[sourceIndex];
			if (item.type === 'folder') {
				const folders = [...(prev.folders || [])];
				const sourceFolderIndex = folders.findIndex(
					(f) => f.folderId === item.id
				);
				const destFolderIndex = folders.findIndex(
					(f) => f.folderId === items[destinationIndex].id
				);
				if (sourceFolderIndex !== -1 && destFolderIndex !== -1) {
					const [removed] = folders.splice(sourceFolderIndex, 1);
					folders.splice(destFolderIndex, 0, removed);
					return { ...prev, folders };
				}
			} else if (item.type === 'deck') {
				const decks = [...(prev.decks || [])];
				const sourceDeckIndex = decks.findIndex(
					(d) => d.deckId === item.id
				);
				const destDeckIndex = decks.findIndex(
					(d) => d.deckId === items[destinationIndex].id
				);
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
		addClozeNote,
		updateCard,
		deleteCard,
		toggleCardFlag,
		toggleCardStar,
		duplicateCardsReversed,
		moveCards,
		deleteCards,
		addFolder,
		updateFolder,
		deleteFolder,
		reorderContainers,
		toggleArchiveDeck,
	};
}
