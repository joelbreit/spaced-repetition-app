// Format date as YYYY-MM-DD in local timezone
function formatDateKey(date) {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

/**
 * Consecutive days with at least one review, and how many reviews happened today.
 * Today counts toward the streak but doesn't break it before the first review.
 * @param {Array} decks - appData.decks
 * @returns {{ streak: number, reviewsToday: number }}
 */
export function calculateStreakStats(decks) {
	if (!decks) {
		return { streak: 0, reviewsToday: 0 };
	}

	const activityMap = new Map();
	decks.forEach((deck) => {
		deck.cards?.forEach((card) => {
			card.reviews?.forEach((review) => {
				const dateStr = formatDateKey(new Date(review.timestamp));
				activityMap.set(dateStr, (activityMap.get(dateStr) || 0) + 1);
			});
		});
	});

	let streak = 0;
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	for (let i = 0; i < 365; i++) {
		const date = new Date(today);
		date.setDate(date.getDate() - i);

		if (activityMap.has(formatDateKey(date))) {
			streak++;
		} else if (i > 0) {
			break;
		}
	}

	return { streak, reviewsToday: activityMap.get(formatDateKey(today)) || 0 };
}
