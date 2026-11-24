import { normalizeResult } from './grades';

// 10 seconds
export const MIN_INTERVAL = 10 * 1000;

// ============================================
// Scheduling state
//
// Each card stores what scheduling needs, so it never has to read the
// review history (which lives in a separate review log, see docs/Data.md):
//   interval      ms, set by the last review
//   reps          how many times it's been reviewed
//   lapses        how many of those were graded Unfamiliar (`forgot`)
//   lastReviewed  timestamp of the last review
// New cards may have none of these. The fallbacks below read `reviews` for
// cards saved before these fields existed.
// ============================================

// The fields a review changes, for undoing one
export const SCHEDULE_FIELDS = [
	'reviews',
	'whenDue',
	'interval',
	'reps',
	'lapses',
	'lastReviewed',
];

export function pickSchedule(card) {
	return Object.fromEntries(SCHEDULE_FIELDS.map((f) => [f, card[f]]));
}

export function getReps(card) {
	return card.reps ?? card.reviews?.length ?? 0;
}

// Has the card been reviewed at least once? (New cards haven't.)
export function isReviewed(card) {
	return getReps(card) > 0;
}

export function getLastReviewed(card) {
	if (card.lastReviewed) return card.lastReviewed;
	const reviews = card.reviews || [];
	return reviews.length > 0 ? reviews[reviews.length - 1].timestamp : null;
}

// The interval from review history alone, for cards without a stored one
function intervalFromReviews(card) {
	const reviews = card.reviews || [];
	if (reviews.length === 0) return MIN_INTERVAL;
	const last = reviews[reviews.length - 1];
	// Previous interval available
	if (last.interval) return last.interval;
	// Previous interval not available, try dueDate - last review timestamp
	if (card.whenDue) return card.whenDue - last.timestamp || MIN_INTERVAL;
	// Else, just use time since last review
	return Date.now() - last.timestamp || MIN_INTERVAL;
}

/**
 * The card with its scheduling state worked out from its reviews. Used when
 * loading, for cards saved before the state was stored or whose state no
 * longer matches their history.
 */
export function deriveSchedulingState(card) {
	const reviews = card.reviews || [];
	if (reviews.length === 0) {
		// New cards don't store it: the defaults are all there is
		const rest = { ...card };
		['interval', 'reps', 'lapses', 'lastReviewed'].forEach(
			(field) => delete rest[field]
		);
		return rest;
	}
	return {
		...card,
		interval: intervalFromReviews(card),
		reps: reviews.length,
		lapses: reviews.filter((r) => normalizeResult(r.result) === 'forgot')
			.length,
		lastReviewed: reviews[reviews.length - 1].timestamp,
	};
}

export function prettyPrintInterval(interval) {
	// days
	const days = interval / (1000 * 60 * 60 * 24);
	if (days > 1) {
		const roundedDays = Math.round(days);
		return `${roundedDays} day${roundedDays !== 1 ? 's' : ''}`;
	}
	// hours
	const hours = interval / (1000 * 60 * 60);
	if (hours > 1) {
		const roundedHours = Math.round(hours);
		return `${roundedHours} hour${roundedHours !== 1 ? 's' : ''}`;
	}
	// minutes
	const minutes = interval / (1000 * 60);
	if (minutes > 1) {
		const roundedMinutes = Math.round(minutes);
		return `${roundedMinutes} minute${roundedMinutes !== 1 ? 's' : ''}`;
	}
	const roundedSeconds = Math.round(interval / 1000);
	return `${roundedSeconds} second${roundedSeconds !== 1 ? 's' : ''}`;
}

// Compact form for tight spaces like the grade buttons: "10s", "10m", "5h", "12d", "3.5mo", "1.2y"
export function formatIntervalShort(interval) {
	const seconds = interval / 1000;
	if (seconds < 60) return `${Math.max(1, Math.round(seconds))}s`;
	const minutes = seconds / 60;
	if (minutes < 60) return `${Math.round(minutes)}m`;
	const hours = minutes / 60;
	if (hours < 24) return `${Math.round(hours)}h`;
	const days = hours / 24;
	if (days < 30) return `${Math.round(days)}d`;
	const oneDecimal = (n) =>
		n < 10 ? Math.round(n * 10) / 10 : Math.round(n);
	if (days < 365) return `${oneDecimal(days / 30)}mo`;
	return `${oneDecimal(days / 365)}y`;
}

export function calculateNextInterval(result, card, timestamp = Date.now()) {
	// Always go to minimum interval
	if (result === 'forgot') {
		return MIN_INTERVAL;
	}

	const lastReviewed = getLastReviewed(card);
	const timeSinceLastReview = lastReviewed
		? timestamp - lastReviewed
		: MIN_INTERVAL;

	const previousInterval = getInterval(card);

	// 0.5x MIN(last interval, time since last review)
	if (result === 'sooner') {
		return Math.max(
			Math.min(previousInterval, timeSinceLastReview) * 0.5,
			MIN_INTERVAL
		);
	}

	// 1x last interval
	if (result === 'right') {
		return Math.max(previousInterval, MIN_INTERVAL);
	}

	// 2x MAX(last interval, time since last review)
	if (result === 'later') {
		if (timeSinceLastReview < previousInterval) {
			// prevent exploding due date for early reviews
			// interval + 2x time since last review
			return previousInterval + 2 * timeSinceLastReview;
		} else {
			return Math.max(
				Math.max(previousInterval, timeSinceLastReview) * 2,
				MIN_INTERVAL
			);
		}
	}

	return MIN_INTERVAL;
}

// The card as it will be after this grade: the review appended and its
// scheduling state and next due date set. Shared by recording a review and previewing its stats.
export function applyReview(
	card,
	result,
	timestamp = Date.now(),
	reviewDuration = 0
) {
	const interval = calculateNextInterval(result, card, timestamp);
	const review = {
		reviewId: `${timestamp}-${Math.random().toString(36).slice(2, 11)}`,
		timestamp,
		interval,
		result,
		reviewDuration,
	};
	return {
		...card,
		reviews: [...(card.reviews || []), review],
		whenDue: timestamp + interval,
		interval,
		reps: getReps(card) + 1,
		lapses: (card.lapses ?? 0) + (result === 'forgot' ? 1 : 0),
		lastReviewed: timestamp,
	};
}

// A catch-up reschedule (see services/catchUp.js) applies until the card's
// next real review: the card's newest reschedule entry, if it came after the
// last review. Its `interval` is also stored on the card.
export function getActiveReschedule(card) {
	const reschedules = card.reschedules || [];
	const last = reschedules[reschedules.length - 1];
	if (!last) return null;
	const lastReviewed = getLastReviewed(card);
	return !lastReviewed || last.timestamp > lastReviewed ? last : null;
}

export function getInterval(card) {
	const reschedule = getActiveReschedule(card);
	if (reschedule) return reschedule.interval;
	if (card.interval) return card.interval;
	return intervalFromReviews(card);
}

// How well each grade shows a card was remembered, from 0 to 1. Used for
// card mastery and the profile page's recall score.
export const RESULT_SCORES = {
	forgot: 0.0,
	sooner: 0.25,
	right: 0.75,
	later: 1.0,
};

export function calculateLearningStrength(card) {
	const reviews = card.reviews || [];
	if (reviews.length === 0) return 0;

	const recentReviews = reviews.slice(-10);
	const weights = Array.from({ length: 10 }, (_, i) => 1 / (i + 1));

	let weightedSum = 0;
	let totalWeight = 0;

	recentReviews.forEach((review, index) => {
		const weight = weights[recentReviews.length - 1 - index] || 0.25;
		weightedSum += RESULT_SCORES[review.result] * weight;
		totalWeight += weight;
	});

	const score = weightedSum / totalWeight;
	return score * 100;
}

// Based on current interval, how often does the card get reviewed?
// Cap at 1 per day
export function getPerDayReviewRate(card) {
	const interval = getInterval(card);
	if (!interval) {
		console.error('No interval found for card');
		return 0;
	}

	const days = interval / (1000 * 60 * 60 * 24);
	if (days > 0) {
		return Math.min(1 / days, 1);
	} else {
		return 0;
	}
}

// ============================================
// Aggregate calculations for decks/folders
// ============================================

/**
 * Calculate average mastery for an array of cards
 * @param {Array} cards - Array of card objects
 * @param {boolean} reviewedOnly - If true, only include cards that have been reviewed
 * @returns {number} Average mastery percentage (0-100)
 */
export function calculateAverageMastery(cards, reviewedOnly = false) {
	if (!cards || cards.length === 0) return 0;

	const targetCards = reviewedOnly ? cards.filter(isReviewed) : cards;

	if (targetCards.length === 0) return 0;

	const totalMastery = targetCards.reduce(
		(sum, card) => sum + calculateLearningStrength(card),
		0
	);
	return totalMastery / targetCards.length;
}

/**
 * Calculate total burden (reviews per day) for an array of cards
 * @param {Array} cards - Array of card objects
 * @returns {number} Total reviews per day
 */
export function calculateTotalBurden(cards) {
	if (!cards || cards.length === 0) return 0;
	return cards.reduce((sum, card) => sum + getPerDayReviewRate(card), 0);
}

/**
 * Calculate mastery and burden stats for a deck
 * @param {Object} deck - Deck object with cards array
 * @returns {{ mastery: number, burden: number }}
 */
export function calculateDeckStats(deck) {
	const cards = deck?.cards || [];
	return {
		mastery: calculateAverageMastery(cards),
		burden: calculateTotalBurden(cards),
	};
}

/**
 * Calculate mastery and burden stats for multiple decks (folder-level)
 * @param {Array} decks - Array of deck objects
 * @returns {{ mastery: number, burden: number, totalCards: number }}
 */
export function calculateFolderStats(decks) {
	if (!decks || decks.length === 0) {
		return { mastery: 0, burden: 0, totalCards: 0 };
	}

	const allCards = decks.flatMap((deck) => deck.cards || []);
	return {
		mastery: calculateAverageMastery(allCards),
		burden: calculateTotalBurden(allCards),
		totalCards: allCards.length,
	};
}

/**
 * Calculate card counts by status
 * @param {Array} cards - Array of card objects
 * @returns {{ newCount: number, dueCount: number, learnedCount: number, reviewedCount: number, totalCount: number }}
 */
export function calculateCardCounts(cards) {
	if (!cards || cards.length === 0) {
		return {
			newCount: 0,
			dueCount: 0,
			learnedCount: 0,
			reviewedCount: 0,
			totalCount: 0,
		};
	}

	const now = Date.now();
	const reviewedCount = cards.filter(isReviewed).length;
	const newCount = cards.length - reviewedCount;
	const dueCount = cards.filter(
		(card) => isReviewed(card) && card.whenDue <= now
	).length;
	const learnedCount = cards.filter(
		(card) => isReviewed(card) && card.whenDue > now
	).length;

	return {
		newCount,
		dueCount,
		learnedCount,
		reviewedCount,
		totalCount: cards.length,
	};
}

/**
 * Calculate burden only for cards that have been reviewed at least once
 * @param {Array} cards - Array of card objects
 * @returns {number} Total reviews per day for reviewed cards only
 */
export function calculateReviewedCardsBurden(cards) {
	if (!cards || cards.length === 0) return 0;
	return cards
		.filter(isReviewed)
		.reduce((sum, card) => sum + getPerDayReviewRate(card), 0);
}

/**
 * Calculate comprehensive stats for an array of cards
 * @param {Array} cards - Array of card objects
 * @returns {{ mastery: number, burden: number, newCount: number, dueCount: number, learnedCount: number, reviewedCount: number, totalCount: number }}
 */
export function calculateCardStats(cards) {
	const counts = calculateCardCounts(cards);
	return {
		mastery: calculateAverageMastery(cards),
		burden: calculateReviewedCardsBurden(cards),
		...counts,
	};
}
