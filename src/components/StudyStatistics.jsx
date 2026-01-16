import {
	getPerDayReviewRate,
	calculateLearningStrength,
} from "../services/cardCalculations";

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
			(d) => d.parentFolderId === targetFolderId && !(d.isArchived || false)
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
		// Get all decks recursively in the folder (null means root)
		const allDecksInFolder = getAllDecksInFolder(folderId);
		const allCards = [];
		allDecksInFolder.forEach((deck) => {
			if (deck.cards && deck.cards.length > 0) {
				allCards.push(...deck.cards);
			}
		});
		return allCards;
	};

	const allCards = getAllCardsInFolder();
	const now = Date.now();

	// Calculate counts
	const dueCount = allCards.filter(
		(card) => card.reviews && card.reviews.length > 0 && card.whenDue <= now
	).length;

	const newCount = allCards.filter(
		(card) => !card.reviews || card.reviews.length === 0
	).length;

	const learnedCount = allCards.filter(
		(card) => card.reviews && card.reviews.length > 0 && card.whenDue > now
	).length;

	const viewedCount = dueCount + learnedCount;

	// Calculate mastery percentage (average learning strength)
	const studiedCards = allCards.filter(
		(card) => card.reviews && card.reviews.length > 0
	);
	const masteryPercentage =
		studiedCards.length > 0
			? Math.round(
					studiedCards.reduce(
						(sum, card) => sum + calculateLearningStrength(card),
						0
					) / studiedCards.length
			  )
			: 0;

	// Calculate burden per day (sum of review rates for all studied cards)
	const burdenPerDay = studiedCards.reduce(
		(sum, card) => sum + getPerDayReviewRate(card),
		0
	);

	// Calculate total reviews
	const totalReviews = allCards.reduce(
		(sum, card) => sum + (card.reviews?.length || 0),
		0
	);

	function getMasteryBadgeColors(mastery) {
		if (mastery < 25) return "text-red-700 dark:text-red-400";
		if (mastery < 50) return "text-orange-700 dark:text-orange-400";
		if (mastery < 75) return "text-yellow-700 dark:text-yellow-400";
		return "text-green-700 dark:text-green-400";
	}

	const stats = [
		{
			label: "Due",
			value: dueCount,
			customStyle: "text-orange-500 dark:text-orange-400",
		},
		{
			label: "New",
			value: newCount,
			customStyle: "text-teal-600",
		},
		{
			label: "Learned",
			value: learnedCount,
			customStyle: "text-green-600",
		},
		{
			label: "Viewed",
			value: viewedCount,
			customStyle: "text-gray-900 dark:text-gray-100",
		},
		{
			label: "Mastery",
			value: allCards.length > 0 ? `${masteryPercentage}%` : "—",
			customStyle: getMasteryBadgeColors(masteryPercentage),
		},
		{
			label: "Burden/Day",
			value: allCards.length > 0 ? burdenPerDay.toFixed(1) : "—",
			customStyle: "text-gray-900 dark:text-gray-100",
		},
		{
			label: "Reviews",
			value: totalReviews,
			customStyle: "text-gray-900 dark:text-gray-100",
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
