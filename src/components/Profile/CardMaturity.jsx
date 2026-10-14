import { Sprout } from 'lucide-react';
import StatsCard, { EmptyState } from './StatsCard';
import { describeOverdue } from '../../services/statsCalculations';

// Studied stages use one hue, light to dark, since they're an ordered
// progression. Overdue is a state rather than a stage, so it gets the
// orange used for overdue cards elsewhere (Coming Up).
const STAGES = [
	{
		key: 'new',
		label: 'New',
		description: 'Never studied',
		className: 'bg-gray-300 dark:bg-slate-600',
	},
	{
		key: 'overdue',
		label: 'Overdue',
		className: 'bg-orange-500 dark:bg-orange-400',
	},
	{
		key: 'learning',
		label: 'Learning',
		description: 'Interval under a day',
		className: 'bg-teal-200 dark:bg-teal-700',
	},
	{
		key: 'young',
		label: 'Young',
		description: 'Interval 1–21 days',
		className: 'bg-teal-400 dark:bg-teal-500',
	},
	{
		key: 'mature',
		label: 'Mature',
		description: 'Interval 21+ days',
		className: 'bg-teal-700 dark:bg-teal-300',
	},
];

/**
 * CardMaturity Component
 *
 * Where every active (non-archived) card sits on the way from new to mature.
 * Studied cards past their due date are counted as overdue instead.
 */
export default function CardMaturity({ stats }) {
	const { maturity, overdueByStage } = stats;
	const total = STAGES.reduce((sum, stage) => sum + maturity[stage.key], 0);
	const allMature = maturity.mature + overdueByStage.mature;

	return (
		<StatsCard title="Card Maturity" icon={Sprout}>
			{total === 0 ? (
				<EmptyState>No active cards yet.</EmptyState>
			) : (
				<>
					<p className="text-gray-600 dark:text-slate-400 mb-4">
						<span className="font-semibold text-gray-900 dark:text-slate-100">
							{Math.round((allMature / total) * 100)}%
						</span>{' '}
						of your {total.toLocaleString()} active cards are mature
						{maturity.overdue > 0 && (
							<>
								, and{' '}
								<span className="font-semibold text-gray-900 dark:text-slate-100">
									{maturity.overdue.toLocaleString()}
								</span>{' '}
								are overdue
							</>
						)}
						.
					</p>

					<div
						className="flex h-4 gap-0.5 rounded-full overflow-hidden mb-5"
						role="img"
						aria-label={STAGES.map(
							(stage) => `${stage.label}: ${maturity[stage.key]}`
						).join(', ')}
					>
						{STAGES.filter((stage) => maturity[stage.key] > 0).map(
							(stage) => (
								<div
									key={stage.key}
									className={stage.className}
									style={{
										width: `${(maturity[stage.key] / total) * 100}%`,
									}}
									title={`${stage.label}: ${maturity[stage.key].toLocaleString()}`}
								/>
							)
						)}
					</div>

					<ul className="grid grid-cols-2 gap-3">
						{STAGES.map((stage) => (
							<li
								key={stage.key}
								className="flex items-start gap-2 min-w-0"
							>
								<span
									className={`mt-1.5 w-3 h-3 rounded-sm shrink-0 ${stage.className}`}
								/>
								<div className="min-w-0">
									<div className="text-sm text-gray-900 dark:text-slate-100">
										<span className="font-semibold tabular-nums">
											{maturity[
												stage.key
											].toLocaleString()}
										</span>{' '}
										{stage.label}
									</div>
									<div className="text-xs text-gray-500 dark:text-slate-500">
										{stage.key === 'overdue'
											? describeOverdue(overdueByStage)
											: stage.description}
									</div>
								</div>
							</li>
						))}
					</ul>
					<p className="mt-4 text-xs text-gray-500 dark:text-slate-500">
						Learning, young and mature count cards that are on
						schedule.
					</p>
				</>
			)}
		</StatsCard>
	);
}
