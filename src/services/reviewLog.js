// Reviews are stored apart from data.json, in a review log (see
// docs/Data.md). In memory each card still has its `reviews` array, so stats
// and history read them as before; these helpers move reviews between the
// two shapes and work out what to send to the log on save.
//
// The log also holds catch-up reschedules (`type: 'reschedule'`, see
// services/catchUp.js). In memory those go on `card.reschedules`, apart from
// `card.reviews`, so nothing that counts reviews counts them.

import { deriveSchedulingState } from './cardCalculations';

export const RESCHEDULE = 'reschedule';

// Log entries kept on each card in memory, by kind
const ENTRY_LISTS = ['reviews', 'reschedules'];
const listFor = (entry) =>
	entry.type === RESCHEDULE ? 'reschedules' : 'reviews';

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
	(logReviews || []).forEach(({ cardId, ...entry }) => {
		if (!byCard.has(cardId)) {
			byCard.set(cardId, { reviews: [], reschedules: [] });
		}
		byCard.get(cardId)[listFor(entry)].push(entry);
	});

	const merge = (...lists) => {
		const merged = new Map();
		lists.flat().forEach((entry) => merged.set(entry.reviewId, entry));
		return [...merged.values()].sort((a, b) => a.timestamp - b.timestamp);
	};

	return mapCards(data, (card) => {
		const fromLog = byCard.get(card.cardId);
		const reviews = merge(card.reviews || [], fromLog?.reviews || []);
		const reschedules = merge(
			card.reschedules || [],
			fromLog?.reschedules || []
		);
		const withEntries = { ...card, reviews };
		if (reschedules.length) withEntries.reschedules = reschedules;
		else delete withEntries.reschedules;
		// Stored state is trusted while it agrees with the history; cards
		// saved before it existed, or changed by an older version of the
		// app, get it worked out again
		if ((card.reps ?? 0) === reviews.length) return withEntries;
		const derived = deriveSchedulingState(withEntries);
		// A catch-up since the last review sets the interval
		const last = reschedules[reschedules.length - 1];
		return last && last.timestamp > (derived.lastReviewed || 0)
			? { ...derived, interval: last.interval }
			: derived;
	});
}

/** The app data as data.json stores it: cards without log entries. */
export function stripReviews(data) {
	return mapCards(data, (card) => {
		const stored = { ...card };
		ENTRY_LISTS.forEach((list) => delete stored[list]);
		return stored;
	});
}

/**
 * Every review-log entry in the app data (reviews and reschedules), keyed by
 * cardId and reviewId.
 * @returns {Map<string, Object>} key → entry with its cardId
 */
export function collectReviews(data) {
	const all = new Map();
	(data.decks || []).forEach((deck) =>
		(deck.cards || []).forEach((card) =>
			ENTRY_LISTS.forEach((list) =>
				(card[list] || []).forEach((entry) =>
					all.set(reviewKey(card.cardId, entry.reviewId), {
						...entry,
						cardId: card.cardId,
					})
				)
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
