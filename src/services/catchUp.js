import {
	getActiveReschedule,
	getInterval,
	isReviewed,
	MIN_INTERVAL,
} from './cardCalculations';
import { DAY, startOfDay } from './statsCalculations';
import { RESCHEDULE } from './reviewLog';

// Catch-up: reschedule overdue cards as if each were graded Too Difficult once (half
// its interval), spread over the coming days so no day gets more than a daily
// limit. No reviews are recorded, so review history and every stat built on
// it stay true. Each rescheduled card gets the new `whenDue` and `interval`,
// and an entry in the review log (kept on `card.reschedules` in memory, apart
// from its reviews) with what it needs to be undone:
//
//   { reviewId, type: 'reschedule', timestamp, interval,
//     lastInterval, previousWhenDue }
//
// Undo puts back previousWhenDue and lastInterval and removes the entry.

// How long a catch-up can still be undone
export const UNDO_WINDOW = DAY;

const cardKey = (deckId, cardId) => `${deckId}:${cardId}`;

const isStudied = isReviewed;

// Archived decks are left alone unless one is picked on purpose
const inScope = (deck, deckId) =>
	deckId ? deck.deckId === deckId : !deck.isArchived;

export function countOverdue(decks, deckId = null, now = Date.now()) {
	return (decks || [])
		.filter((deck) => inScope(deck, deckId))
		.reduce(
			(sum, deck) =>
				sum +
				(deck.cards || []).filter(
					(card) => isStudied(card) && card.whenDue <= now
				).length,
			0
		);
}

// Reviews per day over the last four weeks, to suggest a daily limit
export function recentDailyAverage(decks, now = Date.now()) {
	const since = now - 28 * DAY;
	let count = 0;
	(decks || []).forEach((deck) =>
		(deck.cards || []).forEach((card) =>
			(card.reviews || []).forEach((review) => {
				if (review.timestamp >= since) count++;
			})
		)
	);
	return count / 28;
}

function dayStart(todayStart, index) {
	const date = new Date(todayStart);
	date.setDate(date.getDate() + index);
	return date.getTime();
}

/**
 * Plan a catch-up. Overdue cards keep the review queue's order (most
 * recently due first) and fill each day up to `dailyLimit`, counting cards
 * already due that day across all active decks.
 *
 * @returns {{ items, days, dayCount }} items: one per card with its new
 *   whenDue and halved interval; days: per-day counts for a preview
 */
export function planCatchUp(decks, { dailyLimit, deckId = null, now }) {
	const todayStart = startOfDay(now).getTime();
	const limit = Math.max(1, Math.round(dailyLimit));

	const overdue = [];
	const alreadyDue = new Map();
	(decks || []).forEach((deck) => {
		(deck.cards || []).forEach((card) => {
			if (!isStudied(card)) return;
			if (card.whenDue <= now) {
				if (inScope(deck, deckId)) overdue.push({ deck, card });
			} else if (!deck.isArchived && card.whenDue) {
				const day = Math.round(
					(startOfDay(card.whenDue) - todayStart) / DAY
				);
				alreadyDue.set(day, (alreadyDue.get(day) || 0) + 1);
			}
		});
	});
	// Same order the review queue uses for overdue cards
	overdue.sort((a, b) => b.card.whenDue - a.card.whenDue);

	// Fill days in order, skipping any already at the limit
	const perDay = [];
	let day = 0;
	let used = alreadyDue.get(0) || 0;
	overdue.forEach((entry) => {
		while (used >= limit) {
			day++;
			used = alreadyDue.get(day) || 0;
		}
		(perDay[day] ||= []).push(entry);
		used++;
	});

	// Due times within a day count down so the queue's newest-first sort
	// keeps this order. Today's are due now; later days' at midnight.
	const items = [];
	perDay.forEach((entries, index) => {
		entries.forEach(({ deck, card }, position) => {
			const whenDue =
				index === 0
					? now - position * 1000
					: dayStart(todayStart, index) +
						(entries.length - position) * 1000;
			items.push({
				deckId: deck.deckId,
				cardId: card.cardId,
				whenDue,
				interval: Math.max(getInterval(card) * 0.5, MIN_INTERVAL),
			});
		});
	});

	const dayCount = perDay.length;
	const previewLength = Math.max(dayCount, 14);
	const days = Array.from({ length: previewLength }, (_, index) => ({
		date: new Date(dayStart(todayStart, index)),
		existing: alreadyDue.get(index) || 0,
		added: perDay[index]?.length || 0,
	}));

	return { items, days, dayCount };
}

const rescheduleId = (at) => `reschedule-${at}`;

export function applyCatchUp(appData, plan, now = Date.now()) {
	const byKey = new Map(
		plan.items.map((item) => [cardKey(item.deckId, item.cardId), item])
	);
	return {
		...appData,
		decks: appData.decks.map((deck) => {
			if (
				!deck.cards?.some((c) =>
					byKey.has(cardKey(deck.deckId, c.cardId))
				)
			) {
				return deck;
			}
			return {
				...deck,
				cards: deck.cards.map((card) => {
					const item = byKey.get(cardKey(deck.deckId, card.cardId));
					if (!item) return card;
					return {
						...card,
						whenDue: item.whenDue,
						interval: item.interval,
						reschedules: [
							...(card.reschedules || []),
							{
								reviewId: rescheduleId(now),
								type: RESCHEDULE,
								timestamp: now,
								interval: item.interval,
								lastInterval: card.interval ?? null,
								previousWhenDue: card.whenDue,
							},
						],
					};
				}),
			};
		}),
	};
}

// The latest catch-up, if it's recent enough to undo: { at, count }, where
// count is how many of its cards haven't been reviewed since
export function findUndoableCatchUp(decks, now = Date.now()) {
	let latest = 0;
	(decks || []).forEach((deck) =>
		(deck.cards || []).forEach((card) => {
			const last = card.reschedules?.[card.reschedules.length - 1];
			latest = Math.max(latest, last?.timestamp || 0);
		})
	);
	if (!latest || now - latest > UNDO_WINDOW) return null;

	let count = 0;
	(decks || []).forEach((deck) =>
		(deck.cards || []).forEach((card) => {
			if (getActiveReschedule(card)?.timestamp === latest) count++;
		})
	);
	return count > 0 ? { at: latest, count } : null;
}

// Put back the schedules from before the catch-up at `at`, and drop its
// entries. Cards reviewed since then keep their new schedule: that review is
// real.
export function undoCatchUp(appData, at) {
	const restore = (card) => {
		const entry = getActiveReschedule(card);
		if (entry?.timestamp !== at) return card;
		const restored = {
			...card,
			whenDue: entry.previousWhenDue,
			interval: entry.lastInterval,
			reschedules: card.reschedules.slice(0, -1),
		};
		if (restored.interval == null) delete restored.interval;
		if (restored.reschedules.length === 0) delete restored.reschedules;
		return restored;
	};
	return {
		...appData,
		decks: appData.decks.map((deck) =>
			deck.cards?.some(
				(card) => getActiveReschedule(card)?.timestamp === at
			)
				? { ...deck, cards: deck.cards.map(restore) }
				: deck
		),
	};
}

/**
 * Turn catch-ups saved the old way, as a `card.reschedule` chain
 * ({ at, interval, previousWhenDue, previousReschedule? }), into reschedule
 * entries, and store an active one's interval on the card as catch-ups now
 * do. Entry IDs come from their times, so migrating twice gives the same
 * entries. Needs the cards' reviews attached.
 */
export function migrateReschedules(appData) {
	if (!appData?.decks?.some((d) => d.cards?.some((c) => c.reschedule))) {
		return appData;
	}
	const migrate = (card) => {
		const chain = [];
		for (let r = card.reschedule; r; r = r.previousReschedule) {
			chain.unshift(r); // oldest first
		}
		const reviews = card.reviews || [];
		const intervalBefore = (at, previous) => {
			const lastReview = [...reviews]
				.reverse()
				.find((review) => review.timestamp < at);
			// Back-to-back catch-ups: the earlier one set the interval
			if (previous && previous.at > (lastReview?.timestamp || 0)) {
				return previous.interval;
			}
			return lastReview?.interval ?? card.interval ?? null;
		};
		const entries = chain.map((r, i) => ({
			reviewId: rescheduleId(r.at),
			type: RESCHEDULE,
			timestamp: r.at,
			interval: r.interval,
			lastInterval: intervalBefore(r.at, chain[i - 1]),
			previousWhenDue: r.previousWhenDue,
		}));
		const migrated = { ...card };
		delete migrated.reschedule;
		const known = new Set((card.reschedules || []).map((e) => e.reviewId));
		migrated.reschedules = [
			...(card.reschedules || []),
			...entries.filter((e) => !known.has(e.reviewId)),
		].sort((a, b) => a.timestamp - b.timestamp);
		const active = getActiveReschedule(migrated);
		if (active) migrated.interval = active.interval;
		return migrated;
	};
	return {
		...appData,
		decks: appData.decks.map((deck) =>
			deck.cards?.some((c) => c.reschedule)
				? {
						...deck,
						cards: deck.cards.map((c) =>
							c.reschedule ? migrate(c) : c
						),
					}
				: deck
		),
	};
}
