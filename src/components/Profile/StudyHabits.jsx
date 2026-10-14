import { useState } from 'react';
import { Clock } from 'lucide-react';
import StatsCard from './StatsCard';
import { RESULT_LABELS, RESULT_SWATCH_CLASSES } from './chartTheme';

// Sunday first, matching Date.getDay() and the activity heatmap
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAY_NAMES = [
	'Sundays',
	'Mondays',
	'Tuesdays',
	'Wednesdays',
	'Thursdays',
	'Fridays',
	'Saturdays',
];

// Same steps as the activity heatmap
const LEVEL_CLASSES = [
	'bg-gray-100 dark:bg-slate-700/50',
	'bg-teal-200 dark:bg-teal-900/60',
	'bg-teal-400 dark:bg-teal-700',
	'bg-teal-600 dark:bg-teal-500',
	'bg-teal-800 dark:bg-teal-300',
];

const formatHour = (hour) => {
	const suffix = hour < 12 ? 'am' : 'pm';
	return `${hour % 12 || 12}${suffix}`;
};

const formatSeconds = (ms) => `${(ms / 1000).toFixed(1)}s`;

/**
 * StudyHabits Component
 *
 * When reviews happen (weekday by hour of day) and how long each grade
 * takes to answer.
 */
export default function StudyHabits({ stats }) {
	const [hovered, setHovered] = useState(null);
	const { habits, totalReviews } = stats;

	if (totalReviews === 0) return null;

	const { punchCard, busiestSlot, reviewsByWeekday, reviewsByHour } = habits;
	const max = busiestSlot.count;
	const level = (count) =>
		count === 0 ? 0 : Math.min(4, Math.ceil((count / max) * 4));

	const favoriteDay = reviewsByWeekday.indexOf(Math.max(...reviewsByWeekday));
	const favoriteHour = reviewsByHour.indexOf(Math.max(...reviewsByHour));

	const timed = habits.medianDurationByResult.filter((r) => r.count > 0);
	const slowest = Math.max(...timed.map((r) => r.median), 1);

	return (
		<StatsCard title="Study Habits" icon={Clock}>
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
				<div className="lg:col-span-2 min-w-0">
					<p className="text-gray-600 dark:text-slate-400 mb-4">
						You study most on{' '}
						<span className="font-semibold text-gray-900 dark:text-slate-100">
							{WEEKDAY_NAMES[favoriteDay]}
						</span>
						, usually around{' '}
						<span className="font-semibold text-gray-900 dark:text-slate-100">
							{formatHour(favoriteHour)}
						</span>
						.
					</p>

					<div
						className="grid gap-0.5 sm:gap-1 items-center"
						style={{
							gridTemplateColumns:
								'auto repeat(24, minmax(0, 1fr)) auto',
						}}
						onMouseLeave={() => setHovered(null)}
					>
						{punchCard.map((hours, day) => [
							<div
								key={`label-${day}`}
								className="text-xs text-gray-500 dark:text-slate-500 pr-2"
							>
								{WEEKDAYS[day]}
							</div>,
							...hours.map((count, hour) => (
								<div
									key={`${day}-${hour}`}
									className={`h-3 sm:h-4 rounded-sm ${LEVEL_CLASSES[level(count)]} ${
										hovered?.day === day &&
										hovered?.hour === hour
											? 'ring-2 ring-gray-400 dark:ring-slate-400'
											: ''
									}`}
									onMouseEnter={() =>
										setHovered({ day, hour, count })
									}
									title={`${WEEKDAYS[day]} ${formatHour(hour)}: ${count} reviews`}
								/>
							)),
							<div
								key={`total-${day}`}
								className={`text-xs text-right tabular-nums pl-2 ${
									day === favoriteDay
										? 'font-semibold text-gray-900 dark:text-slate-100'
										: 'text-gray-600 dark:text-slate-400'
								}`}
							>
								{reviewsByWeekday[day].toLocaleString()}
							</div>,
						])}
						<div />
						{Array.from({ length: 24 }, (_, hour) => (
							<div
								key={`hour-${hour}`}
								className="text-xs text-gray-500 dark:text-slate-500 pt-1 whitespace-nowrap overflow-visible"
							>
								{hour % 6 === 0 ? formatHour(hour) : ''}
							</div>
						))}
						<div className="text-xs text-right text-gray-500 dark:text-slate-500 pt-1 pl-2">
							Total
						</div>
					</div>
					<p className="mt-3 text-sm text-gray-500 dark:text-slate-400 h-5">
						{hovered
							? `${WEEKDAY_NAMES[hovered.day]} at ${formatHour(hovered.hour)}: ${hovered.count.toLocaleString()} reviews`
							: 'Hover a cell to see the count.'}
					</p>
				</div>

				<div className="min-w-0">
					<h3 className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
						Time to answer
					</h3>
					<p className="text-xs text-gray-500 dark:text-slate-500 mb-4">
						Median seconds per review, by grade.
					</p>
					{timed.length === 0 ? (
						<p className="text-sm text-gray-500 dark:text-slate-400">
							No timed reviews yet.
						</p>
					) : (
						<ul className="space-y-3">
							{timed.map((r) => (
								<li key={r.result}>
									<div className="flex items-center justify-between text-sm mb-1">
										<span className="text-gray-700 dark:text-slate-300">
											{RESULT_LABELS[r.result]}
										</span>
										<span className="font-semibold text-gray-900 dark:text-slate-100 tabular-nums">
											{formatSeconds(r.median)}
										</span>
									</div>
									<div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
										<div
											className={`h-full rounded-full ${RESULT_SWATCH_CLASSES[r.result]}`}
											style={{
												width: `${(r.median / slowest) * 100}%`,
											}}
										/>
									</div>
								</li>
							))}
						</ul>
					)}
				</div>
			</div>
		</StatsCard>
	);
}
