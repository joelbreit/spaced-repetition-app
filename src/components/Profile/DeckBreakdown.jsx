import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Layers, AlertTriangle } from 'lucide-react';
import StatsCard, { EmptyState, SegmentedControl } from './StatsCard';
import { getContainerColor } from '../../config/containerColors';
import { DAY, formatPercent } from '../../services/statsCalculations';

const COLLAPSED_ROWS = 10;
// Decks with fewer studied cards are ignored when picking the neglected one
const MIN_NEGLECT_CARDS = 5;

const SORTS = [
	{
		value: 'reviews',
		label: 'Reviews',
		compare: (a, b) => b.reviewCount - a.reviewCount,
	},
	{
		value: 'recall',
		label: 'Recall',
		compare: (a, b) => (a.retention ?? 2) - (b.retention ?? 2),
	},
	{
		value: 'overdue',
		label: 'Overdue',
		compare: (a, b) => b.overdueShare - a.overdueShare,
	},
	{
		value: 'recent',
		label: 'Recent',
		compare: (a, b) => (b.lastStudied || 0) - (a.lastStudied || 0),
	},
];

function formatAgo(timestamp, now) {
	if (!timestamp) return 'Never';
	const days = Math.floor((now - timestamp) / DAY);
	if (days < 1) return 'Today';
	if (days < 30) return `${days}d ago`;
	if (days < 365) return `${Math.floor(days / 30)}mo ago`;
	return `${(days / 365).toFixed(1)}y ago`;
}

/**
 * DeckBreakdown Component
 *
 * Reviews, recall and overdue share per deck, plus the most neglected deck.
 */
export default function DeckBreakdown({ stats }) {
	const [sort, setSort] = useState('reviews');
	const [showAll, setShowAll] = useState(false);
	const [now] = useState(() => Date.now());

	const decks = [...stats.decks].sort(
		SORTS.find((s) => s.value === sort).compare
	);
	const maxReviews = Math.max(...decks.map((d) => d.reviewCount), 1);
	const neglected = stats.decks
		.filter(
			(d) =>
				!d.isArchived &&
				d.reviewedCount >= MIN_NEGLECT_CARDS &&
				d.overdueShare > 0
		)
		.sort((a, b) => b.overdueShare - a.overdueShare)[0];
	const visible = showAll ? decks : decks.slice(0, COLLAPSED_ROWS);

	return (
		<StatsCard
			title="Decks"
			icon={Layers}
			action={
				decks.length > 1 && (
					<SegmentedControl
						label="Sort decks by"
						options={SORTS}
						value={sort}
						onChange={setSort}
					/>
				)
			}
		>
			{decks.length === 0 ? (
				<EmptyState>No decks yet.</EmptyState>
			) : (
				<>
					{neglected && (
						<Link
							to={`/deck/${neglected.deckId}`}
							className="flex items-start gap-3 p-4 mb-4 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/50 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
						>
							<AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
							<p className="text-sm text-gray-700 dark:text-slate-300">
								<span className="font-semibold text-gray-900 dark:text-slate-100">
									{neglected.deckName}
								</span>{' '}
								needs attention:{' '}
								{formatPercent(neglected.overdueShare)} of its
								studied cards are overdue, last studied{' '}
								{formatAgo(
									neglected.lastStudied,
									now
								).toLowerCase()}
								.
							</p>
						</Link>
					)}

					<div className="overflow-x-auto -mx-6 px-6">
						<table className="w-full text-sm">
							<thead>
								<tr className="text-left text-xs text-gray-500 dark:text-slate-500 border-b border-gray-200 dark:border-slate-700">
									<th className="font-medium pb-2 pr-4">
										Deck
									</th>
									<th className="font-medium pb-2 pr-4 text-right hidden sm:table-cell">
										Studied
									</th>
									<th className="font-medium pb-2 pr-4 w-1/4">
										Reviews
									</th>
									<th className="font-medium pb-2 pr-4 text-right">
										Recall
									</th>
									<th className="font-medium pb-2 pr-4 text-right">
										Overdue
									</th>
									<th className="font-medium pb-2 text-right hidden md:table-cell">
										Last studied
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-100 dark:divide-slate-700/60">
								{visible.map((deck) => {
									const color = getContainerColor(
										deck.deckColor
									);
									return (
										<tr key={deck.deckId}>
											<td className="py-2.5 pr-4 max-w-48">
												<Link
													to={`/deck/${deck.deckId}`}
													className="flex items-center gap-2 min-w-0 text-gray-900 dark:text-slate-100 hover:text-teal-600 dark:hover:text-teal-400"
												>
													<span
														className={`w-2.5 h-2.5 rounded-full shrink-0 ${color.swatch}`}
													/>
													<span className="truncate">
														{deck.deckName}
													</span>
													{deck.isArchived && (
														<span className="text-xs text-gray-400 dark:text-slate-500 shrink-0">
															Archived
														</span>
													)}
												</Link>
											</td>
											<td className="py-2.5 pr-4 text-right tabular-nums text-gray-600 dark:text-slate-400 hidden sm:table-cell whitespace-nowrap">
												{deck.reviewedCount.toLocaleString()}{' '}
												/{' '}
												{deck.cardCount.toLocaleString()}
											</td>
											<td className="py-2.5 pr-4">
												<div className="flex items-center gap-2">
													<div className="flex-1 h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden min-w-12">
														<div
															className={`h-full rounded-full ${color.swatch}`}
															style={{
																width: `${(deck.reviewCount / maxReviews) * 100}%`,
															}}
														/>
													</div>
													<span className="tabular-nums text-gray-900 dark:text-slate-100 w-12 text-right">
														{deck.reviewCount.toLocaleString()}
													</span>
												</div>
											</td>
											<td
												className="py-2.5 pr-4 text-right tabular-nums text-gray-900 dark:text-slate-100"
												title={`${deck.retentionSample} repeat reviews`}
											>
												{formatPercent(deck.retention)}
											</td>
											<td className="py-2.5 pr-4 text-right tabular-nums text-gray-900 dark:text-slate-100">
												{deck.reviewedCount > 0
													? formatPercent(
															deck.overdueShare
														)
													: '–'}
											</td>
											<td className="py-2.5 text-right text-gray-600 dark:text-slate-400 hidden md:table-cell whitespace-nowrap">
												{formatAgo(
													deck.lastStudied,
													now
												)}
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>

					{decks.length > COLLAPSED_ROWS && (
						<button
							onClick={() => setShowAll(!showAll)}
							className="mt-3 text-sm font-medium text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300"
						>
							{showAll
								? 'Show fewer'
								: `Show all ${decks.length} decks`}
						</button>
					)}
				</>
			)}
		</StatsCard>
	);
}
