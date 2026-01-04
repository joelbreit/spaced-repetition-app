import { useState } from "react";
import { BarChart3, RefreshCw, Calculator } from "lucide-react";

export default function AdditionalStats({ appData }) {
	const [stats, setStats] = useState(null);
	const [isCalculating, setIsCalculating] = useState(false);

	const calculateStats = () => {
		setIsCalculating(true);

		// Use setTimeout to allow UI to update before heavy calculation
		setTimeout(() => {
			try {
				// Get all decks
				const allDecks = appData?.decks || [];

				// Collect all cards from all decks
				const allCards = [];
				allDecks.forEach((deck) => {
					if (deck.cards && Array.isArray(deck.cards)) {
						allCards.push(...deck.cards);
					}
				});

				// Calculate total cards
				const totalCards = allCards.length;

				// Calculate total reviews
				const totalReviews = allCards.reduce(
					(sum, card) => sum + (card.reviews?.length || 0),
					0
				);

				// Find cards with reviewDuration in any review
				const cardsWithDuration = allCards.filter((card) => {
					if (!card.reviews || !Array.isArray(card.reviews)) {
						return false;
					}
					return card.reviews.some(
						(review) =>
							review.reviewDuration != null &&
							review.reviewDuration > 0
					);
				});

				const cardsWithDurationCount = cardsWithDuration.length;
				const cardsWithoutDurationCount =
					totalCards - cardsWithDurationCount;

				// Calculate average reviewDuration
				// Collect all reviewDurations from all reviews, excluding null/undefined/0
				// Cap at 60 seconds (60000 ms) for calculation
				const reviewDurations = [];
				allCards.forEach((card) => {
					if (card.reviews && Array.isArray(card.reviews)) {
						card.reviews.forEach((review) => {
							if (
								review.reviewDuration != null &&
								review.reviewDuration > 0
							) {
								// Cap at 60 seconds (60000 ms)
								const cappedDuration = Math.min(
									review.reviewDuration,
									60000
								);
								reviewDurations.push(cappedDuration);
							}
						});
					}
				});

				const averageReviewDuration =
					reviewDurations.length > 0
						? reviewDurations.reduce(
								(sum, duration) => sum + duration,
								0
						  ) / reviewDurations.length
						: 0;

				// Format duration as seconds with 2 decimal places
				const formatDuration = (ms) => {
					return (ms / 1000).toFixed(2);
				};

				// Format time as hours:minutes:seconds or minutes:seconds
				const formatTime = (ms) => {
					const totalSeconds = Math.floor(ms / 1000);
					const hours = Math.floor(totalSeconds / 3600);
					const minutes = Math.floor((totalSeconds % 3600) / 60);
					const seconds = totalSeconds % 60;

					if (hours > 0) {
						return `${hours}h ${minutes}m ${seconds}s`;
					} else if (minutes > 0) {
						return `${minutes}m ${seconds}s`;
					} else {
						return `${seconds}s`;
					}
				};

				// Calculate review result distribution
				const resultCounts = {
					again: 0,
					hard: 0,
					good: 0,
					easy: 0,
				};

				allCards.forEach((card) => {
					if (card.reviews && Array.isArray(card.reviews)) {
						card.reviews.forEach((review) => {
							if (
								review.result &&
								(review.result === "again" ||
									review.result === "hard" ||
									review.result === "good" ||
									review.result === "easy")
							) {
								resultCounts[review.result]++;
							}
						});
					}
				});

				// Calculate total study time (sum of all review durations, uncapped)
				const totalStudyTime = allCards.reduce((sum, card) => {
					if (card.reviews && Array.isArray(card.reviews)) {
						return (
							sum +
							card.reviews.reduce(
								(cardSum, review) =>
									cardSum + (review.reviewDuration || 0),
								0
							)
						);
					}
					return sum;
				}, 0);

				// Calculate average reviews per card
				const averageReviewsPerCard =
					totalCards > 0 ? (totalReviews / totalCards).toFixed(2) : 0;

				// Calculate review success rate (good + easy / total)
				const successCount = resultCounts.good + resultCounts.easy;
				const successRate =
					totalReviews > 0
						? ((successCount / totalReviews) * 100).toFixed(1)
						: 0;

				// Calculate cards by status
				const now = Date.now();
				const newCards = allCards.filter(
					(card) => !card.reviews || card.reviews.length === 0
				).length;
				const dueCards = allCards.filter(
					(card) =>
						card.reviews &&
						card.reviews.length > 0 &&
						card.whenDue <= now
				).length;
				const learnedCards = allCards.filter(
					(card) =>
						card.reviews &&
						card.reviews.length > 0 &&
						card.whenDue > now
				).length;

				// Find card with most reviews
				let mostReviewedCard = null;
				let maxReviews = 0;
				allCards.forEach((card) => {
					const reviewCount = card.reviews?.length || 0;
					if (reviewCount > maxReviews) {
						maxReviews = reviewCount;
						mostReviewedCard = {
							reviewCount,
							deckName:
								allDecks.find(
									(deck) =>
										deck.cards &&
										deck.cards.some(
											(c) => c.cardId === card.cardId
										)
								)?.deckName || "Unknown",
						};
					}
				});

				setStats({
					totalCards,
					totalReviews,
					cardsWithDurationCount,
					cardsWithoutDurationCount,
					averageReviewDuration,
					formattedAverageDuration: formatDuration(
						averageReviewDuration
					),
					resultCounts,
					totalStudyTime,
					formattedTotalStudyTime: formatTime(totalStudyTime),
					averageReviewsPerCard,
					successRate,
					successCount,
					newCards,
					dueCards,
					learnedCards,
					mostReviewedCard,
				});
			} catch (error) {
				console.error("Error calculating stats:", error);
			} finally {
				setIsCalculating(false);
			}
		}, 0);
	};

	return (
		<div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
			<div className="flex items-center justify-between mb-4">
				<div className="flex items-center gap-3">
					<div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
						<BarChart3 className="h-5 w-5 text-teal-600 dark:text-teal-400" />
					</div>
					<h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
						Additional Statistics
					</h2>
				</div>
				{stats ? (
					<button
						onClick={calculateStats}
						disabled={isCalculating}
						className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-900 dark:text-slate-100 font-medium rounded-xl transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<RefreshCw
							className={`h-4 w-4 ${
								isCalculating ? "animate-spin" : ""
							}`}
						/>
						Refresh
					</button>
				) : (
					<button
						onClick={calculateStats}
						disabled={isCalculating}
						className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-xl transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<Calculator className="h-4 w-4" />
						{isCalculating ? "Calculating..." : "Calculate Stats"}
					</button>
				)}
			</div>

			{stats ? (
				<div className="space-y-4">
					{/* Total Reviews */}
					<div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl">
						<div className="flex items-center justify-between">
							<span className="text-sm font-medium text-gray-600 dark:text-slate-400">
								Total Card Reviews
							</span>
							<span className="text-lg font-semibold text-gray-900 dark:text-slate-100">
								{stats.totalReviews.toLocaleString()}
							</span>
						</div>
					</div>

					{/* Total Cards */}
					<div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl">
						<div className="flex items-center justify-between">
							<span className="text-sm font-medium text-gray-600 dark:text-slate-400">
								Total Cards
							</span>
							<span className="text-lg font-semibold text-gray-900 dark:text-slate-100">
								{stats.totalCards.toLocaleString()}
							</span>
						</div>
					</div>

					{/* Cards with Review Duration */}
					<div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl">
						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<span className="text-sm font-medium text-gray-600 dark:text-slate-400">
									Cards with Review Duration
								</span>
								<span className="text-lg font-semibold text-teal-600 dark:text-teal-400">
									{stats.cardsWithDurationCount.toLocaleString()}
								</span>
							</div>
							<div className="flex items-center justify-between">
								<span className="text-sm font-medium text-gray-600 dark:text-slate-400">
									Cards without Review Duration
								</span>
								<span className="text-lg font-semibold text-gray-500 dark:text-slate-500">
									{stats.cardsWithoutDurationCount.toLocaleString()}
								</span>
							</div>
						</div>
					</div>

					{/* Average Review Duration */}
					<div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl">
						<div className="flex items-center justify-between">
							<span className="text-sm font-medium text-gray-600 dark:text-slate-400">
								Average Review Duration
							</span>
							<span className="text-lg font-semibold text-gray-900 dark:text-slate-100">
								{stats.formattedAverageDuration}s
							</span>
						</div>
						<p className="text-xs text-gray-500 dark:text-slate-500 mt-2">
							(Excluding reviews without duration, capped at 60
							seconds)
						</p>
					</div>

					{/* Total Study Time */}
					{stats.totalStudyTime > 0 && (
						<div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl">
							<div className="flex items-center justify-between">
								<span className="text-sm font-medium text-gray-600 dark:text-slate-400">
									Total Study Time
								</span>
								<span className="text-lg font-semibold text-gray-900 dark:text-slate-100">
									{stats.formattedTotalStudyTime}
								</span>
							</div>
						</div>
					)}

					{/* Average Reviews Per Card */}
					<div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl">
						<div className="flex items-center justify-between">
							<span className="text-sm font-medium text-gray-600 dark:text-slate-400">
								Average Reviews Per Card
							</span>
							<span className="text-lg font-semibold text-gray-900 dark:text-slate-100">
								{stats.averageReviewsPerCard}
							</span>
						</div>
					</div>

					{/* Review Success Rate */}
					{stats.totalReviews > 0 && (
						<div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl">
							<div className="flex items-center justify-between">
								<span className="text-sm font-medium text-gray-600 dark:text-slate-400">
									Review Success Rate
								</span>
								<span className="text-lg font-semibold text-green-600 dark:text-green-400">
									{stats.successRate}%
								</span>
							</div>
							<p className="text-xs text-gray-500 dark:text-slate-500 mt-2">
								({stats.successCount.toLocaleString()} good/easy
								out of {stats.totalReviews.toLocaleString()}{" "}
								total reviews)
							</p>
						</div>
					)}

					{/* Review Result Distribution */}
					{stats.totalReviews > 0 && (
						<div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl">
							<div className="mb-2">
								<span className="text-sm font-medium text-gray-600 dark:text-slate-400">
									Review Result Distribution
								</span>
							</div>
							<div className="space-y-2">
								<div className="flex items-center justify-between">
									<span className="text-xs text-gray-600 dark:text-slate-400">
										Again
									</span>
									<span className="text-sm font-semibold text-red-600 dark:text-red-400">
										{stats.resultCounts.again.toLocaleString()}
									</span>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-xs text-gray-600 dark:text-slate-400">
										Hard
									</span>
									<span className="text-sm font-semibold text-orange-600 dark:text-orange-400">
										{stats.resultCounts.hard.toLocaleString()}
									</span>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-xs text-gray-600 dark:text-slate-400">
										Good
									</span>
									<span className="text-sm font-semibold text-green-600 dark:text-green-400">
										{stats.resultCounts.good.toLocaleString()}
									</span>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-xs text-gray-600 dark:text-slate-400">
										Easy
									</span>
									<span className="text-sm font-semibold text-teal-600 dark:text-teal-400">
										{stats.resultCounts.easy.toLocaleString()}
									</span>
								</div>
							</div>
						</div>
					)}

					{/* Cards by Status */}
					<div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl">
						<div className="mb-2">
							<span className="text-sm font-medium text-gray-600 dark:text-slate-400">
								Cards by Status
							</span>
						</div>
						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<span className="text-xs text-gray-600 dark:text-slate-400">
									New
								</span>
								<span className="text-sm font-semibold text-teal-600 dark:text-teal-400">
									{stats.newCards.toLocaleString()}
								</span>
							</div>
							<div className="flex items-center justify-between">
								<span className="text-xs text-gray-600 dark:text-slate-400">
									Due
								</span>
								<span className="text-sm font-semibold text-orange-600 dark:text-orange-400">
									{stats.dueCards.toLocaleString()}
								</span>
							</div>
							<div className="flex items-center justify-between">
								<span className="text-xs text-gray-600 dark:text-slate-400">
									Learned
								</span>
								<span className="text-sm font-semibold text-green-600 dark:text-green-400">
									{stats.learnedCards.toLocaleString()}
								</span>
							</div>
						</div>
					</div>

					{/* Most Reviewed Card */}
					{stats.mostReviewedCard &&
						stats.mostReviewedCard.reviewCount > 0 && (
							<div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl">
								<div className="flex items-center justify-between">
									<span className="text-sm font-medium text-gray-600 dark:text-slate-400">
										Most Reviewed Card
									</span>
									<span className="text-lg font-semibold text-gray-900 dark:text-slate-100">
										{stats.mostReviewedCard.reviewCount.toLocaleString()}{" "}
										reviews
									</span>
								</div>
								<p className="text-xs text-gray-500 dark:text-slate-500 mt-2">
									Highest number of reviews for a single card
								</p>
							</div>
						)}
				</div>
			) : (
				<div className="text-center py-8 text-gray-500 dark:text-slate-400">
					<p>Click "Calculate Stats" to view additional statistics</p>
				</div>
			)}
		</div>
	);
}
