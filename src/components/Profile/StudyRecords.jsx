import { Trophy } from 'lucide-react';
import StatsCard, { StatTile } from './StatsCard';
import {
	formatDuration,
	formatShortDate,
} from '../../services/statsCalculations';

const plural = (count, word) =>
	`${count.toLocaleString()} ${word}${count === 1 ? '' : 's'}`;

/**
 * StudyRecords Component
 *
 * Personal bests and totals: streaks, best day and week, time, sessions.
 */
export default function StudyRecords({ stats }) {
	const { records, totalReviews } = stats;

	if (totalReviews === 0) return null;

	const { longestStreak, bestDay, bestWeek, longestSession } = records;
	const longestIsCurrent =
		records.currentStreak > 0 &&
		records.currentStreak === longestStreak.length;

	return (
		<StatsCard title="Records" icon={Trophy}>
			<div className="grid grid-cols-2 md:grid-cols-3 gap-3">
				<StatTile
					label="Current streak"
					value={plural(records.currentStreak, 'day')}
					detail={
						longestIsCurrent
							? 'Your longest ever!'
							: `${plural(
									longestStreak.length -
										records.currentStreak +
										1,
									'day'
								)} to beat your best`
					}
				/>
				<StatTile
					label="Longest streak"
					value={plural(longestStreak.length, 'day')}
					detail={
						longestStreak.start &&
						`${formatShortDate(
							longestStreak.start,
							longestStreak.start.getFullYear() !==
								longestStreak.end.getFullYear()
						)} – ${formatShortDate(longestStreak.end, true)}`
					}
				/>
				<StatTile
					label="Best day"
					value={plural(bestDay.count, 'review')}
					detail={formatShortDate(bestDay.date, true)}
				/>
				<StatTile
					label="Best week"
					value={plural(bestWeek.count, 'review')}
					detail={`Week of ${formatShortDate(bestWeek.start, true)}`}
				/>
				<StatTile
					label="Time studying"
					value={formatDuration(records.studyTime)}
					detail="Timed reviews, max 60s each"
				/>
				<StatTile
					label="Sessions"
					value={records.sessionCount.toLocaleString()}
					detail={`~${Math.round(records.averageSessionReviews)} reviews, ${formatDuration(records.averageSessionLength)} avg`}
				/>
			</div>
			{longestSession && longestSession.reviews > 1 && (
				<p className="mt-4 text-sm text-gray-600 dark:text-slate-400">
					Your biggest session was{' '}
					<span className="font-semibold text-gray-900 dark:text-slate-100">
						{plural(longestSession.reviews, 'review')}
					</span>{' '}
					in{' '}
					{formatDuration(longestSession.end - longestSession.start)}{' '}
					on {formatShortDate(longestSession.start, true)}.
				</p>
			)}
		</StatsCard>
	);
}
