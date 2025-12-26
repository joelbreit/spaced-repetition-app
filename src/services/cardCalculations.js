// 10 minutes
const MIN_INTERVAL = 10 * 60 * 1000;

function prettyPrintInterval(interval) {
	// days
	const days = interval / (1000 * 60 * 60 * 24);
	if (days > 1) {
		return `${Math.round(days)} days`;
	}
	// hours
	const hours = interval / (1000 * 60 * 60);
	if (hours > 1) {
		return `${Math.round(hours)} hours`;
	}
	// minutes
	const minutes = interval / (1000 * 60);
	if (minutes > 1) {
		return `${Math.round(minutes)} minutes`;
	}
	return `${Math.round(interval / 1000)} seconds`;
}

export function calculateNextInterval(result, card, timestamp = Date.now()) {

	// Always go to minimum interval
	if (result === "again") {
		console.log(`again, returning MIN_INTERVAL: ${prettyPrintInterval(MIN_INTERVAL)}`);
		return MIN_INTERVAL;
	}

	const reviews = card.reviews || [];

	const timeSinceLastReview =
		reviews.length > 0
			? timestamp - reviews[reviews.length - 1].timestamp
			: timestamp - card.createdAt || MIN_INTERVAL;

	// const previousInterval = reviews.length > 0 && reviews[reviews.length - 1].interval ? reviews[reviews.length - 1].interval : timeSinceLastReview;
	const previousInterval = getInterval(card);

	console.log(`previousInterval: ${prettyPrintInterval(previousInterval)}`);
	console.log(`timeSinceLastReview: ${prettyPrintInterval(timeSinceLastReview)}`);

	// 0.5x MIN(last interval, time since last review)
	if (result === "hard") {
		console.log(`hard, returning: ${prettyPrintInterval(Math.max(Math.min(previousInterval, timeSinceLastReview) * 0.5, MIN_INTERVAL))}`);
		return Math.max(
			Math.min(previousInterval, timeSinceLastReview) * 0.5,
			MIN_INTERVAL
		);
	}

	// 1x last interval
	if (result === "good") {
		console.log(`good, returning: ${prettyPrintInterval(Math.max(Math.min(previousInterval, timeSinceLastReview), MIN_INTERVAL))}`);
		return Math.max(
			previousInterval,
			MIN_INTERVAL
		);
	}

	// 2x MAX(last interval, time since last review)
	if (result === "easy") {
		if (timeSinceLastReview < previousInterval) { // prevent exploding due date for early reviews
			// interval + 2x time since last review
			console.log(`easy, but early, returning: ${prettyPrintInterval(previousInterval + 2 * timeSinceLastReview)}`);
			return previousInterval + 2 * timeSinceLastReview;
		} else {
			console.log(`easy, returning: ${prettyPrintInterval(Math.max(Math.max(previousInterval, timeSinceLastReview) * 2, MIN_INTERVAL))}`);
			return Math.max(
				Math.max(previousInterval, timeSinceLastReview) * 2,
				MIN_INTERVAL
			);
		}
	}

	return MIN_INTERVAL;
}

export function getInterval(card) {

	let interval = 0;
	// Previous interval available
	if (card.reviews && card.reviews.length > 0 && card.reviews[card.reviews.length - 1].interval) {
		interval = card.reviews[card.reviews.length - 1].interval;
	}

	// Previous interval not available, try dueDate - last review timestamp
	else if (card.whenDue && card.reviews.length > 0) {
		interval = card.whenDue - card.reviews[card.reviews.length - 1].timestamp;
	}

	// Else, just use time since last review
	else {
		const reviews = card.reviews || [];

		if (reviews.length === 0) {
			interval = Date.now() - card.createdAt || MIN_INTERVAL;
		} else {
			interval = Date.now() - reviews[reviews.length - 1].timestamp;
		}
	}

	return interval || MIN_INTERVAL;
}

export function calculateLearningStrength(card) {
	const reviews = card.reviews || [];
	if (reviews.length === 0) return 0;

	const recentReviews = reviews.slice(-10);
	const weights = Array.from({ length: 10 }, (_, i) => 1 / (i + 1));
	const resultScores = { again: 0.0, hard: 0.25, good: 0.75, easy: 1.0 };

	let weightedSum = 0;
	let totalWeight = 0;

	recentReviews.forEach((review, index) => {
		const weight = weights[recentReviews.length - 1 - index] || 0.25;
		weightedSum += resultScores[review.result] * weight;
		totalWeight += weight;
	});

	const score = weightedSum / totalWeight;
	return score * 100;
};

// Based on current interval, how often does the card get reviewed?
export function getPerDayReviewRate(card) {
	const interval = getInterval(card);
	if (!interval) {
		console.error("No interval found for card");
		return 0;
	}

	const days = interval / (1000 * 60 * 60 * 24);
	if (days > 0) {
		return 1 / days;
	} else {
		return 0;
	}
}