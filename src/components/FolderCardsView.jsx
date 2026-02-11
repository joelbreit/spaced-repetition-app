import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
	ArrowLeft,
	Search,
	BookOpen,
	Target,
	BarChart3,
	ArrowUpDown,
	ArrowUp,
	ArrowDown,
	Filter,
	X,
} from 'lucide-react';
import { useNotification } from '../hooks/useNotification';
import { useAppData } from '../contexts/AppDataContext';
import { useDeckOperations } from '../hooks/useDeckOperations';
import {
	calculateLearningStrength,
	getPerDayReviewRate,
} from '../services/cardCalculations';
import CardListItem from './CardListItem';
import Breadcrumbs from './Breadcrumbs';

export default function FolderCardsView({ onEditCard }) {
	const { folderId } = useParams();
	const navigate = useNavigate();
	const { appData } = useAppData();
	const { deleteCard, toggleCardFlag, toggleCardStar } = useDeckOperations();
	const { showConfirmation } = useNotification();

	const [cardSearchTerm, setCardSearchTerm] = useState('');
	const [sortBy, setSortBy] = useState('default');
	const [sortDirection, setSortDirection] = useState('desc');
	const [filterBy, setFilterBy] = useState('all');

	// Handle special "root" folderId
	const effectiveFolderId = folderId === 'root' ? null : folderId;

	// Get folder info
	const folder = effectiveFolderId
		? appData.folders?.find((f) => f.folderId === effectiveFolderId)
		: null;

	// Helper function to recursively get all non-archived decks in a folder and its subfolders
	const getAllNonArchivedDecksInFolder = (targetFolderId) => {
		// Root level folder - filter out archived decks
		if (!targetFolderId) {
			return (appData.decks || []).filter(
				(d) => !(d.isArchived || false)
			);
		}

		const allDecks = [];

		// Get direct decks in this folder (excluding archived)
		const directDecks = (appData.decks || []).filter(
			(d) =>
				d.parentFolderId === targetFolderId && !(d.isArchived || false)
		);
		allDecks.push(...directDecks);

		// Get subfolders
		const subfolders = (appData.folders || []).filter(
			(f) => f.parentFolderId === targetFolderId
		);

		// Recursively get decks from subfolders
		subfolders.forEach((subfolder) => {
			const subfolderDecks = getAllNonArchivedDecksInFolder(
				subfolder.folderId
			);
			allDecks.push(...subfolderDecks);
		});

		return allDecks;
	};

	// Get all decks in the folder
	const folderDecks = getAllNonArchivedDecksInFolder(effectiveFolderId);

	// Collect all cards from all decks with source deck metadata
	const allCards = folderDecks.flatMap((deck) =>
		deck.cards.map((card) => ({
			...card,
			sourceDeckId: deck.deckId,
			sourceDeckName: deck.deckName,
			sourceDeckSymbol: deck.deckSymbol || '📚',
		}))
	);

	// Get sorted and filtered cards
	const getSortedAndFilteredCards = () => {
		let cards = [...allCards];

		// Apply search filter
		if (cardSearchTerm) {
			const searchLower = cardSearchTerm.toLowerCase();
			cards = cards.filter(
				(card) =>
					card.front.toLowerCase().includes(searchLower) ||
					card.back.toLowerCase().includes(searchLower)
			);
		}

		// Apply category filter
		switch (filterBy) {
			case 'new':
				cards = cards.filter((card) => card.reviews.length === 0);
				break;
			case 'due':
				cards = cards.filter(
					(card) =>
						card.whenDue <= Date.now() && card.reviews.length > 0
				);
				break;
			case 'learned':
				cards = cards.filter(
					(card) =>
						card.reviews.length > 0 && card.whenDue > Date.now()
				);
				break;
			case 'flagged':
				cards = cards.filter((card) => card.isFlagged);
				break;
			case 'starred':
				cards = cards.filter((card) => card.isStarred);
				break;
			default:
				break;
		}

		// Apply sorting
		if (sortBy !== 'default') {
			cards.sort((a, b) => {
				let aValue, bValue;

				switch (sortBy) {
					case 'reviews':
						aValue = a.reviews.length;
						bValue = b.reviews.length;
						break;
					case 'mastery':
						aValue = calculateLearningStrength(a);
						bValue = calculateLearningStrength(b);
						break;
					case 'burden':
						aValue = getPerDayReviewRate(a);
						bValue = getPerDayReviewRate(b);
						break;
					default:
						return 0;
				}

				if (sortDirection === 'asc') {
					return aValue - bValue;
				} else {
					return bValue - aValue;
				}
			});
		}

		return cards;
	};

	const sortedAndFilteredCards = getSortedAndFilteredCards();

	const toggleSortDirection = () => {
		setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
	};

	const handleSortChange = (newSortBy) => {
		if (sortBy === newSortBy) {
			toggleSortDirection();
		} else {
			setSortBy(newSortBy);
			setSortDirection('desc');
		}
	};

	const clearFilters = () => {
		setCardSearchTerm('');
		setSortBy('default');
		setSortDirection('desc');
		setFilterBy('all');
	};

	const hasActiveFilters =
		cardSearchTerm || sortBy !== 'default' || filterBy !== 'all';

	const handleDeleteCard = async (deckId, cardId) => {
		// Find the card to check for partner
		const card = allCards.find((c) => c.cardId === cardId);
		const hasPartner = card?.partnerCardId;

		// Find the partner card if it exists (could be in any deck)
		let partnerCard = null;
		let partnerDeckId = null;
		if (hasPartner) {
			for (const deck of appData.decks || []) {
				const found = deck.cards.find(
					(c) => c.cardId === card.partnerCardId
				);
				if (found) {
					partnerCard = found;
					partnerDeckId = deck.deckId;
					break;
				}
			}
		}

		if (hasPartner && partnerCard) {
			// Ask if they want to delete the partner card too
			const deletePartner = await showConfirmation({
				title: 'Delete Card',
				message:
					'This card has a partner card (reversed front/back). Do you want to delete both cards?',
				confirmText: 'Delete Both',
				cancelText: 'Delete Only This Card',
				type: 'danger',
			});

			if (deletePartner === null) {
				// User cancelled (clicked outside or pressed escape)
				return;
			}

			deleteCard(deckId, cardId);
			if (deletePartner) {
				deleteCard(partnerDeckId, card.partnerCardId);
			}
		} else {
			// No partner, just confirm deletion normally
			const confirmed = await showConfirmation({
				title: 'Delete Card',
				message: 'Are you sure you want to delete this card?',
				confirmText: 'Delete',
				cancelText: 'Cancel',
				type: 'danger',
			});

			if (confirmed) {
				deleteCard(deckId, cardId);
			}
		}
	};

	const handleBack = () => {
		if (effectiveFolderId) {
			navigate(`/folder/${effectiveFolderId}`);
		} else {
			navigate('/');
		}
	};

	// Show "not found" if folder doesn't exist (except for root)
	if (effectiveFolderId && !folder) {
		return (
			<div className="py-12 text-center">
				<div className="text-6xl mb-4">📁</div>
				<p className="text-lg text-gray-500 dark:text-gray-400 mb-2">
					Folder not found
				</p>
				<button
					onClick={() => navigate('/')}
					className="text-sm text-teal-600 dark:text-teal-400 hover:underline"
				>
					Return to home
				</button>
			</div>
		);
	}

	const folderName = folder ? folder.folderName : 'All Decks';
	const folderSymbol = folder ? folder.folderSymbol || '📁' : '📚';

	return (
		<div>
			<div className="mb-6 flex items-center justify-between">
				<button
					onClick={handleBack}
					className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors duration-200"
				>
					<ArrowLeft className="h-5 w-5" />
					Back
				</button>
			</div>

			<Breadcrumbs folderId={effectiveFolderId} />

			<div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 p-6 hover:shadow-xl transition-shadow duration-300">
				<div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
					<div className="flex items-center gap-3">
						<span className="text-4xl">{folderSymbol}</span>
						<div>
							<h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
								{folderName} - All Cards
							</h2>
							<p className="text-sm text-gray-600 dark:text-slate-400">
								{allCards.length} card(s) across{' '}
								{folderDecks.length} deck(s)
							</p>
						</div>
					</div>
				</div>

				{/* Sort & Filter Toolbar */}
				{allCards.length > 0 && (
					<div className="mb-6 space-y-3">
						{/* Search and Clear */}
						<div className="flex items-center gap-3">
							<div className="relative flex-1">
								<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-slate-500" />
								<input
									type="text"
									placeholder="Search cards..."
									value={cardSearchTerm}
									onChange={(e) =>
										setCardSearchTerm(e.target.value)
									}
									className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200 text-sm"
								/>
							</div>
							{hasActiveFilters && (
								<button
									onClick={clearFilters}
									className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors duration-200"
								>
									<X className="h-4 w-4" />
									Clear
								</button>
							)}
						</div>

						{/* Sort & Filter Controls */}
						<div className="flex flex-wrap items-center gap-2">
							{/* Filter Dropdown */}
							<div className="flex items-center gap-1.5">
								<Filter className="h-4 w-4 text-gray-500 dark:text-slate-500" />
								<select
									value={filterBy}
									onChange={(e) =>
										setFilterBy(e.target.value)
									}
									className="px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-700 dark:text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent cursor-pointer"
								>
									<option value="all">All Cards</option>
									<option value="new">New</option>
									<option value="due">Due</option>
									<option value="learned">Learned</option>
									<option value="flagged">Flagged</option>
									<option value="starred">Starred</option>
								</select>
							</div>

							<div className="h-5 w-px bg-gray-200 dark:bg-slate-600 mx-1" />

							{/* Sort Options */}
							<div className="flex items-center gap-1.5">
								<ArrowUpDown className="h-4 w-4 text-gray-500 dark:text-slate-500" />
								<span className="text-sm text-gray-500 dark:text-slate-500">
									Sort:
								</span>
							</div>

							<button
								onClick={() => handleSortChange('reviews')}
								className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200 ${
									sortBy === 'reviews'
										? 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400'
										: 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-600'
								}`}
							>
								<BookOpen className="h-3.5 w-3.5" />
								Reviews
								{sortBy === 'reviews' &&
									(sortDirection === 'asc' ? (
										<ArrowUp className="h-3.5 w-3.5" />
									) : (
										<ArrowDown className="h-3.5 w-3.5" />
									))}
							</button>

							<button
								onClick={() => handleSortChange('mastery')}
								className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200 ${
									sortBy === 'mastery'
										? 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400'
										: 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-600'
								}`}
							>
								<Target className="h-3.5 w-3.5" />
								Mastery
								{sortBy === 'mastery' &&
									(sortDirection === 'asc' ? (
										<ArrowUp className="h-3.5 w-3.5" />
									) : (
										<ArrowDown className="h-3.5 w-3.5" />
									))}
							</button>

							<button
								onClick={() => handleSortChange('burden')}
								className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200 ${
									sortBy === 'burden'
										? 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400'
										: 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-600'
								}`}
							>
								<BarChart3 className="h-3.5 w-3.5" />
								Burden
								{sortBy === 'burden' &&
									(sortDirection === 'asc' ? (
										<ArrowUp className="h-3.5 w-3.5" />
									) : (
										<ArrowDown className="h-3.5 w-3.5" />
									))}
							</button>
						</div>

						{/* Results count */}
						{hasActiveFilters && (
							<div className="text-sm text-gray-500 dark:text-slate-500">
								Showing {sortedAndFilteredCards.length} of{' '}
								{allCards.length} card(s)
							</div>
						)}
					</div>
				)}

				{/* Cards List */}
				<div className="space-y-4">
					{allCards.length === 0 ? (
						<div className="py-12 text-center">
							<div className="text-6xl mb-4">📝</div>
							<p className="text-lg text-gray-500 dark:text-gray-400 mb-2">
								No cards in this folder
							</p>
							<p className="text-sm text-gray-400 dark:text-gray-500">
								Add decks with cards to see them here.
							</p>
						</div>
					) : sortedAndFilteredCards.length === 0 ? (
						<div className="py-12 text-center">
							<div className="text-6xl mb-4">🔍</div>
							<p className="text-lg text-gray-500 dark:text-gray-400 mb-2">
								No cards match your filters
							</p>
							<button
								onClick={clearFilters}
								className="text-sm text-teal-600 dark:text-teal-400 hover:underline"
							>
								Clear all filters
							</button>
						</div>
					) : (
						sortedAndFilteredCards.map((card) => (
							<CardListItem
								key={card.cardId}
								card={card}
								deckId={card.sourceDeckId}
								onEditCard={onEditCard}
								onDeleteCard={handleDeleteCard}
								onToggleCardStar={toggleCardStar}
								onToggleCardFlag={toggleCardFlag}
								deckName={card.sourceDeckName}
								deckSymbol={card.sourceDeckSymbol}
							/>
						))
					)}
				</div>
			</div>
		</div>
	);
}
