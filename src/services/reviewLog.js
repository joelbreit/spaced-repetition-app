// Reviews are stored apart from data.json, in a review log (see
// docs/Data.md). In memory each card still has its `reviews` array, so stats
// and history read them as before; these helpers move reviews between the
// two shapes and work out what to send to the log on save.

import { deriveSchedulingState } from './cardCalculations';

export const reviewKey = (cardId, reviewId) => `${cardId}:${reviewId}`;

const mapCards = (data, fn) => ({
	...data,
	decks: (data.decks || []).map((deck) => ({
		...deck,
		cards: (deck.cards || []).map(fn),
	})),
});

/**
 * Put log reviews back on their cards. Reviews still nested in data.json
 * (data saved before the review log existed) are kept and merged, so loading
 * old data and loading it again after migrating give the same result.
 * Cards also get any missing scheduling state, worked out from their reviews.
 * @param {Object} data - data.json as loaded
 * @param {Array} logReviews - reviews from the log, each with a cardId
 * @returns {Object} App data with `reviews` on every card
 */
export function attachReviews(data, logReviews) {
	const byCard = new Map();
	(logReviews || []).forEach(({ cardId, ...review }) => {
		if (!byCard.has(cardId)) byCard.set(cardId, []);
		byCard.get(cardId).push(review);
	});

	return mapCards(data, (card) => {
		const merged = new Map();
		[...(card.reviews || []), ...(byCard.get(card.cardId) || [])].forEach(
			(review) => merged.set(review.reviewId, review)
		);
		const reviews = [...merged.values()].sort(
			(a, b) => a.timestamp - b.timestamp
		);
		// Stored state is trusted while it agrees with the history; cards
		// saved before it existed, or changed by an older version of the
		// app, get it worked out again
		return (card.reps ?? 0) === reviews.length
			? { ...card, reviews }
			: deriveSchedulingState({ ...card, reviews });
	});
}

/** The app data as data.json stores it: cards without their reviews. */
export function stripReviews(data) {
	return mapCards(data, (card) => {
		const stored = { ...card };
		delete stored.reviews;
		return stored;
	});
}

/**
 * Every review in the app data, keyed by cardId and reviewId.
 * @returns {Map<string, Object>} key → review with its cardId
 */
export function collectReviews(data) {
	const all = new Map();
	(data.decks || []).forEach((deck) =>
		(deck.cards || []).forEach((card) =>
			(card.reviews || []).forEach((review) =>
				all.set(reviewKey(card.cardId, review.reviewId), {
					...review,
					cardId: card.cardId,
				})
			)
		)
	);
	return all;
}

/**
 * What the review log needs to match the app data: reviews it doesn't have
 * yet, and reviews no longer on any card (an undone grade, a deleted card).
 * @param {Map<string, Object>} current - collectReviews() of the app data
 * @param {Map<string, Object>} saved - the reviews the log holds
 */
export function diffReviews(current, saved) {
	const add = [];
	const remove = [];
	current.forEach((review, key) => {
		if (!saved.has(key)) add.push(review);
	});
	saved.forEach((review, key) => {
		if (!current.has(key)) {
			const { cardId, reviewId, timestamp } = review;
			remove.push({ cardId, reviewId, timestamp });
		}
	});
	return { add, remove };
}
