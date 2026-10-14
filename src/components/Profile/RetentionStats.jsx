import {
	BarChart,
	Bar,
	Cell,
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
} from 'recharts';
import { Brain } from 'lucide-react';
import StatsCard, { ChartTooltip, EmptyState } from './StatsCard';
import { useChartColors, RESULT_LABELS } from './chartTheme';
import { RESULT_SCORES } from '../../services/cardCalculations';
import {
	RESULTS,
	formatPercent,
	formatShortDate,
} from '../../services/statsCalculations';

// Buckets with fewer reviews than this are drawn faded: too few to trust
const MIN_BUCKET_SAMPLE = 20;

const percentTick = (value) => `${Math.round(value * 100)}%`;

const formatScoreScale = () =>
	RESULTS.map(
		(result) =>
			`${RESULT_LABELS[result]} ${Math.round(RESULT_SCORES[result] * 100)}%`
	).join(', ');

/**
 * RetentionStats Component
 *
 * How well cards are remembered when they come back, scored by grade
 * (Again 0% up to Easy 100%), by time since the previous review and by week.
 */
export default function RetentionStats({ stats }) {
	const colors = useChartColors();
	const { retention } = stats;

	if (retention.sample === 0) {
		return (
			<StatsCard title="Memory" icon={Brain}>
				<EmptyState>
					Review some cards a second time to see how well you remember
					them.
				</EmptyState>
			</StatsCard>
		);
	}

	const byGap = retention.byGap.filter((bucket) => bucket.total > 0);
	const trustedBuckets = byGap.filter(
		(bucket) => bucket.total >= MIN_BUCKET_SAMPLE
	);
	const longest = trustedBuckets[trustedBuckets.length - 1];
	const lowestWeekly = Math.min(...retention.byWeek.map((w) => w.rate));
	const weeklyFloor = Math.max(
		0,
		Math.floor((lowestWeekly - 0.05) * 10) / 10
	);
	// Ticks on round percentages: every 10% for a tall range, else every 5%
	const weeklyStep = 1 - weeklyFloor > 0.3 ? 0.1 : 0.05;
	const weeklyTicks = Array.from(
		{ length: Math.round((1 - weeklyFloor) / weeklyStep) + 1 },
		(_, i) => weeklyFloor + i * weeklyStep
	);

	const axis = { fill: colors.axis, fontSize: 12 };

	return (
		<StatsCard title="Memory" icon={Brain}>
			<p className="text-gray-600 dark:text-slate-400 mb-6">
				Your recall score is{' '}
				<span className="font-semibold text-gray-900 dark:text-slate-100">
					{formatPercent(retention.overall)}
				</span>{' '}
				when cards come back
				{longest && longest !== trustedBuckets[0] && (
					<>
						, and{' '}
						<span className="font-semibold text-gray-900 dark:text-slate-100">
							{formatPercent(longest.rate)}
						</span>{' '}
						after gaps of {longest.label}
					</>
				)}
				.
			</p>
			<p className="text-xs text-gray-500 dark:text-slate-500 -mt-4 mb-6">
				Each review scores {formatScoreScale()}.
			</p>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
				<div className="min-w-0">
					<h3 className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
						Recall score by time since last review
					</h3>
					<p className="text-xs text-gray-500 dark:text-slate-500 mb-3">
						Faded bars have fewer than {MIN_BUCKET_SAMPLE} reviews.
					</p>
					<div className="h-56">
						<ResponsiveContainer width="100%" height="100%">
							<BarChart
								data={byGap}
								margin={{
									top: 5,
									right: 5,
									left: 0,
									bottom: 0,
								}}
							>
								<CartesianGrid
									vertical={false}
									stroke={colors.grid}
								/>
								<XAxis
									dataKey="short"
									tick={{ ...axis, fontSize: 11 }}
									tickLine={false}
									axisLine={{ stroke: colors.grid }}
									interval={0}
								/>
								<YAxis
									domain={[0, 1]}
									ticks={[0, 0.25, 0.5, 0.75, 1]}
									tickFormatter={percentTick}
									tick={axis}
									tickLine={false}
									axisLine={false}
									width={44}
								/>
								<Tooltip
									cursor={{ fill: colors.cursor }}
									content={
										<ChartTooltip
											title={(d) =>
												`${d.label} since last review`
											}
											rows={(d) => [
												[
													'Recall score',
													formatPercent(d.rate),
												],
												[
													'Reviews',
													d.total.toLocaleString(),
												],
											]}
										/>
									}
								/>
								<Bar
									dataKey="rate"
									radius={[4, 4, 0, 0]}
									maxBarSize={48}
								>
									{byGap.map((bucket) => (
										<Cell
											key={bucket.label}
											fill={colors.primary}
											fillOpacity={
												bucket.total >=
												MIN_BUCKET_SAMPLE
													? 1
													: 0.35
											}
										/>
									))}
								</Bar>
							</BarChart>
						</ResponsiveContainer>
					</div>
				</div>

				<div className="min-w-0">
					<h3 className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
						Recall score by week
					</h3>
					<p className="text-xs text-gray-500 dark:text-slate-500 mb-3">
						Weeks with at least 10 repeat reviews.
					</p>
					<div className="h-56">
						{retention.byWeek.length > 1 ? (
							<ResponsiveContainer width="100%" height="100%">
								<LineChart
									data={retention.byWeek}
									margin={{
										top: 5,
										right: 10,
										left: -10,
										bottom: 0,
									}}
								>
									<CartesianGrid
										vertical={false}
										stroke={colors.grid}
									/>
									<XAxis
										dataKey="weekStart"
										type="number"
										scale="time"
										domain={['dataMin', 'dataMax']}
										tickFormatter={(t) =>
											formatShortDate(t)
										}
										tick={axis}
										tickLine={false}
										axisLine={{ stroke: colors.grid }}
										minTickGap={24}
									/>
									<YAxis
										domain={[weeklyFloor, 1]}
										ticks={weeklyTicks}
										tickFormatter={percentTick}
										tick={axis}
										tickLine={false}
										axisLine={false}
									/>
									<Tooltip
										cursor={{ stroke: colors.axis }}
										content={
											<ChartTooltip
												title={(d) =>
													`Week of ${formatShortDate(d.weekStart, true)}`
												}
												rows={(d) => [
													[
														'Recall score',
														formatPercent(d.rate),
													],
													[
														'Repeat reviews',
														d.total.toLocaleString(),
													],
												]}
											/>
										}
									/>
									<Line
										type="monotone"
										dataKey="rate"
										stroke={colors.primary}
										strokeWidth={2}
										dot={false}
										activeDot={{ r: 4 }}
									/>
								</LineChart>
							</ResponsiveContainer>
						) : (
							<EmptyState>
								Not enough weeks of reviews yet.
							</EmptyState>
						)}
					</div>
				</div>
			</div>
		</StatsCard>
	);
}
