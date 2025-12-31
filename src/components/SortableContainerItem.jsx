import { useNavigate } from "react-router-dom";
import { Edit, Trash2, Play, Eye, GripVertical, Folder } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
	calculateLearningStrength,
	getPerDayReviewRate,
} from "../services/cardCalculations";

function getMasteryColor(mastery) {
	if (mastery < 25) return "text-red-500 dark:text-red-400";
	if (mastery < 50) return "text-orange-500 dark:text-orange-400";
	if (mastery < 75) return "text-yellow-500 dark:text-yellow-400";
	return "text-green-500 dark:text-green-400";
}

function getMasteryDotColor(mastery) {
	if (mastery < 25) return "bg-red-500";
	if (mastery < 50) return "bg-orange-500";
	if (mastery < 75) return "bg-yellow-500";
	return "bg-green-500";
}

export default function SortableContainerItem({
	item,
	type, // "folder" or "deck"
	editingId,
	editingName,
	editingSymbol,
	setEditingId,
	setEditingName,
	setEditingSymbol,
	handleUpdate,
	handleDelete,
	onStartReview,
	isDraggable,
	appData, // Needed to count folder contents
}) {
	const navigate = useNavigate();
	const isFolder = type === "folder";
	const isDeck = type === "deck";
	const isEditing = editingId === item.id;

	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({
		id: item.id,
		disabled: !isDraggable || isEditing,
	});

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : 1,
	};

	// For decks, calculate stats
	const deckStats =
		isDeck && item.cards
			? {
					averageLearningStrength:
						item.cards.length > 0
							? Math.round(
									item.cards.reduce(
										(sum, card) =>
											sum +
											calculateLearningStrength(card),
										0
									) / item.cards.length
							  )
							: 0,
					aggregateReviewRate:
						item.cards.length > 0
							? item.cards
									.filter(
										(card) =>
											card.reviews &&
											card.reviews.length > 0
									)
									.reduce(
										(sum, card) =>
											sum + getPerDayReviewRate(card),
										0
									)
							: 0,
					dueCount: item.cards.filter(
						(card) =>
							card.whenDue <= Date.now() &&
							card.reviews.length > 0
					).length,
					newCount: item.cards.filter(
						(card) => card.reviews.length === 0
					).length,
					learnedCount: item.cards.filter(
						(card) =>
							card.reviews.length > 0 && card.whenDue > Date.now()
					).length,
					reviewedCount: item.cards.filter(
						(card) => card.reviews.length > 0
					).length,
			  }
			: null;

	// Helper function to recursively get all decks in a folder and its subfolders
	const getAllDecksInFolder = (folderId) => {
		const allDecks = [];

		// Get direct decks in this folder
		const directDecks = (appData.decks || []).filter(
			(d) => d.parentFolderId === folderId
		);
		allDecks.push(...directDecks);

		// Get subfolders
		const subfolders = (appData.folders || []).filter(
			(f) => f.parentFolderId === folderId
		);

		// Recursively get decks from subfolders
		subfolders.forEach((subfolder) => {
			const subfolderDecks = getAllDecksInFolder(subfolder.folderId);
			allDecks.push(...subfolderDecks);
		});

		return allDecks;
	};

	// For folders, count contents and aggregate stats
	const folderStats = isFolder
		? (() => {
				const folderCount =
					appData.folders?.filter((f) => f.parentFolderId === item.id)
						.length || 0;

				// Get all decks recursively
				const allDecksInFolder = getAllDecksInFolder(item.id);

				// Collect all cards from all decks
				const allCards = [];
				allDecksInFolder.forEach((deck) => {
					if (deck.cards && deck.cards.length > 0) {
						allCards.push(...deck.cards);
					}
				});

				// Calculate aggregated stats
				const stats = {
					folderCount,
					deckCount: allDecksInFolder.length,
					totalCards: allCards.length,
					averageLearningStrength:
						allCards.length > 0
							? Math.round(
									allCards.reduce(
										(sum, card) =>
											sum +
											calculateLearningStrength(card),
										0
									) / allCards.length
							  )
							: 0,
					aggregateReviewRate:
						allCards.length > 0
							? allCards
									.filter(
										(card) =>
											card.reviews &&
											card.reviews.length > 0
									)
									.reduce(
										(sum, card) =>
											sum + getPerDayReviewRate(card),
										0
									)
							: 0,
					dueCount: allCards.filter(
						(card) =>
							card.whenDue <= Date.now() &&
							card.reviews &&
							card.reviews.length > 0
					).length,
					newCount: allCards.filter(
						(card) => !card.reviews || card.reviews.length === 0
					).length,
					learnedCount: allCards.filter(
						(card) =>
							card.reviews &&
							card.reviews.length > 0 &&
							card.whenDue > Date.now()
					).length,
					reviewedCount: allCards.filter(
						(card) => card.reviews && card.reviews.length > 0
					).length,
				};

				return stats;
		  })()
		: null;

	const handleClick = () => {
		if (isEditing) return;
		if (isFolder) {
			navigate(`/folder/${item.id}`);
		} else if (isDeck) {
			navigate(`/deck/${item.id}`);
		}
	};

	const handleStartReview = (e) => {
		e.stopPropagation();
		if (onStartReview && isDeck) {
			onStartReview(item.id);
		}
	};

	return (
		<div
			ref={setNodeRef}
			style={style}
			className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg hover:shadow-2xl border border-gray-100 dark:border-slate-700 p-6 transform hover:-translate-y-1 transition-all duration-300 cursor-pointer group animate-slide-up"
		>
			{isEditing ? (
				<div>
					<div className="flex gap-3 mb-4">
						<input
							type="text"
							value={editingSymbol}
							onChange={(e) => {
								const value = e.target.value;
								const firstChar = [...value][0] || "";
								setEditingSymbol(firstChar);
							}}
							placeholder={isFolder ? "📁" : "📚"}
							className="w-16 px-3 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-slate-100 text-center text-2xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200"
							title="Enter an emoji or single character"
						/>
						<input
							type="text"
							value={editingName}
							onChange={(e) => setEditingName(e.target.value)}
							placeholder={
								isFolder ? "Folder name..." : "Deck name..."
							}
							className="flex-1 px-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200"
						/>
					</div>
					<div className="flex gap-3">
						<button
							onClick={handleUpdate}
							className="flex-1 px-4 py-2 bg-linear-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
						>
							Save
						</button>
						<button
							onClick={() => {
								setEditingId(null);
								setEditingName("");
								setEditingSymbol("");
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
							<span className="text-4xl">
								{isFolder
									? item.symbol || "📁"
									: item.symbol || "📚"}
							</span>
							<div className="flex-1">
								<h3
									className="text-xl font-bold text-gray-900 dark:text-slate-100 cursor-pointer hover:text-teal-600 dark:hover:text-teal-400 transition-colors duration-200"
									onClick={handleClick}
								>
									{item.name}
								</h3>
								<p className="text-sm text-gray-600 dark:text-slate-400">
									{isFolder
										? folderStats.totalCards > 0
											? `${folderStats.totalCards} card(s) in ${folderStats.deckCount} deck(s)`
											: `${folderStats.folderCount} folder(s), ${folderStats.deckCount} deck(s)`
										: `${item.cards?.length || 0} card(s)`}
								</p>
							</div>
						</div>
					</div>

					{/* Stats */}
					{isDeck && deckStats && (
						<>
							{/* Card Counts */}
							<div className="grid grid-cols-3 gap-2 mb-3">
								<div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-2.5 text-center">
									<div className="text-xl font-bold text-orange-600">
										{deckStats.dueCount}
									</div>
									<div className="text-xs text-gray-600 dark:text-slate-400">
										Due
									</div>
								</div>
								<div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-2.5 text-center">
									<div className="text-xl font-bold text-teal-600">
										{deckStats.newCount}
									</div>
									<div className="text-xs text-gray-600 dark:text-slate-400">
										New
									</div>
								</div>
								<div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-2.5 text-center">
									<div className="text-xl font-bold text-green-600">
										{deckStats.learnedCount}
									</div>
									<div className="text-xs text-gray-600 dark:text-slate-400">
										Learned
									</div>
								</div>
							</div>

							{/* Scores */}
							<div className="flex items-center gap-4 mb-4 px-1">
								<div className="flex items-center gap-1.5">
									<div
										className={`w-2 h-2 rounded-full ${getMasteryDotColor(
											deckStats.averageLearningStrength
										)}`}
									></div>
									<span
										className={`text-sm font-semibold ${getMasteryColor(
											deckStats.averageLearningStrength
										)}`}
									>
										{item.cards.length > 0
											? `${deckStats.averageLearningStrength}%`
											: "—"}
									</span>
									<span className="text-xs text-gray-500 dark:text-slate-500">
										mastery
									</span>
								</div>
								<div className="flex items-center gap-1.5">
									<div className="w-2 h-2 rounded-full bg-purple-500"></div>
									<span className="text-sm font-semibold text-gray-700 dark:text-slate-300">
										{item.cards.length > 0
											? deckStats.aggregateReviewRate.toFixed(
													1
											  )
											: "—"}
									</span>
									<span className="text-xs text-gray-500 dark:text-slate-500">
										burden/day
									</span>
								</div>
							</div>

							{/* Progress */}
							<div className="h-2 bg-gray-200 dark:bg-slate-700 rounded-full mb-4 overflow-hidden flex">
								{item.cards.length > 0 ? (
									<>
										{/* Due segment */}
										<div
											className="h-full bg-linear-to-r from-orange-500 to-amber-500 transition-all duration-500"
											style={{
												width: `${
													(deckStats.dueCount /
														item.cards.length) *
													100
												}%`,
											}}
										/>
										{/* New segment */}
										<div
											className="h-full bg-linear-to-r from-teal-500 to-cyan-500 transition-all duration-500"
											style={{
												width: `${
													(deckStats.newCount /
														item.cards.length) *
													100
												}%`,
											}}
										/>
										{/* Learned segment */}
										<div
											className="h-full bg-linear-to-r from-green-500 to-emerald-500 transition-all duration-500 rounded-r-full"
											style={{
												width: `${
													(deckStats.learnedCount /
														item.cards.length) *
													100
												}%`,
											}}
										/>
									</>
								) : null}
							</div>
						</>
					)}

					{isFolder && folderStats && folderStats.totalCards > 0 && (
						<>
							{/* Card Counts */}
							<div className="grid grid-cols-3 gap-2 mb-3">
								<div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-2.5 text-center">
									<div className="text-xl font-bold text-orange-600">
										{folderStats.dueCount}
									</div>
									<div className="text-xs text-gray-600 dark:text-slate-400">
										Due
									</div>
								</div>
								<div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-2.5 text-center">
									<div className="text-xl font-bold text-teal-600">
										{folderStats.newCount}
									</div>
									<div className="text-xs text-gray-600 dark:text-slate-400">
										New
									</div>
								</div>
								<div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-2.5 text-center">
									<div className="text-xl font-bold text-green-600">
										{folderStats.learnedCount}
									</div>
									<div className="text-xs text-gray-600 dark:text-slate-400">
										Learned
									</div>
								</div>
							</div>

							{/* Scores */}
							<div className="flex items-center gap-4 mb-4 px-1">
								<div className="flex items-center gap-1.5">
									<div
										className={`w-2 h-2 rounded-full ${getMasteryDotColor(
											folderStats.averageLearningStrength
										)}`}
									></div>
									<span
										className={`text-sm font-semibold ${getMasteryColor(
											folderStats.averageLearningStrength
										)}`}
									>
										{folderStats.totalCards > 0
											? `${folderStats.averageLearningStrength}%`
											: "—"}
									</span>
									<span className="text-xs text-gray-500 dark:text-slate-500">
										mastery
									</span>
								</div>
								<div className="flex items-center gap-1.5">
									<div className="w-2 h-2 rounded-full bg-purple-500"></div>
									<span className="text-sm font-semibold text-gray-700 dark:text-slate-300">
										{folderStats.totalCards > 0
											? folderStats.aggregateReviewRate.toFixed(
													1
											  )
											: "—"}
									</span>
									<span className="text-xs text-gray-500 dark:text-slate-500">
										burden/day
									</span>
								</div>
							</div>

							{/* Progress */}
							<div className="h-2 bg-gray-200 dark:bg-slate-700 rounded-full mb-4 overflow-hidden flex">
								{folderStats.totalCards > 0 ? (
									<>
										{/* Due segment */}
										<div
											className="h-full bg-linear-to-r from-orange-500 to-amber-500 transition-all duration-500"
											style={{
												width: `${
													(folderStats.dueCount /
														folderStats.totalCards) *
													100
												}%`,
											}}
										/>
										{/* New segment */}
										<div
											className="h-full bg-linear-to-r from-teal-500 to-cyan-500 transition-all duration-500"
											style={{
												width: `${
													(folderStats.newCount /
														folderStats.totalCards) *
													100
												}%`,
											}}
										/>
										{/* Learned segment */}
										<div
											className="h-full bg-linear-to-r from-green-500 to-emerald-500 transition-all duration-500 rounded-r-full"
											style={{
												width: `${
													(folderStats.learnedCount /
														folderStats.totalCards) *
													100
												}%`,
											}}
										/>
									</>
								) : null}
							</div>
						</>
					)}

					{isFolder &&
						folderStats &&
						folderStats.totalCards === 0 && (
							<div className="mb-4 flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400">
								<Folder className="h-4 w-4" />
								<span>
									{folderStats.folderCount > 0 &&
										`${folderStats.folderCount} folder${
											folderStats.folderCount !== 1
												? "s"
												: ""
										}`}
									{folderStats.folderCount > 0 &&
										folderStats.deckCount > 0 &&
										", "}
									{folderStats.deckCount > 0 &&
										`${folderStats.deckCount} deck${
											folderStats.deckCount !== 1
												? "s"
												: ""
										}`}
									{folderStats.folderCount === 0 &&
										folderStats.deckCount === 0 &&
										"Empty folder"}
								</span>
							</div>
						)}

					{/* Actions */}
					<div className="flex gap-2">
						<button
							onClick={handleClick}
							className="flex-1 px-2 sm:px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 font-medium rounded-lg transition-colors duration-200 text-sm sm:text-base flex items-center justify-center gap-1.5"
						>
							<Eye className="h-4 w-4 sm:hidden" />
							<span className="hidden sm:inline">View</span>
						</button>
						{isDeck && onStartReview && (
							<button
								onClick={handleStartReview}
								className="flex-1 px-2 sm:px-3 py-2 bg-linear-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 text-sm sm:text-base flex items-center justify-center gap-1.5"
							>
								<Play className="h-4 w-4 sm:hidden" />
								<span className="hidden sm:inline">Study</span>
							</button>
						)}
						{!isDeck && onStartReview && <div className="flex-1" />}
						<button
							onClick={(e) => {
								e.stopPropagation();
								setEditingId(item.id);
								setEditingName(item.name);
								setEditingSymbol(
									isFolder
										? item.symbol || "📁"
										: item.symbol || "📚"
								);
							}}
							className="p-2 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors duration-200"
						>
							<Edit className="h-4 w-4" />
						</button>
						<button
							onClick={(e) => {
								e.stopPropagation();
								handleDelete(item.id);
							}}
							className="p-2 text-gray-600 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors duration-200"
						>
							<Trash2 className="h-4 w-4" />
						</button>
					</div>
				</>
			)}
		</div>
	);
}
