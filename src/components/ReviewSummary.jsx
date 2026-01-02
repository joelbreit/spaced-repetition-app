import {
	CheckCircle,
	TrendingUp,
	TrendingDown,
	Minus,
	BarChart3,
	Target,
	Zap,
	Award,
	ArrowRight,
	Clock,
} from "lucide-react";
import {
	calculateLearningStrength,
	getPerDayReviewRate,
} from "../services/cardCalculations";

export default function ReviewSummary({
	sessionReviews,
	cardsCollectionBefore,
	cardsCollectionAfter,
	onClose,
}) {
	// Calculate session statistics
	const totalReviewed = sessionReviews.length;
	const resultCounts = {
		again: sessionReviews.filter((r) => r.result === "again").length,
		hard: sessionReviews.filter((r) => r.result === "hard").length,
		good: sessionReviews.filter((r) => r.result === "good").length,
		easy: sessionReviews.filter((r) => r.result === "easy").length,
	};

	// Calculate total review time
	const totalReviewTime = sessionReviews.reduce(
		(sum, review) => sum + (review.reviewDuration || 0),
		0
	);

	// Format review time as minutes:seconds
	const formatReviewTime = (ms) => {
		if (!ms || ms === 0) return "0:00";
		const totalSeconds = Math.floor(ms / 1000);
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds % 60;
		return `${minutes}:${seconds.toString().padStart(2, "0")}`;
	};

	// Calculate percentages
	const getPercentage = (count) =>
		totalReviewed > 0 ? Math.round((count / totalReviewed) * 100) : 0;

	// Calculate metrics before and after for a card collection (deck or folder)
	const calculateCardCollectionMetrics = (cardCollection) => {
		if (
			!cardCollection ||
			!cardCollection.cards ||
			cardCollection.cards.length === 0
		) {
			return {
				avgMastery: 0,
				totalBurden: 0,
				dueCount: 0,
				newCount: 0,
				learnedCount: 0,
			};
		}

		const now = Date.now();
		const avgMastery =
			cardCollection.cards.reduce(
				(sum, card) => sum + calculateLearningStrength(card),
				0
			) / cardCollection.cards.length;

		const totalBurden = cardCollection.cards
			.filter((card) => card.reviews && card.reviews.length > 0)
			.reduce((sum, card) => sum + getPerDayReviewRate(card), 0);

		const dueCount = cardCollection.cards.filter(
			(card) => card.whenDue <= now && card.reviews.length > 0
		).length;

		const newCount = cardCollection.cards.filter(
			(card) => card.reviews.length === 0
		).length;

		const learnedCount = cardCollection.cards.filter(
			(card) => card.reviews.length > 0 && card.whenDue > now
		).length;

		return { avgMastery, totalBurden, dueCount, newCount, learnedCount };
	};

	const metricsBefore = calculateCardCollectionMetrics(cardsCollectionBefore);
	const metricsAfter = calculateCardCollectionMetrics(cardsCollectionAfter);

	// Calculate changes
	const masteryChange = metricsAfter.avgMastery - metricsBefore.avgMastery;
	const burdenChange = metricsAfter.totalBurden - metricsBefore.totalBurden;

	// Get performance message based on results
	const getPerformanceMessage = () => {
		const successRate =
			totalReviewed > 0
				? ((resultCounts.good + resultCounts.easy) / totalReviewed) *
				  100
				: 0;

		if (totalReviewed === 0)
			return { emoji: "📚", message: "No cards reviewed" };
		if (successRate >= 90)
			return { emoji: "🌟", message: "Outstanding performance!" };
		if (successRate >= 75) return { emoji: "🎯", message: "Great job!" };
		if (successRate >= 50) return { emoji: "💪", message: "Keep it up!" };
		return { emoji: "📈", message: "Room to grow!" };
	};

	const performance = getPerformanceMessage();

	// Trend indicator component
	const TrendIndicator = ({ value, suffix = "", invertColors = false }) => {
		if (Math.abs(value) < 0.01) {
			return (
				<span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
					<Minus className="h-4 w-4" />
					<span>No change</span>
				</span>
			);
		}

		const isPositive = value > 0;
		const color = invertColors
			? isPositive
				? "text-red-500"
				: "text-green-500"
			: isPositive
			? "text-green-500"
			: "text-red-500";

		const Icon = isPositive ? TrendingUp : TrendingDown;

		return (
			<span className={`flex items-center gap-1 ${color}`}>
				<Icon className="h-4 w-4" />
				<span>
					{isPositive ? "+" : ""}
					{value.toFixed(1)}
					{suffix}
				</span>
			</span>
		);
	};

	return (
		<div className="mx-auto max-w-2xl animate-scale-in">
			{/* Header */}
			<div className="text-center mb-8">
				<div className="text-6xl mb-4">{performance.emoji}</div>
				<h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
					Review Complete!
				</h1>
				<p className="text-lg text-gray-600 dark:text-gray-400">
					{performance.message}
				</p>
			</div>

			{/* Cards Reviewed */}
			<div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg border border-white/20 dark:border-slate-700/50 rounded-2xl shadow-xl p-6 mb-6">
				<div className="flex items-center gap-3 mb-4">
					<div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-xl">
						<BarChart3 className="h-6 w-6 text-teal-600 dark:text-teal-400" />
					</div>
					<h2 className="text-xl font-semibold text-gray-900 dark:text-white">
						Cards Reviewed
					</h2>
				</div>

				<div className="text-center py-4">
					<div className="text-5xl font-bold text-gray-900 dark:text-white mb-1">
						{totalReviewed}
					</div>
					<div className="text-gray-500 dark:text-gray-400">
						card{totalReviewed !== 1 ? "s" : ""} this session
					</div>
					{totalReviewed > 0 && totalReviewTime > 0 && (
						<div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
							<div className="flex items-center justify-center gap-2">
								<Clock className="h-5 w-5 text-teal-500" />
								<div className="text-2xl font-semibold text-gray-900 dark:text-white">
									{formatReviewTime(totalReviewTime)}
								</div>
							</div>
							<div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
								Total review time
							</div>
						</div>
					)}
				</div>

				{/* Result Distribution */}
				{totalReviewed > 0 && (
					<div className="mt-6">
						<h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
							Result Distribution
						</h3>

						{/* Visual bar */}
						<div className="h-4 rounded-full overflow-hidden flex mb-4">
							{resultCounts.again > 0 && (
								<div
									className="bg-red-500 transition-all duration-500"
									style={{
										width: `${getPercentage(
											resultCounts.again
										)}%`,
									}}
								/>
							)}
							{resultCounts.hard > 0 && (
								<div
									className="bg-orange-500 transition-all duration-500"
									style={{
										width: `${getPercentage(
											resultCounts.hard
										)}%`,
									}}
								/>
							)}
							{resultCounts.good > 0 && (
								<div
									className="bg-green-500 transition-all duration-500"
									style={{
										width: `${getPercentage(
											resultCounts.good
										)}%`,
									}}
								/>
							)}
							{resultCounts.easy > 0 && (
								<div
									className="bg-teal-500 transition-all duration-500"
									style={{
										width: `${getPercentage(
											resultCounts.easy
										)}%`,
									}}
								/>
							)}
						</div>

						{/* Legend */}
						<div className="grid grid-cols-4 gap-2">
							<div className="text-center">
								<div className="flex items-center justify-center gap-1.5 mb-1">
									<div className="w-3 h-3 rounded-full bg-red-500" />
									<span className="text-sm font-medium text-gray-700 dark:text-gray-300">
										Again
									</span>
								</div>
								<div className="text-lg font-bold text-red-600 dark:text-red-400">
									{resultCounts.again}
								</div>
								<div className="text-xs text-gray-500">
									{getPercentage(resultCounts.again)}%
								</div>
							</div>
							<div className="text-center">
								<div className="flex items-center justify-center gap-1.5 mb-1">
									<div className="w-3 h-3 rounded-full bg-orange-500" />
									<span className="text-sm font-medium text-gray-700 dark:text-gray-300">
										Hard
									</span>
								</div>
								<div className="text-lg font-bold text-orange-600 dark:text-orange-400">
									{resultCounts.hard}
								</div>
								<div className="text-xs text-gray-500">
									{getPercentage(resultCounts.hard)}%
								</div>
							</div>
							<div className="text-center">
								<div className="flex items-center justify-center gap-1.5 mb-1">
									<div className="w-3 h-3 rounded-full bg-green-500" />
									<span className="text-sm font-medium text-gray-700 dark:text-gray-300">
										Good
									</span>
								</div>
								<div className="text-lg font-bold text-green-600 dark:text-green-400">
									{resultCounts.good}
								</div>
								<div className="text-xs text-gray-500">
									{getPercentage(resultCounts.good)}%
								</div>
							</div>
							<div className="text-center">
								<div className="flex items-center justify-center gap-1.5 mb-1">
									<div className="w-3 h-3 rounded-full bg-teal-500" />
									<span className="text-sm font-medium text-gray-700 dark:text-gray-300">
										Easy
									</span>
								</div>
								<div className="text-lg font-bold text-teal-600 dark:text-teal-400">
									{resultCounts.easy}
								</div>
								<div className="text-xs text-gray-500">
									{getPercentage(resultCounts.easy)}%
								</div>
							</div>
						</div>
					</div>
				)}
			</div>

			{/* Deck Metrics Changes */}
			{totalReviewed > 0 && (
				<div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg border border-white/20 dark:border-slate-700/50 rounded-2xl shadow-xl p-6 mb-6">
					<div className="flex items-center gap-3 mb-4">
						<div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
							<Award className="h-6 w-6 text-purple-600 dark:text-purple-400" />
						</div>
						<h2 className="text-xl font-semibold text-gray-900 dark:text-white">
							Deck Progress
						</h2>
					</div>

					<div className="space-y-4">
						{/* Mastery Change */}
						<div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/50 rounded-xl">
							<div className="flex items-center gap-3">
								<Target className="h-5 w-5 text-green-500" />
								<div>
									<div className="font-medium text-gray-900 dark:text-white">
										Average Mastery
									</div>
									<div className="text-sm text-gray-500 dark:text-gray-400">
										{metricsBefore.avgMastery.toFixed(1)}%{" "}
										<ArrowRight className="h-3 w-3 inline" />{" "}
										{metricsAfter.avgMastery.toFixed(1)}%
									</div>
								</div>
							</div>
							<TrendIndicator value={masteryChange} suffix="%" />
						</div>

						{/* Burden Change */}
						<div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/50 rounded-xl">
							<div className="flex items-center gap-3">
								<Zap className="h-5 w-5 text-purple-500" />
								<div>
									<div className="font-medium text-gray-900 dark:text-white">
										Daily Burden
									</div>
									<div className="text-sm text-gray-500 dark:text-gray-400">
										{metricsBefore.totalBurden.toFixed(1)}{" "}
										<ArrowRight className="h-3 w-3 inline" />{" "}
										{metricsAfter.totalBurden.toFixed(1)}{" "}
										reviews/day
									</div>
								</div>
							</div>
							<TrendIndicator
								value={burdenChange}
								invertColors={true}
							/>
						</div>

						{/* Card Status Changes */}
						<div className="grid grid-cols-3 gap-3 mt-4">
							<div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
								<div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
									{metricsAfter.dueCount}
								</div>
								<div className="text-xs text-gray-600 dark:text-gray-400">
									Due Now
								</div>
								{metricsBefore.dueCount !==
									metricsAfter.dueCount && (
									<div className="text-xs text-orange-500 mt-1">
										{metricsAfter.dueCount -
											metricsBefore.dueCount >
										0
											? "+"
											: ""}
										{metricsAfter.dueCount -
											metricsBefore.dueCount}
									</div>
								)}
							</div>
							<div className="text-center p-3 bg-teal-50 dark:bg-teal-900/20 rounded-xl">
								<div className="text-2xl font-bold text-teal-600 dark:text-teal-400">
									{metricsAfter.newCount}
								</div>
								<div className="text-xs text-gray-600 dark:text-gray-400">
									New
								</div>
								{metricsBefore.newCount !==
									metricsAfter.newCount && (
									<div className="text-xs text-teal-500 mt-1">
										{metricsAfter.newCount -
											metricsBefore.newCount >
										0
											? "+"
											: ""}
										{metricsAfter.newCount -
											metricsBefore.newCount}
									</div>
								)}
							</div>
							<div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
								<div className="text-2xl font-bold text-green-600 dark:text-green-400">
									{metricsAfter.learnedCount}
								</div>
								<div className="text-xs text-gray-600 dark:text-gray-400">
									Learned
								</div>
								{metricsBefore.learnedCount !==
									metricsAfter.learnedCount && (
									<div className="text-xs text-green-500 mt-1">
										{metricsAfter.learnedCount -
											metricsBefore.learnedCount >
										0
											? "+"
											: ""}
										{metricsAfter.learnedCount -
											metricsBefore.learnedCount}
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Done Button */}
			<div className="text-center">
				<button
					onClick={onClose}
					className="inline-flex items-center gap-3 px-8 py-4 bg-linear-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
				>
					<CheckCircle className="h-6 w-6" />
					Done
				</button>
			</div>
		</div>
	);
}
