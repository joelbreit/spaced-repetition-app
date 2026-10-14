import { Link } from 'react-router-dom';
import { Flame, ChevronRight } from 'lucide-react';
import StatsCard, { EmptyState } from './StatsCard';
import { RESULT_LABELS, RESULT_SWATCH_CLASSES } from './chartTheme';
import { getContainerColor } from '../../config/containerColors';

/**
 * HardestCards Component
 *
 * The cards marked "Again" most often, linking to their decks.
 */
export default function HardestCards({ stats }) {
	const cards = stats.hardestCards;

	return (
		<StatsCard title="Hardest Cards" icon={Flame}>
			{cards.length === 0 ? (
				<EmptyState>No cards marked "Again" yet. Nice work!</EmptyState>
			) : (
				<>
					<p className="text-sm text-gray-600 dark:text-slate-400 mb-4">
						The cards you've marked "Again" most often.
					</p>
					<ol className="divide-y divide-gray-100 dark:divide-slate-700/60">
						{cards.map((card, index) => (
							<li key={card.cardId}>
								<Link
									to={`/deck/${card.deckId}`}
									className="flex items-center gap-3 py-3 -mx-2 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors group"
								>
									<span className="w-5 text-sm text-gray-400 dark:text-slate-500 tabular-nums shrink-0">
										{index + 1}
									</span>
									<div className="flex-1 min-w-0">
										<div className="text-gray-900 dark:text-slate-100 truncate">
											{card.front || '(empty)'}
										</div>
										<div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-500 mt-0.5 min-w-0">
											<span
												className={`w-2 h-2 rounded-full shrink-0 ${
													getContainerColor(
														card.deckColor
													).swatch
												}`}
											/>
											<span className="truncate">
												{card.deckName}
											</span>
											<span className="shrink-0">
												· last:
											</span>
											<span
												className={`w-2 h-2 rounded-sm shrink-0 ${
													RESULT_SWATCH_CLASSES[
														card.lastResult
													] || ''
												}`}
											/>
											<span className="shrink-0">
												{RESULT_LABELS[
													card.lastResult
												] || '–'}
											</span>
										</div>
									</div>
									<div className="text-right shrink-0">
										<div className="text-sm font-semibold text-gray-900 dark:text-slate-100 tabular-nums">
											{card.againCount}× Again
										</div>
										<div className="text-xs text-gray-500 dark:text-slate-500 tabular-nums">
											of {card.reviewCount} reviews
										</div>
									</div>
									<ChevronRight className="h-4 w-4 text-gray-300 dark:text-slate-600 group-hover:text-gray-500 dark:group-hover:text-slate-400 shrink-0" />
								</Link>
							</li>
						))}
					</ol>
				</>
			)}
		</StatsCard>
	);
}
