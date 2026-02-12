import {
	calculateAverageMastery,
	calculateReviewedCardsBurden,
	calculateCardCounts,
} from '../services/cardCalculations';

export default function StudyStatistics({ appData, folderId = null }) {
	// Helper function to recursively get all decks in a folder and its subfolders
	// Excludes archived decks for folder statistics
	const getAllDecksInFolder = (targetFolderId) => {
		// Root level folder - filter out archived decks
		if (!targetFolderId) {
			return (appData.decks || []).filter(
				(d) => !(d.isArchived || false)
			);
		}

		const allDecks = [];

		// Get direct decks in this folder (excluding archived)
		const directDecks = (appData.decks || []).filter(
			(d) =>
				d.parentFolderId === targetFolderId && !(d.isArchived || false)
		);
		allDecks.push(...directDecks);

		// Get subfolders
		const subfolders = (appData.folders || []).filter(
			(f) => f.parentFolderId === targetFolderId
		);

		// Recursively get decks from subfolders
		subfolders.forEach((subfolder) => {
			const subfolderDecks = getAllDecksInFolder(subfolder.folderId);
			allDecks.push(...subfolderDecks);
		});

		return allDecks;
	};

	// Get all cards in the folder (or all cards if folderId is null for root)
	const getAllCardsInFolder = () => {
		const allDecksInFolder = getAllDecksInFolder(folderId);
		return allDecksInFolder.flatMap((deck) => deck.cards || []);
	};

	const allCards = getAllCardsInFolder();

	// Calculate counts using centralized function
	const counts = calculateCardCounts(allCards);

	// Calculate mastery (only for reviewed cards)
	const masteryPercentage = Math.round(
		calculateAverageMastery(allCards, true)
	);

	// Calculate burden per day (only for reviewed cards)
	const burdenPerDay = calculateReviewedCardsBurden(allCards);

	function getMasteryBadgeColors(mastery) {
		if (mastery < 25) return 'text-red-700 dark:text-red-400';
		if (mastery < 50) return 'text-orange-700 dark:text-orange-400';
		if (mastery < 75) return 'text-yellow-700 dark:text-yellow-400';
		return 'text-green-700 dark:text-green-400';
	}

	const stats = [
		{
			label: 'Due',
			value: counts.dueCount,
			customStyle: 'text-orange-500 dark:text-orange-400',
		},
		{
			label: 'New',
			value: counts.newCount,
			customStyle: 'text-teal-600',
		},
		{
			label: 'Learned',
			value: counts.learnedCount,
			customStyle: 'text-green-600',
		},
		{
			label: 'Viewed',
			value: counts.reviewedCount,
			customStyle: 'text-gray-900 dark:text-gray-100',
		},
		{
			label: 'Mastery',
			value: allCards.length > 0 ? `${masteryPercentage}%` : '—',
			customStyle: getMasteryBadgeColors(masteryPercentage),
		},
		{
			label: 'Burden/Day',
			value: allCards.length > 0 ? burdenPerDay.toFixed(1) : '—',
			customStyle: 'text-gray-900 dark:text-gray-100',
		},
	];

	return (
		<div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-500 dark:text-gray-400 animate-fade-in">
			{stats.map((stat) => (
				<div key={stat.label} className="flex items-center gap-1.5">
					<span
						className={`font-semibold tabular-nums ${stat.customStyle}`}
					>
						{stat.value}
					</span>
					<span>{stat.label}</span>
				</div>
			))}
		</div>
	);
}
