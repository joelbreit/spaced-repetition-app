import {
	RotateCcw,
	Edit,
	X,
	BarChart3,
	Clock,
	TrendingUp,
	Target,
	Calendar,
	Flag,
} from "lucide-react";

export default function CardReviewView({
	deck,
	currentCardIndex,
	isFlipped,
	onFlip,
	onReview,
	onEditCard,
	onEndReview,
	onToggleFlag,
}) {
	const currentCard = deck.cards[currentCardIndex];
	const progress = ((currentCardIndex + 1) / deck.cards.length) * 100;
	const isFlagged = currentCard?.isFlagged || false;

	if (!currentCard) {
		return null;
	}

	// Calculate statistics
	const reviews = currentCard.reviews || [];
	const reviewCount = reviews.length;

	// Time since last review
	const lastReview = reviews.length > 0 ? reviews[reviews.length - 1] : null;
	const timeSinceLastReview = lastReview
		? Date.now() - lastReview.timestamp
		: null;

	const formatTimeAgo = (ms) => {
		if (!ms) return "Never reviewed";
		const seconds = Math.floor(ms / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);
		const days = Math.floor(hours / 24);

		if (days > 0) return `${days} day${days !== 1 ? "s" : ""} ago`;
		if (hours > 0) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
		if (minutes > 0)
			return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
		return "Just now";
	};

	// Learning strength (based on last 5 reviews, weighted towards recent)
	const calculateLearningStrength = () => {
		if (reviews.length === 0)
			return { score: 0, label: "New", color: "gray" };

		const recentReviews = reviews.slice(-5);
		const weights = [0.1, 0.15, 0.2, 0.25, 0.3]; // More weight to recent reviews
		const resultScores = { again: 0, hard: 1, good: 2, easy: 3 };

		let weightedSum = 0;
		let totalWeight = 0;

		recentReviews.forEach((review, index) => {
			const weight = weights[recentReviews.length - 1 - index] || 0.2;
			weightedSum += resultScores[review.result] * weight;
			totalWeight += weight;
		});

		const score = weightedSum / totalWeight;

		if (score >= 2.5) return { score, label: "Mastered", color: "teal" };
		if (score >= 1.5) return { score, label: "Learning", color: "green" };
		if (score >= 0.5)
			return { score, label: "Struggling", color: "orange" };
		return { score, label: "New", color: "red" };
	};

	const learningStrength = calculateLearningStrength();

	// Success rate (percentage of "good" or "easy" reviews)
	const successRate =
		reviews.length > 0
			? Math.round(
					(reviews.filter(
						(r) => r.result === "good" || r.result === "easy"
					).length /
						reviews.length) *
						100
			  )
			: 0;

	// Days until next due
	const daysUntilDue = currentCard.whenDue
		? Math.ceil((currentCard.whenDue - Date.now()) / (1000 * 60 * 60 * 24))
		: 0;

	const formatDaysUntilDue = () => {
		if (daysUntilDue < 0) {
			const daysAgo = Math.abs(daysUntilDue);
			if (daysAgo === 1) return "Due yesterday";
			return `Due ${daysAgo} days ago`;
		}
		if (daysUntilDue === 0) return "Due today";
		if (daysUntilDue === 1) return "Due tomorrow";
		return `Due in ${daysUntilDue} days`;
	};

	return (
		<div className="mx-auto max-w-4xl">
			{/* Progress bar */}
			<div className="mb-8">
				<div className="mb-3 flex items-center justify-between text-sm">
					<span className="text-gray-600 dark:text-gray-400 font-medium">
						Card {currentCardIndex + 1} of {deck.cards.length}
					</span>
					<span className="text-gray-600 dark:text-gray-400 font-medium">
						{Math.round(progress)}%
					</span>
				</div>
				<div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
					<div
						className="h-full bg-linear-to-r from-teal-500 to-cyan-500 rounded-full transition-all duration-500 ease-out relative overflow-hidden"
						style={{ width: `${progress}%` }}
					>
						{/* Shimmer effect */}
						<div className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
					</div>
				</div>
			</div>

			{/* Card */}
			<div className="mb-8">
				<div
					className="relative min-h-[100px] cursor-pointer backdrop-blur-lg bg-white/80 dark:bg-slate-800/80 border border-white/20 dark:border-slate-700/50 rounded-2xl shadow-2xl transition-all duration-300 hover:shadow-3xl hover:scale-[1.02] group animate-scale-in"
					onClick={onFlip}
				>
					{/* Flag Button */}
					<button
						onClick={(e) => {
							e.stopPropagation();
							if (onToggleFlag) {
								onToggleFlag(currentCard.cardId);
							}
						}}
						className={`absolute top-4 right-4 p-2 rounded-lg transition-all duration-200 z-10 ${
							isFlagged
								? "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-900/50"
								: "bg-white/50 dark:bg-slate-700/50 text-gray-400 dark:text-slate-500 hover:bg-white/70 dark:hover:bg-slate-700/70 hover:text-orange-500 dark:hover:text-orange-400 border border-gray-200 dark:border-slate-600"
						}`}
						title={isFlagged ? "Unflag card" : "Flag card"}
					>
						<Flag
							className={`h-5 w-5 ${
								isFlagged ? "fill-current" : ""
							}`}
						/>
					</button>
					<div className="flex h-full flex-col justify-center p-6">
						{!isFlipped ? (
							<div className="text-center">
								<div className="mb-4 text-sm font-semibold uppercase tracking-wide text-teal-600 dark:text-teal-400">
									Front
								</div>
								<div className="text-2xl font-medium text-gray-900 dark:text-white leading-relaxed">
									{currentCard.front}
								</div>
							</div>
						) : (
							<div className="text-center">
								<div className="mb-4 text-sm font-semibold uppercase tracking-wide text-teal-600 dark:text-teal-400">
									Back
								</div>
								<div className="text-2xl font-medium text-gray-900 dark:text-white leading-relaxed">
									{currentCard.back}
								</div>
							</div>
						)}
					</div>

					<div className="absolute bottom-4 left-4 text-sm text-gray-500 dark:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
						Click to flip
					</div>
				</div>
			</div>

			{/* Card Statistics - Compact */}
			<div className="mb-6">
				<div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-sm border border-gray-200/50 dark:border-slate-700/50 rounded-lg px-4 py-2">
					<div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs">
						{/* Review Count */}
						<div className="flex items-center gap-1.5">
							<BarChart3 className="h-3 w-3 text-teal-500" />
							<span className="text-gray-600 dark:text-gray-400 font-medium">
								{reviewCount}
							</span>
							<span className="text-gray-500 dark:text-gray-500">
								reviews
							</span>
						</div>

						{/* Time Since Last Review */}
						<div className="flex items-center gap-1.5">
							<Clock className="h-3 w-3 text-blue-500" />
							<span className="text-gray-600 dark:text-gray-400">
								{formatTimeAgo(timeSinceLastReview)}
							</span>
						</div>

						{/* Learning Strength */}
						<div className="flex items-center gap-1.5">
							<TrendingUp className="h-3 w-3 text-purple-500" />
							<span
								className={`font-medium ${
									learningStrength.color === "teal"
										? "text-teal-600 dark:text-teal-400"
										: learningStrength.color === "green"
										? "text-green-600 dark:text-green-400"
										: learningStrength.color === "orange"
										? "text-orange-600 dark:text-orange-400"
										: learningStrength.color === "red"
										? "text-red-600 dark:text-red-400"
										: "text-gray-600 dark:text-gray-400"
								}`}
							>
								{learningStrength.label}
							</span>
						</div>

						{/* Success Rate */}
						<div className="flex items-center gap-1.5">
							<Target className="h-3 w-3 text-green-500" />
							<span className="text-gray-600 dark:text-gray-400 font-medium">
								{successRate}%
							</span>
							<span className="text-gray-500 dark:text-gray-500">
								success
							</span>
						</div>

						{/* Next Due Date */}
						<div className="flex items-center gap-1.5">
							<Calendar className="h-3 w-3 text-cyan-500" />
							<span
								className={`font-medium ${
									daysUntilDue < 0
										? "text-red-600 dark:text-red-400"
										: daysUntilDue === 0
										? "text-orange-600 dark:text-orange-400"
										: "text-gray-600 dark:text-gray-400"
								}`}
							>
								{formatDaysUntilDue()}
							</span>
						</div>
					</div>
				</div>
			</div>

			{/* Review buttons */}
			<div className="space-y-6">
				{isFlipped ? (
					<div>
						<h3 className="mb-6 text-center text-xl font-semibold text-gray-700 dark:text-gray-300">
							How did you do?
						</h3>
						<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
							<button
								onClick={() => onReview("again")}
								className="px-6 py-4 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
							>
								<div className="text-lg font-semibold">
									Again
								</div>
								<div className="text-sm opacity-90">Poor</div>
							</button>
							<button
								onClick={() => onReview("hard")}
								className="px-6 py-4 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
							>
								<div className="text-lg font-semibold">
									Hard
								</div>
								<div className="text-sm opacity-90">
									Difficult
								</div>
							</button>
							<button
								onClick={() => onReview("good")}
								className="px-6 py-4 bg-green-500 hover:bg-green-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
							>
								<div className="text-lg font-semibold">
									Good
								</div>
								<div className="text-sm opacity-90">
									Correct
								</div>
							</button>
							<button
								onClick={() => onReview("easy")}
								className="px-6 py-4 bg-linear-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
							>
								<div className="text-lg font-semibold">
									Easy
								</div>
								<div className="text-sm opacity-90">Simple</div>
							</button>
						</div>
					</div>
				) : (
					<div className="text-center">
						<button
							onClick={onFlip}
							className="inline-flex items-center gap-3 px-8 py-4 bg-linear-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
						>
							<RotateCcw className="h-6 w-6" />
							Show Answer
						</button>
					</div>
				)}

				{/* Action buttons */}
				<div className="flex justify-center gap-4">
					<button
						onClick={() => onEditCard(currentCard.cardId)}
						className="flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 font-medium rounded-xl transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
					>
						<Edit className="h-5 w-5" />
						Edit Card
					</button>
					<button
						onClick={onEndReview}
						className="flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
					>
						<X className="h-5 w-5" />
						End Review
					</button>
				</div>
			</div>
		</div>
	);
}
