import {
	Edit,
	Trash2,
	Flag,
	Star,
	BookOpen,
	Target,
	BarChart3,
} from "lucide-react";
import {
	calculateLearningStrength,
	getPerDayReviewRate,
} from "../services/cardCalculations";

function getMasteryBadgeColors(mastery) {
	if (mastery < 25)
		return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400";
	if (mastery < 50)
		return "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400";
	if (mastery < 75)
		return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400";
	return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400";
}

export default function CardListItem({
	card,
	deckId,
	onEditCard,
	onDeleteCard,
	onToggleCardStar,
	onToggleCardFlag,
	deckName = null,
	deckSymbol = null,
}) {
	const isFlagged = card.isFlagged || false;
	const isStarred = card.isStarred || false;
	const learningStrength = calculateLearningStrength(card);

	return (
		<div
			className={`bg-white dark:bg-slate-800 rounded-xl border p-4 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer group ${
				isFlagged
					? "border-orange-300 dark:border-orange-700/50 bg-orange-50/30 dark:bg-orange-900/10"
					: isStarred
					? "border-yellow-300 dark:border-yellow-700/50 bg-yellow-50/30 dark:bg-yellow-900/10"
					: "border-gray-100 dark:border-slate-700"
			}`}
		>
			{/* Deck info badge (when viewing cards across multiple decks) */}
			{deckName && (
				<div className="flex items-center gap-1.5 mb-2 text-xs text-gray-500 dark:text-slate-400">
					<span>{deckSymbol || "📚"}</span>
					<span>{deckName}</span>
				</div>
			)}

			{/* Header row with Front label and action buttons */}
			<div className="flex items-start justify-between gap-2 mb-2">
				<div className="flex items-center gap-2">
					<h4 className="text-sm font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wide">
						Front
					</h4>
					{isStarred && (
						<Star className="h-4 w-4 text-yellow-500 dark:text-yellow-400 fill-current" />
					)}
					{isFlagged && (
						<Flag className="h-4 w-4 text-orange-500 dark:text-orange-400 fill-current" />
					)}
				</div>
				<div className="flex gap-1 shrink-0">
					{onToggleCardStar && (
						<button
							onClick={(e) => {
								e.stopPropagation();
								onToggleCardStar(deckId, card.cardId);
							}}
							className={`p-1.5 rounded-lg transition-colors duration-200 ${
								isStarred
									? "text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
									: "text-gray-400 dark:text-slate-500 hover:text-yellow-500 dark:hover:text-yellow-400 hover:bg-gray-100 dark:hover:bg-slate-700"
							}`}
							title={isStarred ? "Unstar card" : "Star card"}
						>
							<Star
								className={`h-4 w-4 ${
									isStarred ? "fill-current" : ""
								}`}
							/>
						</button>
					)}
					{onToggleCardFlag && (
						<button
							onClick={(e) => {
								e.stopPropagation();
								onToggleCardFlag(deckId, card.cardId);
							}}
							className={`p-1.5 rounded-lg transition-colors duration-200 ${
								isFlagged
									? "text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20"
									: "text-gray-400 dark:text-slate-500 hover:text-orange-500 dark:hover:text-orange-400 hover:bg-gray-100 dark:hover:bg-slate-700"
							}`}
							title={isFlagged ? "Unflag card" : "Flag card"}
						>
							<Flag
								className={`h-4 w-4 ${
									isFlagged ? "fill-current" : ""
								}`}
							/>
						</button>
					)}
					{onEditCard && (
						<button
							onClick={() => onEditCard(deckId, card.cardId)}
							className="p-1.5 text-gray-400 dark:text-slate-500 hover:text-gray-900 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors duration-200"
						>
							<Edit className="h-4 w-4" />
						</button>
					)}
					{onDeleteCard && (
						<button
							onClick={() => onDeleteCard(deckId, card.cardId)}
							className="p-1.5 text-gray-400 dark:text-slate-500 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors duration-200"
						>
							<Trash2 className="h-4 w-4" />
						</button>
					)}
				</div>
			</div>

			{/* Front content */}
			<p className="text-base text-gray-900 dark:text-slate-100 font-medium mb-3">
				{card.front}
			</p>

			{/* Back section */}
			<div className="mb-3">
				<h4 className="text-sm font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wide mb-1">
					Back
				</h4>
				<p className="text-base text-gray-700 dark:text-slate-300">
					{card.back}
				</p>
			</div>

			{/* Stats badges */}
			<div className="flex flex-wrap items-center gap-2">
				<span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 text-xs font-medium rounded-md">
					<BookOpen className="h-3 w-3" />
					{card.reviews.length} reviews
				</span>
				<span
					className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md ${getMasteryBadgeColors(
						learningStrength
					)}`}
				>
					<Target className="h-3 w-3" />
					{Math.round(learningStrength)}% mastery
				</span>
				<span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 text-xs font-medium rounded-md">
					<BarChart3 className="h-3 w-3" />
					{getPerDayReviewRate(card).toFixed(2)} / day
				</span>
				{isStarred && (
					<span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs font-medium rounded-md">
						<Star className="h-3 w-3 fill-current" />
						Starred
					</span>
				)}
				{isFlagged && (
					<span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs font-medium rounded-md">
						<Flag className="h-3 w-3 fill-current" />
						Flagged
					</span>
				)}
			</div>
		</div>
	);
}

