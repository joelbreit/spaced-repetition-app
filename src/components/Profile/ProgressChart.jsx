import { useMemo, useState } from 'react';
import {
	AreaChart,
	Area,
	ComposedChart,
	Bar,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	ReferenceLine,
	Tooltip,
	ResponsiveContainer,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import StatsCard, {
	ChartTooltip,
	EmptyState,
	SegmentedControl,
} from './StatsCard';
import { useChartColors } from './chartTheme';
import {
	computeDailyHistory,
	describeOverdue,
	formatShortDate,
	startOfWeek,
} from '../../services/statsCalculations';

const RANGES = [
	{ value: 30, label: '30d' },
	{ value: 90, label: '90d' },
	{ value: 365, label: '1y' },
	{ value: Infinity, label: 'All' },
];

// Ranges longer than this show reviews per week instead of per day
const MAX_DAILY_RANGE = 90;

// Studied stages stack upward from the horizon line, top of the list on top.
// Overdue cards sit right above the line, whatever stage they're in.
const STUDIED_STAGES = [
	{ key: 'mature', label: 'Mature', color: 'stageMature' },
	{ key: 'young', label: 'Young', color: 'stageYoung' },
	{ key: 'learning', label: 'Learning', color: 'stageLearning' },
	{ key: 'overdue', label: 'Overdue', color: 'stageOverdue' },
];

const overdueBreakdown = (day) =>
	describeOverdue({
		learning: day.overdueLearning,
		young: day.overdueYoung,
		mature: day.overdueMature,
	});

// Weekly totals over the whole history, so the first week in a range is
// complete. The average is the trailing 28 days scaled to a week, taken at
// the week's last day (today, for the current week).
function groupByWeek(days, fromTimestamp) {
	const weeks = new Map();
	days.forEach((day) => {
		const weekStart = startOfWeek(day.timestamp).getTime();
		if (weekStart < fromTimestamp) return;
		const week = weeks.get(weekStart) || {
			timestamp: weekStart,
			reviews: 0,
			dayCount: 0,
		};
		week.reviews += day.reviews;
		week.dayCount++;
		week.average = day.average28 * 7;
		weeks.set(weekStart, week);
	});
	return [...weeks.values()];
}

const formatCount = (value) => Math.round(value).toLocaleString();

/**
 * ProgressChart Component
 *
 * Card maturity over time, drawn as an iceberg: new cards sit below the
 * horizon line and studied cards stack above it by stage. Next to it,
 * reviews per day (or week) with a rolling average.
 */
export default function ProgressChart({ appData }) {
	const colors = useChartColors();
	const [range, setRange] = useState(90);

	const daily = useMemo(() => computeDailyHistory(appData), [appData]);

	if (daily.length === 0) {
		return (
			<StatsCard title="Study Progress" icon={TrendingUp}>
				<EmptyState>
					No data available yet. Start studying to see your progress!
				</EmptyState>
			</StatsCard>
		);
	}

	const visibleDays = Number.isFinite(range) ? daily.slice(-range) : daily;
	const isWeekly = visibleDays.length > MAX_DAILY_RANGE;
	const reviewData = isWeekly
		? groupByWeek(daily, startOfWeek(visibleDays[0].timestamp).getTime())
		: visibleDays.map((day) => ({ ...day, average: day.average7 }));
	const averageLabel = isWeekly ? '4-week average' : '7-day average';
	const reviewsInRange = visibleDays.reduce((sum, d) => sum + d.reviews, 0);

	const cardData = visibleDays.map((day) => ({
		...day,
		studied: day.learning + day.young + day.mature + day.overdue,
		// Negative so it stacks below the horizon line
		newBelow: -day.new,
	}));
	const last = cardData[cardData.length - 1];
	// Count from the end of the day before the range, so cards created or
	// first studied on its first day are included (nothing before history)
	const before = daily[daily.length - visibleDays.length - 1];
	const studiedOn = (day) =>
		day ? day.learning + day.young + day.mature + day.overdue : 0;
	const created =
		last.studied + last.new - (studiedOn(before) + (before?.new || 0));
	const newlyStudied = last.studied - studiedOn(before);

	const axis = { fill: colors.axis, fontSize: 12 };
	const xAxisProps = {
		dataKey: 'timestamp',
		type: 'number',
		scale: 'time',
		domain: ['dataMin', 'dataMax'],
		tickFormatter: (t) => formatShortDate(t),
		tick: axis,
		tickLine: false,
		axisLine: false,
		minTickGap: 32,
	};
	const yAxisProps = {
		tick: axis,
		tickLine: false,
		axisLine: false,
		allowDecimals: false,
		width: 44,
	};

	return (
		<StatsCard
			title="Study Progress"
			icon={TrendingUp}
			action={
				<SegmentedControl
					label="Time range"
					options={RANGES}
					value={range}
					onChange={setRange}
				/>
			}
		>
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
				<div className="min-w-0">
					<h3 className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
						Cards by maturity
					</h3>
					<p className="text-xs text-gray-500 dark:text-slate-500 mb-3">
						{created > 0
							? `+${created.toLocaleString()} created, `
							: ''}
						{newlyStudied > 0
							? `+${newlyStudied.toLocaleString()} studied for the first time`
							: 'No new cards studied in this range'}
					</p>
					<div className="h-56">
						<ResponsiveContainer width="100%" height="100%">
							<AreaChart
								data={cardData}
								stackOffset="sign"
								margin={{
									top: 5,
									right: 10,
									left: 0,
									bottom: 0,
								}}
							>
								<CartesianGrid
									vertical={false}
									stroke={colors.grid}
								/>
								<XAxis {...xAxisProps} />
								<YAxis
									{...yAxisProps}
									tickFormatter={(v) =>
										Math.abs(v).toLocaleString()
									}
								/>
								<Tooltip
									cursor={{ stroke: colors.axis }}
									content={
										<ChartTooltip
											title={(d) =>
												formatShortDate(
													d.timestamp,
													true
												)
											}
											rows={(d) => [
												...STUDIED_STAGES.map(
													(stage) => [
														stage.label,
														stage.key ===
															'overdue' &&
														d.overdue > 0
															? `${d.overdue.toLocaleString()} (${overdueBreakdown(d)})`
															: d[
																	stage.key
																].toLocaleString(),
														colors[stage.color],
													]
												),
												[
													'New (below line)',
													d.new.toLocaleString(),
													colors.stageNew,
												],
												[
													'Studied / total',
													`${d.studied.toLocaleString()} / ${(d.studied + d.new).toLocaleString()}`,
												],
											]}
										/>
									}
								/>
								<Area
									dataKey="newBelow"
									stackId="cards"
									type="linear"
									fill={colors.stageNew}
									fillOpacity={1}
									stroke={colors.surface}
									strokeWidth={1}
									isAnimationActive={false}
								/>
								{[...STUDIED_STAGES].reverse().map((stage) => (
									<Area
										key={stage.key}
										dataKey={stage.key}
										stackId="cards"
										type="linear"
										fill={colors[stage.color]}
										fillOpacity={1}
										stroke={colors.surface}
										strokeWidth={1}
										isAnimationActive={false}
									/>
								))}
								<ReferenceLine
									y={0}
									stroke={colors.ink}
									strokeWidth={1.5}
								/>
							</AreaChart>
						</ResponsiveContainer>
					</div>
					<div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-gray-500 dark:text-slate-400">
						{STUDIED_STAGES.map((stage) => (
							<span
								key={stage.key}
								className="flex items-center gap-1.5"
							>
								<span
									className="w-2.5 h-2.5 rounded-sm"
									style={{
										backgroundColor: colors[stage.color],
									}}
								/>
								{stage.label} (
								{last[stage.key].toLocaleString()})
							</span>
						))}
						<span className="flex items-center gap-1.5">
							<span
								className="w-2.5 h-2.5 rounded-sm"
								style={{ backgroundColor: colors.stageNew }}
							/>
							New, below the line ({last.new.toLocaleString()})
						</span>
					</div>
				</div>

				<div className="min-w-0">
					<h3 className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
						Reviews per {isWeekly ? 'week' : 'day'}
					</h3>
					<p className="text-xs text-gray-500 dark:text-slate-500 mb-3">
						{reviewsInRange.toLocaleString()} reviews in this range
					</p>
					<div className="h-56">
						<ResponsiveContainer width="100%" height="100%">
							<ComposedChart
								data={reviewData}
								margin={{
									top: 5,
									right: 10,
									left: 0,
									bottom: 0,
								}}
								barCategoryGap={1}
							>
								<CartesianGrid
									vertical={false}
									stroke={colors.grid}
								/>
								<XAxis
									{...xAxisProps}
									axisLine={{ stroke: colors.grid }}
									scale="auto"
									padding={{ left: 6, right: 6 }}
								/>
								<YAxis {...yAxisProps} />
								<Tooltip
									cursor={{ fill: colors.cursor }}
									content={
										<ChartTooltip
											title={(d) =>
												isWeekly
													? `Week of ${formatShortDate(d.timestamp, true)}${d.dayCount < 7 ? ' (so far)' : ''}`
													: formatShortDate(
															d.timestamp,
															true
														)
											}
											rows={(d) => [
												[
													'Reviews',
													d.reviews.toLocaleString(),
													colors.primary,
												],
												[
													averageLabel,
													formatCount(d.average),
													colors.ink,
												],
											]}
										/>
									}
								/>
								<Bar
									dataKey="reviews"
									fill={colors.primary}
									fillOpacity={0.75}
									radius={[2, 2, 0, 0]}
									isAnimationActive={false}
								/>
								<Line
									dataKey="average"
									type="monotone"
									stroke={colors.ink}
									strokeWidth={2}
									dot={false}
									activeDot={{ r: 4 }}
									isAnimationActive={false}
								/>
							</ComposedChart>
						</ResponsiveContainer>
					</div>
					<div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-gray-500 dark:text-slate-400">
						<span className="flex items-center gap-1.5">
							<span
								className="w-2.5 h-2.5 rounded-sm"
								style={{ backgroundColor: colors.primary }}
							/>
							Reviews
						</span>
						<span className="flex items-center gap-1.5">
							<span
								className="w-4 h-0.5"
								style={{ backgroundColor: colors.ink }}
							/>
							{averageLabel}
						</span>
					</div>
				</div>
			</div>
		</StatsCard>
	);
}
