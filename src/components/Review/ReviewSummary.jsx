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
	Flame,
	FastForward,
	Undo2,
} from 'lucide-react';
import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
	calculateAverageMastery,
	calculateReviewedCardsBurden,
	calculateCardCounts,
} from '../../services/cardCalculations';

const CONFETTI_COLORS = ['#14b8a6', '#06b6d4', '#10b981', '#f59e0b'];

function celebrate() {
	const fire = (options) =>
		confetti({
			particleCount: 70,
			spread: 65,
			startVelocity: 55,
			colors: CONFETTI_COLORS,
			disableForReducedMotion: true,
			...options,
		});
	fire({ angle: 60, origin: { x: 0, y: 0.75 } });
	fire({ angle: 120, origin: { x: 1, y: 0.75 } });
}

function getRecallMessage(recallPercent) {
	if (recallPercent >= 90)
		return `Outstanding recall: ${recallPercent}% right.`;
	if (recallPercent >= 70) return `Solid session: ${recallPercent}% right.`;
	return "The tough ones will come back sooner. That's how they stick.";
}

export default function ReviewSummary({
	sessionReviews,
	cardsCollectionBefore,
	cardsCollectionAfter,
	onClose,
	isComplete = false,
	studyAheadCount = 0,
	onStudyAhead,
	onUndo,
	canUndo = false,
	streak = 0,
}) {
	// Fire once per summary, even under StrictMode's double effects
	const hasCelebratedRef = useRef(false);
	useEffect(() => {
		if (
			isComplete &&
			sessionReviews.length > 0 &&
			!hasCelebratedRef.current
		) {
			hasCelebratedRef.current = true;
			celebrate();
		}
	}, [isComplete, sessionReviews.length]);

	// Enter finishes, Z takes back the last card
	const summaryRef = useRef(null);
	useEffect(() => {
		const handleKeyDown = (event) => {
			const { tagName, isContentEditable } = event.target;
			if (
				tagName === 'INPUT' ||
				tagName === 'TEXTAREA' ||
				tagName === 'SELECT' ||
				isContentEditable
			) {
				return;
			}
			if (event.key === 'Escape') {
				event.preventDefault();
				onClose();
			} else if (event.key === 'Enter') {
				// A focused button in the summary handles its own Enter
				if (
					tagName === 'BUTTON' &&
					summaryRef.current?.contains(event.target)
				) {
					return;
				}
				event.preventDefault();
				onClose();
			} else if (
				(event.key === 'z' || event.key === 'Z') &&
				!event.altKey &&
				canUndo
			) {
				event.preventDefault();
				onUndo?.();
			}
		};
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [onClose, onUndo, canUndo]);

	// Calculate session statistics
	const totalReviewed = sessionReviews.length;
	const resultCounts = {
		again: sessionReviews.filter((r) => r.result === 'again').length,
		hard: sessionReviews.filter((r) => r.result === 'hard').length,
		good: sessionReviews.filter((r) => r.result === 'good').length,
		easy: sessionReviews.filter((r) => r.result === 'easy').length,
	};

	// Calculate total review time
	const totalReviewTime = sessionReviews.reduce(
		(sum, review) => sum + (review.reviewDuration || 0),
		0
	);

	// Calculate average time per card
	const avgTimePerCard =
		totalReviewed > 0 ? totalReviewTime / totalReviewed : 0;

	// Format review time as minutes:seconds
	const formatReviewTime = (ms) => {
		if (!ms || ms === 0) return '0:00';
		const totalSeconds = Math.floor(ms / 1000);
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds % 60;
		return `${minutes}:${seconds.toString().padStart(2, '0')}`;
	};

	// Calculate percentages
	const getPercentage = (count) =>
		totalReviewed > 0 ? Math.round((count / totalReviewed) * 100) : 0;

	// Calculate metrics before and after for a card collection (deck or folder)
	const calculateCardCollectionMetrics = (cardCollection) => {
		const cards = cardCollection?.cards || [];
		if (cards.length === 0) {
			return {
				avgMastery: 0,
				totalBurden: 0,
				dueCount: 0,
				newCount: 0,
				learnedCount: 0,
			};
		}

		const counts = calculateCardCounts(cards);
		return {
			avgMastery: calculateAverageMastery(cards),
			totalBurden: calculateReviewedCardsBurden(cards),
			dueCount: counts.dueCount,
			newCount: counts.newCount,
			learnedCount: counts.learnedCount,
		};
	};

	const metricsBefore = calculateCardCollectionMetrics(cardsCollectionBefore);
	const metricsAfter = calculateCardCollectionMetrics(cardsCollectionAfter);

	// Calculate changes
	const masteryChange = metricsAfter.avgMastery - metricsBefore.avgMastery;
	const burdenChange = metricsAfter.totalBurden - metricsBefore.totalBurden;

	const recallPercent = getPercentage(resultCounts.good + resultCounts.easy);
	const cardsWord = `card${totalReviewed !== 1 ? 's' : ''}`;
	const timeText =
		totalReviewTime > 0 ? ` in ${formatReviewTime(totalReviewTime)}` : '';

	let headline;
	let subheadline;
	if (isComplete && metricsAfter.dueCount === 0) {
		headline = 'All caught up!';
		subheadline = `${totalReviewed} ${cardsWord}${timeText}. Nothing else is due right now.`;
	} else if (isComplete) {
		headline = 'Session complete!';
		subheadline = `${totalReviewed} ${cardsWord} reviewed${timeText}.`;
	} else {
		headline = totalReviewed > 0 ? 'Nice work!' : 'See you soon';
		subheadline =
			metricsAfter.dueCount > 0
				? `${totalReviewed} ${cardsWord}${timeText}. ${metricsAfter.dueCount} still due whenever you're ready.`
				: `${totalReviewed} ${cardsWord} reviewed${timeText}.`;
	}

	// Trend indicator component
	const TrendIndicator = ({ value, suffix = '', invertColors = false }) => {
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
				? 'text-red-500'
				: 'text-green-500'
			: isPositive
				? 'text-green-500'
				: 'text-red-500';

		const Icon = isPositive ? TrendingUp : TrendingDown;

		return (
			<span className={`flex items-center gap-1 ${color}`}>
				<Icon className="h-4 w-4" />
				<span>
					{isPositive ? '+' : ''}
					{value.toFixed(1)}
					{suffix}
				</span>
			</span>
		);
	};

	return (
		<div ref={summaryRef} className="mx-auto max-w-5xl animate-scale-in">
			{/* Hero */}
			<div className="text-center">
				<div
					className="text-5xl sm:text-6xl mb-3 animate-pop-in"
					aria-hidden="true"
				>
					{isComplete ? '🎉' : '👏'}
				</div>
				<h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
					{headline}
				</h2>
				<p className="mt-2 text-gray-600 dark:text-slate-300">
					{subheadline}
				</p>
				{totalReviewed > 0 && (
					<p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
						{getRecallMessage(recallPercent)}
					</p>
				)}
				{streak > 0 && (
					<div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full border bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-sm font-medium text-orange-700 dark:text-orange-300">
						<Flame className="h-4 w-4 text-orange-500" />
						{streak}-day streak
					</div>
				)}

				<div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
					<button
						onClick={onClose}
						className="inline-flex items-center gap-3 px-8 py-4 bg-linear-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
					>
						<CheckCircle className="h-6 w-6" />
						Done
					</button>
					{studyAheadCount > 0 && onStudyAhead && (
						<button
							onClick={onStudyAhead}
							className="inline-flex items-center gap-2 px-6 py-4 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 font-medium rounded-xl transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
							title="Review cards that aren't due yet"
						>
							<FastForward className="h-5 w-5" />
							Study ahead ({studyAheadCount} not due yet)
						</button>
					)}
				</div>
				{canUndo && onUndo && (
					<button
						onClick={onUndo}
						className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg transition-colors"
						title="Undo last review (Z)"
					>
						<Undo2 className="h-4 w-4" />
						Undo last card
					</button>
				)}
			</div>

			{/* Main content: Cards Reviewed + Deck Metrics in responsive grid */}
			<div className="mt-6 grid gap-6 md:grid-cols-2">
				{/* Cards Reviewed */}
				<div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg border border-white/20 dark:border-slate-700/50 rounded-2xl shadow-xl p-6">
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
							card{totalReviewed !== 1 ? 's' : ''} this session
						</div>
						{totalReviewed > 0 && totalReviewTime > 0 && (
							<div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
								<div className="grid grid-cols-2 gap-4">
									{/* Total Review Time */}
									<div className="text-center">
										<div className="flex items-center justify-center gap-2 mb-1">
											<Clock className="h-5 w-5 text-teal-500" />
											<div className="text-2xl font-semibold text-gray-900 dark:text-white">
												{formatReviewTime(
													totalReviewTime
												)}
											</div>
										</div>
										<div className="text-sm text-gray-500 dark:text-gray-400">
											Total review time
										</div>
									</div>
									{/* Average Time Per Card */}
									<div className="text-center">
										<div className="flex items-center justify-center gap-2 mb-1">
											<Clock className="h-5 w-5 text-cyan-500" />
											<div className="text-2xl font-semibold text-gray-900 dark:text-white">
												{formatReviewTime(
													avgTimePerCard
												)}
											</div>
										</div>
										<div className="text-sm text-gray-500 dark:text-gray-400">
											Avg time per card
										</div>
									</div>
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
					<div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg border border-white/20 dark:border-slate-700/50 rounded-2xl shadow-xl p-6">
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
											{metricsBefore.avgMastery.toFixed(
												1
											)}
											%{' '}
											<ArrowRight className="h-3 w-3 inline" />{' '}
											{metricsAfter.avgMastery.toFixed(1)}
											%
										</div>
									</div>
								</div>
								<TrendIndicator
									value={masteryChange}
									suffix="%"
								/>
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
											{metricsBefore.totalBurden.toFixed(
												1
											)}{' '}
											<ArrowRight className="h-3 w-3 inline" />{' '}
											{metricsAfter.totalBurden.toFixed(
												1
											)}{' '}
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
												? '+'
												: ''}
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
												? '+'
												: ''}
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
												? '+'
												: ''}
											{metricsAfter.learnedCount -
												metricsBefore.learnedCount}
										</div>
									)}
								</div>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
