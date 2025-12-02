import { useState } from "react";
import {
	Plus,
	Edit,
	Trash2,
	Play,
	ArrowLeft,
	Search,
	BookOpen,
	GripVertical,
	Flag,
	Copy,
	Upload,
	Eye,
} from "lucide-react";
import { useNotification } from "../hooks/useNotification";
import StudyStatistics from "./StudyStatistics";
import {
	DndContext,
	closestCenter,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function SortableDeckItem({
	deck,
	editingDeckId,
	editingDeckName,
	setEditingDeckId,
	setEditingDeckName,
	handleUpdateDeck,
	handleDeleteDeck,
	onSelectDeck,
	onStartReview,
	isDraggable,
}) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({
		id: deck.deckId,
		disabled: !isDraggable || editingDeckId === deck.deckId,
	});

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : 1,
	};

	return (
		<div
			ref={setNodeRef}
			style={style}
			className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg hover:shadow-2xl border border-gray-100 dark:border-slate-700 p-6 transform hover:-translate-y-1 transition-all duration-300 cursor-pointer group animate-slide-up"
		>
			{editingDeckId === deck.deckId ? (
				<div>
					<input
						type="text"
						value={editingDeckName}
						onChange={(e) => setEditingDeckName(e.target.value)}
						className="mb-4 w-full px-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200"
					/>
					<div className="flex gap-3">
						<button
							onClick={handleUpdateDeck}
							className="flex-1 px-4 py-2 bg-linear-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
						>
							Save
						</button>
						<button
							onClick={() => {
								setEditingDeckId(null);
								setEditingDeckName("");
							}}
							className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 font-medium rounded-xl transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
						>
							Cancel
						</button>
					</div>
				</div>
			) : (
				<>
					{/* Header */}
					<div className="flex items-start justify-between mb-4">
						<div className="flex items-center gap-3 flex-1">
							{isDraggable && (
								<button
									{...attributes}
									{...listeners}
									className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
									aria-label="Drag to reorder"
								>
									<GripVertical className="h-5 w-5" />
								</button>
							)}
							<span className="text-4xl">📚</span>
							<div className="flex-1">
								<h3
									className="text-xl font-bold text-gray-900 dark:text-slate-100 cursor-pointer hover:text-teal-600 dark:hover:text-teal-400 transition-colors duration-200"
									onClick={() => onSelectDeck(deck.deckId)}
								>
									{deck.deckName}
								</h3>
								<p className="text-sm text-gray-600 dark:text-slate-400">
									{deck.cards.length} card(s)
								</p>
							</div>
						</div>
					</div>

					{/* Stats */}
					<div className="grid grid-cols-3 gap-3 mb-4">
						<div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-3">
							<div className="text-2xl font-bold text-orange-600">
								{
									deck.cards.filter(
										(card) => card.whenDue <= Date.now()
									).length
								}
							</div>
							<div className="text-xs text-gray-600 dark:text-slate-400">
								Due
							</div>
						</div>
						<div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-3">
							<div className="text-2xl font-bold text-teal-600">
								{
									deck.cards.filter(
										(card) => card.reviews.length === 0
									).length
								}
							</div>
							<div className="text-xs text-gray-600 dark:text-slate-400">
								New
							</div>
						</div>
						<div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-3">
							<div className="text-2xl font-bold text-green-600">
								{
									deck.cards.filter(
										(card) => card.reviews.length > 0
									).length
								}
							</div>
							<div className="text-xs text-gray-600 dark:text-slate-400">
								Studied
							</div>
						</div>
					</div>

					{/* Progress */}
					<div className="h-2 bg-gray-200 dark:bg-slate-700 rounded-full mb-4 overflow-hidden">
						<div
							className="h-full bg-linear-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-500"
							style={{
								width: `${
									deck.cards.length > 0
										? (deck.cards.filter(
												(card) =>
													card.reviews.length > 0
										  ).length /
												deck.cards.length) *
										  100
										: 0
								}%`,
							}}
						/>
					</div>

					{/* Actions */}
					<div className="flex gap-2">
						<button
							onClick={() => onSelectDeck(deck.deckId)}
							className="flex-1 px-2 sm:px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 font-medium rounded-lg transition-colors duration-200 text-sm sm:text-base flex items-center justify-center gap-1.5"
						>
							<Eye className="h-4 w-4 sm:hidden" />
							<span className="hidden sm:inline">View</span>
						</button>
						<button
							onClick={() => onStartReview(deck.deckId)}
							className="flex-1 px-2 sm:px-3 py-2 bg-linear-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 text-sm sm:text-base flex items-center justify-center gap-1.5"
						>
							<Play className="h-4 w-4 sm:hidden" />
							<span className="hidden sm:inline">Study</span>
						</button>
						<button
							onClick={() => {
								setEditingDeckId(deck.deckId);
								setEditingDeckName(deck.deckName);
							}}
							className="p-2 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors duration-200 opacity-0 sm:opacity-0 group-hover:opacity-100 sm:group-hover:opacity-100"
						>
							<Edit className="h-4 w-4" />
						</button>
						<button
							onClick={() => handleDeleteDeck(deck.deckId)}
							className="p-2 text-gray-600 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors duration-200 opacity-0 sm:opacity-0 group-hover:opacity-100 sm:group-hover:opacity-100"
						>
							<Trash2 className="h-4 w-4" />
						</button>
					</div>
				</>
			)}
		</div>
	);
}

export default function DeckView({
	appData,
	selectedDeckId,
	onSelectDeck,
	onAddDeck,
	onUpdateDeck,
	onDeleteDeck,
	onReorderDecks,
	onAddCard,
	onDeleteCard,
	onEditCard,
	onStartReview,
	onToggleCardFlag,
	onDuplicateCardsReversed,
}) {
	const [newDeckName, setNewDeckName] = useState("");
	const [editingDeckId, setEditingDeckId] = useState(null);
	const [editingDeckName, setEditingDeckName] = useState("");
	const [showNewDeckForm, setShowNewDeckForm] = useState(false);
	const [newCardFront, setNewCardFront] = useState("");
	const [newCardBack, setNewCardBack] = useState("");
	const [showNewCardForm, setShowNewCardForm] = useState(false);
	const [searchTerm, setSearchTerm] = useState("");
	const { showConfirmation, showSuccess, showError } = useNotification();

	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		})
	);

	const selectedDeck = selectedDeckId
		? appData.decks.find((d) => d.deckId === selectedDeckId)
		: null;

	const filteredDecks = appData.decks.filter((deck) => {
		if (!searchTerm) return true;

		const searchLower = searchTerm.toLowerCase();

		// Search deck name
		if (deck.deckName.toLowerCase().includes(searchLower)) {
			return true;
		}

		// Search card content (front and back)
		return deck.cards.some(
			(card) =>
				card.front.toLowerCase().includes(searchLower) ||
				card.back.toLowerCase().includes(searchLower)
		);
	});

	const handleAddDeck = () => {
		if (newDeckName.trim()) {
			onAddDeck(newDeckName.trim());
			setNewDeckName("");
			setShowNewDeckForm(false);
		}
	};

	const handleUpdateDeck = () => {
		if (editingDeckName.trim()) {
			onUpdateDeck(editingDeckId, editingDeckName.trim());
			setEditingDeckId(null);
			setEditingDeckName("");
		}
	};

	const handleDeleteDeck = async (deckId) => {
		const confirmed = await showConfirmation({
			title: "Delete Deck",
			message:
				"Are you sure you want to delete this deck and all its cards?",
			confirmText: "Delete",
			cancelText: "Cancel",
			type: "danger",
		});

		if (confirmed) {
			onDeleteDeck(deckId);
		}
	};

	const handleAddCard = () => {
		if (newCardFront.trim() && newCardBack.trim()) {
			onAddCard(selectedDeckId, newCardFront.trim(), newCardBack.trim());
			setNewCardFront("");
			setNewCardBack("");
			setShowNewCardForm(false);
		}
	};

	const handleDeleteCard = async (cardId) => {
		const confirmed = await showConfirmation({
			title: "Delete Card",
			message: "Are you sure you want to delete this card?",
			confirmText: "Delete",
			cancelText: "Cancel",
			type: "danger",
		});

		if (confirmed) {
			onDeleteCard(selectedDeckId, cardId);
		}
	};

	const handleDuplicateCardsReversed = async () => {
		if (!selectedDeck || selectedDeck.cards.length === 0) {
			return;
		}

		// Check if any cards have a partnerCardId
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
			title: "Duplicate Cards (Reversed)",
			message: confirmMessage,
			confirmText: "Duplicate",
			cancelText: "Cancel",
			type: "info",
		});

		if (confirmed) {
			onDuplicateCardsReversed(selectedDeckId);
		}
	};

	const handleImportCards = async (event) => {
		const file = event.target.files?.[0];
		if (!file) {
			return;
		}

		// Reset the input so the same file can be selected again
		event.target.value = "";

		try {
			const text = await file.text();
			const lines = text.split("\n").filter((line) => line.trim());

			if (lines.length === 0) {
				showError("The file is empty.", "Import Failed");
				return;
			}

			let importedCount = 0;
			let skippedCount = 0;

			for (const line of lines) {
				// Split by tab character
				const columns = line.split("\t");

				if (columns.length < 2) {
					skippedCount++;
					continue;
				}

				const front = columns[0].trim();
				const back = columns[1].trim();

				if (front && back) {
					onAddCard(selectedDeckId, front, back);
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
							: ""
					}`,
					"Import Complete"
				);
			} else {
				showError(
					"No cards were imported. Please check that your TSV file has 2 columns (front and back) separated by tabs.",
					"Import Failed"
				);
			}
		} catch (error) {
			showError(
				`Failed to import cards: ${error.message}`,
				"Import Failed"
			);
		}
	};

	const handleDragEnd = (event) => {
		const { active, over } = event;

		if (!over || active.id === over.id) {
			return;
		}

		// Only allow reordering when there's no search filter
		if (searchTerm) {
			return;
		}

		const oldIndex = appData.decks.findIndex(
			(deck) => deck.deckId === active.id
		);
		const newIndex = appData.decks.findIndex(
			(deck) => deck.deckId === over.id
		);

		if (oldIndex !== -1 && newIndex !== -1) {
			onReorderDecks(oldIndex, newIndex);
		}
	};

	return (
		<div>
			{selectedDeckId && selectedDeck ? (
				// Show cards in selected deck
				<div>
					<div className="mb-6 flex items-center justify-between">
						<button
							onClick={() => onSelectDeck(null)}
							className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors duration-200"
						>
							<ArrowLeft className="h-5 w-5" />
							Back to Decks
						</button>
					</div>

					<div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 p-6 hover:shadow-xl transition-shadow duration-300">
						<div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
							<div className="flex items-center gap-3">
								<span className="text-4xl">📚</span>
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
									<Upload className="h-5 w-5" />
									<span className="hidden sm:inline">
										Import Cards
									</span>
								</label>
								{selectedDeck.cards.length > 0 &&
									onDuplicateCardsReversed && (
										<button
											onClick={
												handleDuplicateCardsReversed
											}
											className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-3 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 font-medium rounded-xl transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
											title="Duplicate all cards with reversed front/back"
										>
											<Copy className="h-5 w-5" />
											<span className="hidden sm:inline">
												Duplicate Reversed
											</span>
										</button>
									)}
								<button
									onClick={() =>
										onStartReview(selectedDeckId)
									}
									className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-linear-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
								>
									<Play className="h-5 w-5" />
									<span className="hidden sm:inline">
										Study Now
									</span>
								</button>
							</div>
						</div>

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
										onChange={(e) =>
											setNewCardBack(e.target.value)
										}
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
												setNewCardFront("");
												setNewCardBack("");
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
							) : (
								selectedDeck.cards.map((card) => {
									const isFlagged = card.isFlagged || false;
									return (
										<div
											key={card.cardId}
											className={`bg-white dark:bg-slate-800 rounded-xl border p-4 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer group ${
												isFlagged
													? "border-orange-300 dark:border-orange-700/50 bg-orange-50/30 dark:bg-orange-900/10"
													: "border-gray-100 dark:border-slate-700"
											}`}
										>
											<div className="flex items-start justify-between">
												<div className="flex-1">
													<div className="mb-2 flex items-start gap-2">
														<div className="flex-1">
															<h4 className="text-sm font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wide mb-1">
																Front
															</h4>
															<p className="text-base text-gray-900 dark:text-slate-100 font-medium">
																{card.front}
															</p>
														</div>
														{isFlagged && (
															<div className="shrink-0 pt-1">
																<Flag className="h-4 w-4 text-orange-500 dark:text-orange-400 fill-current" />
															</div>
														)}
													</div>
													<div className="mb-3">
														<h4 className="text-sm font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wide mb-1">
															Back
														</h4>
														<p className="text-base text-gray-700 dark:text-slate-300">
															{card.back}
														</p>
													</div>
													<div className="flex items-center gap-2">
														<span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 text-xs font-medium rounded-md">
															<BookOpen className="h-3 w-3" />
															{
																card.reviews
																	.length
															}{" "}
															reviews
														</span>
														{isFlagged && (
															<span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs font-medium rounded-md">
																<Flag className="h-3 w-3 fill-current" />
																Flagged
															</span>
														)}
													</div>
												</div>
												<div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
													{onToggleCardFlag && (
														<button
															onClick={(e) => {
																e.stopPropagation();
																onToggleCardFlag(
																	selectedDeckId,
																	card.cardId
																);
															}}
															className={`p-2 rounded-lg transition-colors duration-200 ${
																isFlagged
																	? "text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20"
																	: "text-gray-600 dark:text-slate-400 hover:text-orange-500 dark:hover:text-orange-400 hover:bg-gray-100 dark:hover:bg-slate-700"
															}`}
															title={
																isFlagged
																	? "Unflag card"
																	: "Flag card"
															}
														>
															<Flag
																className={`h-4 w-4 ${
																	isFlagged
																		? "fill-current"
																		: ""
																}`}
															/>
														</button>
													)}
													<button
														onClick={() =>
															onEditCard(
																selectedDeckId,
																card.cardId
															)
														}
														className="p-2 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors duration-200"
													>
														<Edit className="h-4 w-4" />
													</button>
													<button
														onClick={() =>
															handleDeleteCard(
																card.cardId
															)
														}
														className="p-2 text-gray-600 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors duration-200"
													>
														<Trash2 className="h-4 w-4" />
													</button>
												</div>
											</div>
										</div>
									);
								})
							)}
						</div>
					</div>
				</div>
			) : (
				// Show list of decks
				<div>
					{/* Statistics Hero Section */}
					<StudyStatistics appData={appData} />

					{/* Search */}
					<div className="mb-6 flex items-center gap-3">
						<div className="relative flex-1">
							<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-slate-500" />
							<input
								type="text"
								placeholder="Search decks and cards..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200"
							/>
						</div>
					</div>

					{/* Add Deck Form */}
					{showNewDeckForm ? (
						<div className="mb-6 rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-700 p-6 bg-gray-50 dark:bg-slate-700/50">
							<h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-slate-100">
								Create New Deck
							</h3>
							<div className="flex gap-3">
								<input
									type="text"
									placeholder="Deck name..."
									value={newDeckName}
									onChange={(e) =>
										setNewDeckName(e.target.value)
									}
									className="flex-1 px-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200"
								/>
								<button
									onClick={handleAddDeck}
									className="px-6 py-3 bg-linear-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
								>
									Create
								</button>
								<button
									onClick={() => {
										setShowNewDeckForm(false);
										setNewDeckName("");
									}}
									className="px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 font-medium rounded-xl transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
								>
									Cancel
								</button>
							</div>
						</div>
					) : (
						<button
							onClick={() => setShowNewDeckForm(true)}
							className="mb-6 flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors duration-200"
						>
							<Plus className="h-5 w-5" />
							Create New Deck
						</button>
					)}

					{/* Decks Grid */}
					{filteredDecks.length === 0 ? (
						<div className="col-span-full py-12 text-center animate-fade-in">
							<div className="text-6xl mb-4">📚</div>
							<p className="text-lg text-gray-500 dark:text-gray-400 mb-2">
								{searchTerm
									? "No decks found matching your search."
									: "No decks yet. Create your first deck!"}
							</p>
							{!searchTerm && (
								<p className="text-sm text-gray-400 dark:text-gray-500">
									Start building your knowledge base!
								</p>
							)}
						</div>
					) : (
						<DndContext
							sensors={sensors}
							collisionDetection={closestCenter}
							onDragEnd={handleDragEnd}
						>
							<SortableContext
								items={filteredDecks.map((deck) => deck.deckId)}
							>
								<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
									{filteredDecks.map((deck) => (
										<SortableDeckItem
											key={deck.deckId}
											deck={deck}
											editingDeckId={editingDeckId}
											editingDeckName={editingDeckName}
											setEditingDeckId={setEditingDeckId}
											setEditingDeckName={
												setEditingDeckName
											}
											handleUpdateDeck={handleUpdateDeck}
											handleDeleteDeck={handleDeleteDeck}
											onSelectDeck={onSelectDeck}
											onStartReview={onStartReview}
											isDraggable={!searchTerm}
										/>
									))}
								</div>
							</SortableContext>
						</DndContext>
					)}
				</div>
			)}
		</div>
	);
}
