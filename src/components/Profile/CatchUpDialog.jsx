import { useEffect, useMemo, useState } from 'react';
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	ReferenceLine,
	Tooltip,
	ResponsiveContainer,
} from 'recharts';
import { LifeBuoy, X } from 'lucide-react';
import { ChartTooltip } from './StatsCard';
import { useChartColors } from './chartTheme';
import { useAppData } from '../../contexts/AppDataContext';
import { useNotification } from '../../hooks/useNotification';
import {
	applyCatchUp,
	countOverdue,
	planCatchUp,
	recentDailyAverage,
} from '../../services/catchUp';
import { formatShortDate } from '../../services/statsCalculations';

const MIN_LIMIT = 5;
const MAX_LIMIT = 150;
const LIMIT_STEP = 5;
// Longer plans are previewed up to this many days
const MAX_PREVIEW_DAYS = 60;

const roundToStep = (value) =>
	Math.min(
		MAX_LIMIT,
		Math.max(MIN_LIMIT, Math.round(value / LIMIT_STEP) * LIMIT_STEP)
	);

const formatDay = (date) =>
	date.toLocaleDateString('en-US', {
		weekday: 'short',
		month: 'short',
		day: 'numeric',
	});

/**
 * CatchUpDialog Component
 *
 * Reschedules overdue cards as if each were graded Hard once, spread over
 * the coming days under a daily limit, with a preview before confirming.
 * `initialDeckId` is null for all active decks.
 */
export default function CatchUpDialog({ initialDeckId = null, onClose }) {
	const colors = useChartColors();
	const { appData, setAppData } = useAppData();
	const { showSuccess } = useNotification();
	const [now] = useState(() => Date.now());
	const [deckId, setDeckId] = useState(initialDeckId);
	const [dailyLimit, setDailyLimit] = useState(() =>
		roundToStep(recentDailyAverage(appData.decks, now) || 20)
	);

	const average = useMemo(
		() => recentDailyAverage(appData.decks, now),
		[appData.decks, now]
	);
	const scopes = useMemo(() => {
		const decks = appData.decks
			.map((deck) => ({
				deckId: deck.deckId,
				label: `${deck.deckName}${deck.isArchived ? ' (archived)' : ''}`,
				count: countOverdue(appData.decks, deck.deckId, now),
			}))
			.filter((deck) => deck.count > 0)
			.sort((a, b) => b.count - a.count);
		return [
			{
				deckId: null,
				label: 'All active decks',
				count: countOverdue(appData.decks, null, now),
			},
			...decks,
		];
	}, [appData.decks, now]);
	const plan = useMemo(
		() => planCatchUp(appData.decks, { dailyLimit, deckId, now }),
		[appData.decks, dailyLimit, deckId, now]
	);

	useEffect(() => {
		const handleKeyDown = (event) => {
			if (event.key === 'Escape') onClose();
		};
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [onClose]);

	const cardCount = plan.items.length;
	const lastDay = plan.days[plan.dayCount - 1];
	const preview = plan.days.slice(0, MAX_PREVIEW_DAYS).map((day, index) => ({
		...day,
		index,
		label: index === 0 ? 'Today' : formatShortDate(day.date),
	}));
	const hiddenDays = plan.days.length - preview.length;
	const axis = { fill: colors.axis, fontSize: 11 };

	const handleConfirm = () => {
		const appliedAt = Date.now();
		setAppData((prev) =>
			applyCatchUp(
				prev,
				planCatchUp(prev.decks, { dailyLimit, deckId, now: appliedAt }),
				appliedAt
			)
		);
		showSuccess(
			`Rescheduled ${cardCount.toLocaleString()} cards over ${plan.dayCount} ${
				plan.dayCount === 1 ? 'day' : 'days'
			}.`
		);
		onClose();
	};

	return (
		<div
			className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4"
			onClick={(e) => e.target === e.currentTarget && onClose()}
		>
			<div
				role="dialog"
				aria-modal="true"
				aria-labelledby="catch-up-title"
				className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-full overflow-y-auto animate-scale-in border border-gray-200 dark:border-slate-700"
			>
				<div className="flex items-start gap-3 p-6 pb-0">
					<div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg shrink-0">
						<LifeBuoy className="h-5 w-5 text-orange-600 dark:text-orange-400" />
					</div>
					<div className="flex-1 min-w-0">
						<h2
							id="catch-up-title"
							className="text-xl font-semibold text-gray-900 dark:text-slate-100"
						>
							Catch up on overdue cards
						</h2>
						<p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
							Each overdue card is rescheduled as if you'd graded
							it Hard: its interval is halved, and it's spread
							over the coming days in your review queue's order
							(most recently due first). No reviews are recorded,
							so your history and stats stay as they are.
						</p>
					</div>
					<button
						onClick={onClose}
						className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 shrink-0"
					>
						<span className="sr-only">Close</span>
						<X className="h-5 w-5" />
					</button>
				</div>

				<div className="p-6 space-y-5">
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<label className="block">
							<span className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
								Cards
							</span>
							<select
								value={deckId ?? ''}
								onChange={(e) =>
									setDeckId(e.target.value || null)
								}
								className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
							>
								{scopes.map((scope) => (
									<option
										key={scope.deckId ?? 'all'}
										value={scope.deckId ?? ''}
									>
										{scope.label} ({scope.count} overdue)
									</option>
								))}
							</select>
						</label>

						<label className="block">
							<span className="flex items-baseline justify-between text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
								Cards per day
								<span className="text-lg font-semibold text-gray-900 dark:text-slate-100 tabular-nums">
									{dailyLimit}
								</span>
							</span>
							<input
								type="range"
								min={MIN_LIMIT}
								max={MAX_LIMIT}
								step={LIMIT_STEP}
								value={dailyLimit}
								onChange={(e) =>
									setDailyLimit(Number(e.target.value))
								}
								className="w-full accent-teal-500"
							/>
							<span className="block text-xs text-gray-500 dark:text-slate-500 mt-1">
								You've averaged {Math.round(average)} reviews a
								day over the last 4 weeks. Cards already due
								count toward the limit.
							</span>
						</label>
					</div>

					{cardCount === 0 ? (
						<p className="text-sm text-gray-600 dark:text-slate-400">
							No overdue cards here. You're caught up!
						</p>
					) : (
						<div>
							<p className="text-sm text-gray-700 dark:text-slate-300 mb-3">
								<span className="font-semibold text-gray-900 dark:text-slate-100">
									{cardCount.toLocaleString()} cards
								</span>{' '}
								over{' '}
								<span className="font-semibold text-gray-900 dark:text-slate-100">
									{plan.dayCount}{' '}
									{plan.dayCount === 1 ? 'day' : 'days'}
								</span>
								, done by {formatDay(lastDay.date)}.
							</p>
							<div className="h-44">
								<ResponsiveContainer width="100%" height="100%">
									<BarChart
										data={preview}
										margin={{
											top: 5,
											right: 5,
											left: -10,
											bottom: 0,
										}}
										barCategoryGap={1}
									>
										<CartesianGrid
											vertical={false}
											stroke={colors.grid}
										/>
										<XAxis
											dataKey="label"
											tick={axis}
											tickLine={false}
											axisLine={{ stroke: colors.grid }}
											minTickGap={16}
										/>
										<YAxis
											allowDecimals={false}
											tick={axis}
											tickLine={false}
											axisLine={false}
										/>
										<Tooltip
											cursor={{ fill: colors.cursor }}
											content={
												<ChartTooltip
													title={(d) =>
														d.index === 0
															? 'Today'
															: formatDay(d.date)
													}
													rows={(d) => [
														[
															'Catch-up',
															d.added.toLocaleString(),
															colors.stageOverdue,
														],
														[
															'Already due',
															d.existing.toLocaleString(),
															colors.primary,
														],
													]}
												/>
											}
										/>

										<Bar
											dataKey="existing"
											stackId="day"
											fill={colors.primary}
											isAnimationActive={false}
										/>
										<Bar
											dataKey="added"
											stackId="day"
											fill={colors.stageOverdue}
											radius={[2, 2, 0, 0]}
											isAnimationActive={false}
										/>
										<ReferenceLine
											y={dailyLimit}
											stroke={colors.ink}
											strokeDasharray="4 3"
										/>
									</BarChart>
								</ResponsiveContainer>
							</div>
							<div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-gray-500 dark:text-slate-400">
								<span className="flex items-center gap-1.5">
									<span
										className="w-2.5 h-2.5 rounded-sm"
										style={{
											backgroundColor:
												colors.stageOverdue,
										}}
									/>
									Catch-up
								</span>
								<span className="flex items-center gap-1.5">
									<span
										className="w-2.5 h-2.5 rounded-sm"
										style={{
											backgroundColor: colors.primary,
										}}
									/>
									Already due
								</span>
								<span className="flex items-center gap-1.5">
									<span
										className="w-4 border-t-2 border-dashed"
										style={{ borderColor: colors.ink }}
									/>
									Daily limit
								</span>
								{hiddenDays > 0 && (
									<span>+{hiddenDays} more days</span>
								)}
							</div>
						</div>
					)}
				</div>

				<div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 px-6 py-4 bg-gray-50 dark:bg-slate-700/50 rounded-b-2xl">
					<p className="text-xs text-gray-500 dark:text-slate-400">
						You can undo this for 24 hours from Coming Up.
					</p>
					<div className="flex gap-3 justify-end">
						<button
							onClick={onClose}
							className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700"
						>
							Cancel
						</button>
						<button
							onClick={handleConfirm}
							disabled={cardCount === 0}
							className="px-4 py-2 text-sm font-medium rounded-lg text-white bg-linear-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
						>
							Reschedule {cardCount.toLocaleString()} cards
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
