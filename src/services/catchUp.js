import {
	getActiveReschedule,
	getInterval,
	MIN_INTERVAL,
} from './cardCalculations';
import { DAY, startOfDay } from './statsCalculations';

// Catch-up: reschedule overdue cards as if each were graded Hard once (half
// its interval), spread over the coming days so no day gets more than a daily
// limit. No reviews are recorded, so review history and every stat built on
// it stay true. Each card keeps what it needs for one undo:
//
//   card.reschedule = { at, interval, previousWhenDue, previousReschedule? }
//
// getInterval() uses reschedule.interval until the card's next real review.

// How long a catch-up can still be undone
export const UNDO_WINDOW = DAY;

const cardKey = (deckId, cardId) => `${deckId}:${cardId}`;

const isStudied = (card) => card.reviews && card.reviews.length > 0;

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
						reschedule: {
							at: now,
							interval: item.interval,
							previousWhenDue: card.whenDue,
							...(card.reschedule && {
								previousReschedule: card.reschedule,
							}),
						},
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
			latest = Math.max(latest, card.reschedule?.at || 0);
		})
	);
	if (!latest || now - latest > UNDO_WINDOW) return null;

	let count = 0;
	(decks || []).forEach((deck) =>
		(deck.cards || []).forEach((card) => {
			if (getActiveReschedule(card)?.at === latest) count++;
		})
	);
	return count > 0 ? { at: latest, count } : null;
}

// Put back the due dates from before the catch-up at `at`. Cards reviewed
// since then keep their new schedule: that review is real.
export function undoCatchUp(appData, at) {
	const restore = (card) => {
		if (getActiveReschedule(card)?.at !== at) return card;
		const { reschedule, ...rest } = card;
		return {
			...rest,
			whenDue: reschedule.previousWhenDue,
			...(reschedule.previousReschedule && {
				reschedule: reschedule.previousReschedule,
			}),
		};
	};
	return {
		...appData,
		decks: appData.decks.map((deck) =>
			deck.cards?.some((card) => card.reschedule?.at === at)
				? { ...deck, cards: deck.cards.map(restore) }
				: deck
		),
	};
}
