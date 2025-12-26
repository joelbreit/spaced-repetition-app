import { getPerDayReviewRate } from "../services/cardCalculations";

export default function StudyStatistics({ appData }) {
	const allCards = appData.decks.flatMap((deck) => deck.cards);
	const studiedCards = allCards.filter((card) => card.reviews.length > 0);
	const cardsDue = studiedCards.filter(
		(card) => card.whenDue <= Date.now()
	).length;
	const newCards = allCards.length - studiedCards.length;

	// Calculate total expected reviews per day across all studied cards
	const reviewsPerDay = studiedCards.reduce(
		(sum, card) => sum + getPerDayReviewRate(card),
		0
	);

	const stats = [
		{ label: "Due", value: cardsDue, highlight: cardsDue > 0 },
		{ label: "New", value: newCards },
		{ label: "Studied", value: studiedCards.length },
		{ label: "Reviews/day", value: reviewsPerDay.toFixed(1) },
	];

	return (
		<div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-500 dark:text-gray-400 animate-fade-in">
			{stats.map((stat) => (
				<div key={stat.label} className="flex items-center gap-1.5">
					<span
						className={`font-semibold tabular-nums ${
							stat.highlight
								? "text-orange-500 dark:text-orange-400"
								: "text-gray-900 dark:text-gray-100"
						}`}
					>
						{stat.value}
					</span>
					<span>{stat.label}</span>
				</div>
			))}
		</div>
	);
}
