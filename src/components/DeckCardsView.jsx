import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
	Plus,
	Play,
	ArrowLeft,
	Search,
	BookOpen,
	Copy,
	Target,
	BarChart3,
	ArrowUpDown,
	ArrowUp,
	ArrowDown,
	Filter,
	X,
	FolderPlus,
	Folder,
	FileUp,
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

export default function DeckCardsView({ onEditCard, onStartReview }) {
	const { deckId } = useParams();
	const navigate = useNavigate();
	const { appData } = useAppData();
	const {
		addCard,
		deleteCard,
		toggleCardFlag,
		toggleCardStar,
		duplicateCardsReversed,
		moveDeck,
	} = useDeckOperations();
	const { showConfirmation, showSuccess, showError } = useNotification();

	const [newCardFront, setNewCardFront] = useState('');
	const [newCardBack, setNewCardBack] = useState('');
	const [showNewCardForm, setShowNewCardForm] = useState(false);
	const [cardSearchTerm, setCardSearchTerm] = useState('');
	const [sortBy, setSortBy] = useState('default');
	const [sortDirection, setSortDirection] = useState('desc');
	const [filterBy, setFilterBy] = useState('all');
	const [showMoveDialog, setShowMoveDialog] = useState(false);

	const selectedDeck = appData.decks?.find((d) => d.deckId === deckId);

	// Get sorted and filtered cards
	const getSortedAndFilteredCards = () => {
		if (!selectedDeck) return [];

		let cards = [...selectedDeck.cards];

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

	const handleAddCard = () => {
		if (newCardFront.trim() && newCardBack.trim()) {
			addCard(deckId, newCardFront.trim(), newCardBack.trim());
			setNewCardFront('');
			setNewCardBack('');
			setShowNewCardForm(false);
		}
	};

	const handleDeleteCard = async (deckId, cardId) => {
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
	};

	const handleDuplicateCardsReversed = async () => {
		if (!selectedDeck || selectedDeck.cards.length === 0) {
			return;
		}

		const numWithoutPartnerCards = selectedDeck.cards.filter(
			(card) => !card.partnerCardId
		).length;

		let confirmMessage = `This will create ${numWithoutPartnerCards} new card(s) with reversed front/back values`;
		if (numWithoutPartnerCards !== selectedDeck.cards.length) {
			confirmMessage += ` (${
				selectedDeck.cards.length - numWithoutPartnerCards
			} card(s) already have a partner card)`;
		}
		confirmMessage += `. Continue?`;

		const confirmed = await showConfirmation({
			title: 'Duplicate Cards (Reversed)',
			message: confirmMessage,
			confirmText: 'Duplicate',
			cancelText: 'Cancel',
			type: 'info',
		});

		if (confirmed) {
			duplicateCardsReversed(deckId);
		}
	};

	const handleImportCards = async (event) => {
		const file = event.target.files?.[0];
		if (!file) {
			return;
		}

		event.target.value = '';

		try {
			const text = await file.text();
			const lines = text.split('\n').filter((line) => line.trim());

			if (lines.length === 0) {
				showError('The file is empty.', 'Import Failed');
				return;
			}

			let importedCount = 0;
			let skippedCount = 0;

			for (const line of lines) {
				const columns = line.split('\t');

				if (columns.length < 2) {
					skippedCount++;
					continue;
				}

				const front = columns[0].trim();
				const back = columns[1].trim();

				if (front && back) {
					addCard(deckId, front, back);
					importedCount++;
				} else {
					skippedCount++;
				}
			}

			if (importedCount > 0) {
				showSuccess(
					`Successfully imported ${importedCount} card(s)${
						skippedCount > 0
							? `. ${skippedCount} row(s) were skipped.`
							: ''
					}`,
					'Import Complete'
				);
			} else {
				showError(
					'No cards were imported. Please check that your TSV file has 2 columns (front and back) separated by tabs.',
					'Import Failed'
				);
			}
		} catch (error) {
			showError(
				`Failed to import cards: ${error.message}`,
				'Import Failed'
			);
		}
	};

	const handleBack = () => {
		if (selectedDeck?.parentFolderId) {
			navigate(`/folder/${selectedDeck.parentFolderId}`);
		} else {
			navigate('/');
		}
	};

	// Build folder tree for selection (excluding current deck's folder to prevent circular moves)
	const buildFolderOptions = () => {
		const options = [{ id: null, name: 'Root (No Folder)', level: 0 }];

		const addFolderRecursive = (
			folderId,
			level = 0,
			excludeFolderId = null
		) => {
			const folders = (appData.folders || []).filter(
				(f) =>
					f.parentFolderId === folderId &&
					f.folderId !== excludeFolderId
			);

			folders.forEach((folder) => {
				const indent = '  '.repeat(level);
				options.push({
					id: folder.folderId,
					name: `${indent}${folder.folderSymbol || '📁'} ${
						folder.folderName
					}`,
					level: level + 1,
				});
				addFolderRecursive(folder.folderId, level + 1, excludeFolderId);
			});
		};

		// Start from root, excluding current folder if deck is in one
		addFolderRecursive(null, 0, selectedDeck?.parentFolderId);

		return options;
	};

	const handleMoveDeck = async (targetFolderId) => {
		if (targetFolderId === selectedDeck?.parentFolderId) {
			showError('Deck is already in this folder.', 'Move Failed');
			setShowMoveDialog(false);
			return;
		}

		moveDeck(deckId, targetFolderId);
		setShowMoveDialog(false);
		showSuccess('Deck moved successfully.', 'Move Complete');

		// Navigate to the new location after a brief delay
		setTimeout(() => {
			if (targetFolderId) {
				navigate(`/folder/${targetFolderId}`);
			} else {
				navigate('/');
			}
		}, 500);
	};

	if (!selectedDeck) {
		return (
			<div className="py-12 text-center">
				<div className="text-6xl mb-4">📚</div>
				<p className="text-lg text-gray-500 dark:text-gray-400 mb-2">
					Deck not found
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

			<Breadcrumbs deckId={deckId} deckName={selectedDeck.deckName} />

			<div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 p-6 hover:shadow-xl transition-shadow duration-300">
				<div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
					<div className="flex items-center gap-3">
						<span className="text-4xl">
							{selectedDeck.deckSymbol || '📚'}
						</span>
						<div>
							<h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
								{selectedDeck.deckName}
							</h2>
							<p className="text-sm text-gray-600 dark:text-slate-400">
								{selectedDeck.cards.length} card(s)
							</p>
						</div>
					</div>
					<div className="flex items-center gap-2 flex-wrap">
						<input
							type="file"
							accept=".tsv,.txt"
							onChange={handleImportCards}
							className="hidden"
							id="import-cards-input"
						/>
						<label
							htmlFor="import-cards-input"
							className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-3 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 font-medium rounded-xl transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300 cursor-pointer"
							title="Import cards from a TSV file (2 columns: front and back)"
						>
							<FileUp className="h-5 w-5" />
							<span className="hidden lg:inline">
								Import Cards
							</span>
						</label>
						<button
							onClick={() => setShowMoveDialog(true)}
							className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-3 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 font-medium rounded-xl transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
							title="Move this deck to a different folder"
						>
							<FolderPlus className="h-5 w-5" />
							<span className="hidden lg:inline">
								Move to Folder
							</span>
						</button>
						{selectedDeck.cards.length > 0 && (
							<button
								onClick={handleDuplicateCardsReversed}
								className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-3 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 font-medium rounded-xl transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
								title="Duplicate all cards with reversed front/back"
							>
								<Copy className="h-5 w-5" />
								<span className="hidden lg:inline">
									Duplicate Reversed
								</span>
							</button>
						)}
						{onStartReview && (
							<button
								onClick={() => onStartReview(deckId)}
								className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-linear-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
							>
								<Play className="h-5 w-5" />
								<span className="hidden lg:inline">
									Study Now
								</span>
							</button>
						)}
					</div>
				</div>

				{/* Sort & Filter Toolbar */}
				{selectedDeck.cards.length > 0 && (
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
								{selectedDeck.cards.length} card(s)
							</div>
						)}
					</div>
				)}

				{/* Add Card Form */}
				{showNewCardForm ? (
					<div className="mb-6 rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-700 p-6 bg-gray-50 dark:bg-slate-700/50">
						<h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-slate-100">
							Add New Card
						</h3>
						<div className="space-y-4">
							<input
								type="text"
								placeholder="Front of card..."
								value={newCardFront}
								onChange={(e) =>
									setNewCardFront(e.target.value)
								}
								className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200"
							/>
							<textarea
								placeholder="Back of card..."
								value={newCardBack}
								onChange={(e) => setNewCardBack(e.target.value)}
								rows={4}
								className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none transition-all duration-200"
							/>
							<div className="flex gap-3">
								<button
									onClick={handleAddCard}
									className="px-6 py-3 bg-linear-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
								>
									Add Card
								</button>
								<button
									onClick={() => {
										setShowNewCardForm(false);
										setNewCardFront('');
										setNewCardBack('');
									}}
									className="px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 font-medium rounded-xl transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
								>
									Cancel
								</button>
							</div>
						</div>
					</div>
				) : (
					<button
						onClick={() => setShowNewCardForm(true)}
						className="mb-6 flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors duration-200"
					>
						<Plus className="h-5 w-5" />
						Add New Card
					</button>
				)}

				{/* Cards List */}
				<div className="space-y-4">
					{selectedDeck.cards.length === 0 ? (
						<div className="py-12 text-center">
							<div className="text-6xl mb-4">📝</div>
							<p className="text-lg text-gray-500 dark:text-gray-400 mb-2">
								No cards yet
							</p>
							<p className="text-sm text-gray-400 dark:text-gray-500">
								Add your first card to get started!
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
								deckId={deckId}
								onEditCard={onEditCard}
								onDeleteCard={handleDeleteCard}
								onToggleCardStar={toggleCardStar}
								onToggleCardFlag={toggleCardFlag}
							/>
						))
					)}
				</div>
			</div>

			{/* Move to Folder Dialog */}
			{showMoveDialog && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
					<div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
						<div className="flex items-center justify-between mb-4">
							<h3 className="text-xl font-bold text-gray-900 dark:text-slate-100">
								Move Deck to Folder
							</h3>
							<button
								onClick={() => setShowMoveDialog(false)}
								className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
							>
								<X className="h-5 w-5" />
							</button>
						</div>

						<p className="text-sm text-gray-600 dark:text-slate-400 mb-4">
							Select a folder to move "{selectedDeck.deckName}"
							into:
						</p>

						<div className="max-h-64 overflow-y-auto mb-4 border border-gray-200 dark:border-slate-700 rounded-lg">
							{buildFolderOptions().map((option) => (
								<button
									key={option.id || 'root'}
									onClick={() => handleMoveDeck(option.id)}
									className={`w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors border-b border-gray-100 dark:border-slate-700 last:border-b-0 ${
										option.id ===
										selectedDeck?.parentFolderId
											? 'bg-teal-50 dark:bg-teal-900/20'
											: ''
									}`}
									disabled={
										option.id ===
										selectedDeck?.parentFolderId
									}
								>
									<div className="flex items-center gap-2">
										<Folder className="h-4 w-4 text-gray-500 dark:text-slate-400 shrink-0" />
										<span className="text-gray-900 dark:text-slate-100 font-medium">
											{option.name}
										</span>
										{option.id ===
											selectedDeck?.parentFolderId && (
											<span className="ml-auto text-xs text-teal-600 dark:text-teal-400">
												Current
											</span>
										)}
									</div>
								</button>
							))}
							{buildFolderOptions().length === 1 && (
								<div className="px-4 py-3 text-sm text-gray-500 dark:text-slate-400 text-center">
									No other folders available
								</div>
							)}
						</div>

						<div className="flex gap-3">
							<button
								onClick={() => setShowMoveDialog(false)}
								className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 font-medium rounded-lg transition-colors duration-200"
							>
								Cancel
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
