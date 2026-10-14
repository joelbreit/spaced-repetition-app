import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
} from 'recharts';
import { CalendarClock } from 'lucide-react';
import StatsCard, { ChartTooltip, StatTile } from './StatsCard';
import { useChartColors } from './chartTheme';
import {
	FORECAST_DAYS,
	formatShortDate,
} from '../../services/statsCalculations';

const formatDay = (date, index) => {
	if (index === 0) return 'Today';
	if (index === 1) return 'Tomorrow';
	return date.toLocaleDateString('en-US', {
		weekday: 'short',
		month: 'short',
		day: 'numeric',
	});
};

/**
 * DueForecast Component
 *
 * Studied cards coming due each day for the next 30 days. Cards already
 * overdue from before today are stacked onto today's bar.
 */
export default function DueForecast({ stats }) {
	const colors = useChartColors();
	const data = stats.forecast.map((day, index) => ({
		...day,
		index,
		label: formatShortDate(day.date),
		total: day.due + day.overdue,
	}));

	const today = data[0].total;
	const nextWeek = data.slice(0, 7).reduce((sum, d) => sum + d.total, 0);
	const busiest = data
		.slice(1)
		.reduce((best, d) => (d.total > best.total ? d : best), data[1]);
	const hasOverdue = data[0].overdue > 0;
	const axis = { fill: colors.axis, fontSize: 12 };

	return (
		<StatsCard title="Coming Up" icon={CalendarClock}>
			<div className="grid grid-cols-3 gap-3 mb-6">
				<StatTile
					label="Today"
					value={today.toLocaleString()}
					detail={
						hasOverdue
							? `${data[0].overdue.toLocaleString()} overdue`
							: 'cards due'
					}
				/>
				<StatTile
					label="Next 7 days"
					value={nextWeek.toLocaleString()}
					detail="incl. today"
				/>
				<StatTile
					label="Busiest day"
					value={busiest.total.toLocaleString()}
					detail={
						busiest.total > 0
							? formatDay(busiest.date, busiest.index)
							: '–'
					}
				/>
			</div>

			<div className="h-56">
				<ResponsiveContainer width="100%" height="100%">
					<BarChart
						data={data}
						margin={{ top: 5, right: 5, left: -10, bottom: 0 }}
						barCategoryGap={2}
					>
						<CartesianGrid vertical={false} stroke={colors.grid} />
						<XAxis
							dataKey="label"
							tick={axis}
							tickLine={false}
							axisLine={{ stroke: colors.grid }}
							interval={6}
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
									title={(d) => formatDay(d.date, d.index)}
									rows={(d) =>
										d.overdue > 0
											? [
													[
														'Overdue',
														d.overdue.toLocaleString(),
														colors.hard,
													],
													[
														'Due today',
														d.due.toLocaleString(),
														colors.primary,
													],
												]
											: [
													[
														'Due',
														d.due.toLocaleString(),
														colors.primary,
													],
												]
									}
								/>
							}
						/>
						{hasOverdue && (
							<Bar
								dataKey="overdue"
								stackId="due"
								fill={colors.hard}
								name="Overdue"
							/>
						)}
						<Bar
							dataKey="due"
							stackId="due"
							fill={colors.primary}
							radius={[4, 4, 0, 0]}
							name="Due"
						/>
					</BarChart>
				</ResponsiveContainer>
			</div>
			<div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-gray-500 dark:text-slate-400">
				<span className="flex items-center gap-1.5">
					<span className="w-2.5 h-2.5 rounded-sm bg-teal-500 dark:bg-teal-400" />
					Due that day
				</span>
				{hasOverdue && (
					<span className="flex items-center gap-1.5">
						<span className="w-2.5 h-2.5 rounded-sm bg-orange-500 dark:bg-orange-400" />
						Overdue from earlier
					</span>
				)}
				<span>Next {FORECAST_DAYS} days · archived decks excluded</span>
			</div>
		</StatsCard>
	);
}
