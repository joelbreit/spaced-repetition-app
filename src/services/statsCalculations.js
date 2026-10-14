import {
	getActiveReschedule,
	getInterval,
	RESULT_SCORES,
} from './cardCalculations';
import { calculateStreakStats } from './streak';

// Aggregate statistics for the profile page, computed in one pass over every
// review. Review history (recall, habits, records) includes archived decks;
// the forward-looking stats (forecast, maturity) skip them, matching Study All.

export const HOUR = 60 * 60 * 1000;
export const DAY = 24 * HOUR;
export const MATURE_INTERVAL = 21 * DAY;
export const FORECAST_DAYS = 30;

// A gap longer than this between two reviews starts a new study session
const SESSION_GAP = 30 * 60 * 1000;
// Per-review durations above this are treated as the tab being left open
const DURATION_CAP = 60 * 1000;
// Weeks with fewer reviews than this are too noisy to plot a recall score
const MIN_WEEKLY_REVIEWS = 10;

export const RESULTS = ['again', 'hard', 'good', 'easy'];

export const GAP_BUCKETS = [
	{ label: '< 1h', short: '<1h', max: HOUR },
	{ label: '1h–1d', short: '<1d', max: DAY },
	{ label: '1–3d', short: '<3d', max: 3 * DAY },
	{ label: '3–7d', short: '<7d', max: 7 * DAY },
	{ label: '1–2w', short: '<2w', max: 14 * DAY },
	{ label: '2–4w', short: '<4w', max: 28 * DAY },
	{ label: '1–3mo', short: '<3mo', max: 90 * DAY },
	{ label: '3mo+', short: '3mo+', max: Infinity },
];

// Format date as YYYY-MM-DD in local timezone
export function formatDateKey(date) {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

export function parseDateKey(key) {
	const [year, month, day] = key.split('-').map(Number);
	return new Date(year, month - 1, day);
}

export function startOfDay(timestamp) {
	const date = new Date(timestamp);
	date.setHours(0, 0, 0, 0);
	return date;
}

// Monday of the week containing the timestamp, at local midnight
export function startOfWeek(timestamp) {
	const date = startOfDay(timestamp);
	date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
	return date;
}

function median(values) {
	if (values.length === 0) return 0;
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2
		? sorted[mid]
		: (sorted[mid - 1] + sorted[mid]) / 2;
}

function emptyRetention() {
	return { total: 0, recalled: 0 };
}

function rate(retention) {
	return retention.total > 0 ? retention.recalled / retention.total : null;
}

function longestStreak(dayKeys) {
	let best = { length: 0, start: null, end: null };
	let current = null;
	let previous = null;

	dayKeys.forEach((key) => {
		const date = parseDateKey(key);
		const isNextDay = previous && Math.round((date - previous) / DAY) === 1;
		current = isNextDay
			? { ...current, length: current.length + 1, end: date }
			: { length: 1, start: date, end: date };
		if (current.length > best.length) best = current;
		previous = date;
	});

	return best;
}

// Stage of a studied card, from the interval set by its latest review
export function maturityStage(interval) {
	if (interval < DAY) return 'learning';
	if (interval < MATURE_INTERVAL) return 'young';
	return 'mature';
}

export function computeStudyStats(appData, now = Date.now()) {
	const decks = appData?.decks || [];
	const todayStart = startOfDay(now).getTime();

	const reviewsByDay = new Map();
	const reviewsByWeek = new Map();
	const retentionByWeek = new Map();
	const gapRetention = GAP_BUCKETS.map(() => emptyRetention());
	const overallRetention = emptyRetention();
	const resultCounts = { again: 0, hard: 0, good: 0, easy: 0 };
	const durationsByResult = { again: [], hard: [], good: [], easy: [] };
	const punchCard = Array.from({ length: 7 }, () => Array(24).fill(0));
	const allTimestamps = [];
	let studyTime = 0;

	// Overdue studied cards count as overdue, not in their stage;
	// overdueByStage keeps which stage they're in
	const maturity = { new: 0, overdue: 0, learning: 0, young: 0, mature: 0 };
	const overdueByStage = { learning: 0, young: 0, mature: 0 };
	const forecast = Array.from({ length: FORECAST_DAYS }, (_, i) => {
		const date = new Date(todayStart);
		date.setDate(date.getDate() + i);
		return { date, due: 0, overdue: 0 };
	});
	const forecastEnd = new Date(todayStart);
	forecastEnd.setDate(forecastEnd.getDate() + FORECAST_DAYS);

	const cardStats = [];
	const deckStats = [];

	decks.forEach((deck) => {
		const deckRetention = emptyRetention();
		let deckReviews = 0;
		let deckReviewed = 0;
		let deckOverdue = 0;
		let deckLastStudied = 0;
		const cards = deck.cards || [];

		cards.forEach((card) => {
			const reviews = [...(card.reviews || [])]
				.filter((review) => review?.timestamp)
				.sort((a, b) => a.timestamp - b.timestamp);
			let againCount = 0;
			let hardCount = 0;

			reviews.forEach((review, index) => {
				const { timestamp, result } = review;
				const date = new Date(timestamp);
				const dayKey = formatDateKey(date);
				const weekStart = startOfWeek(timestamp).getTime();

				allTimestamps.push(timestamp);
				reviewsByDay.set(dayKey, (reviewsByDay.get(dayKey) || 0) + 1);
				reviewsByWeek.set(
					weekStart,
					(reviewsByWeek.get(weekStart) || 0) + 1
				);
				punchCard[date.getDay()][date.getHours()]++;

				if (resultCounts[result] !== undefined) {
					resultCounts[result]++;
				}
				if (result === 'again') againCount++;
				if (result === 'hard') hardCount++;

				if (review.reviewDuration > 0) {
					const capped = Math.min(
						review.reviewDuration,
						DURATION_CAP
					);
					studyTime += capped;
					durationsByResult[result]?.push(capped);
				}

				// The first review of a card is learning it, not recalling it
				if (index === 0) return;
				const gap = timestamp - reviews[index - 1].timestamp;
				// Weighted by grade: Again 0 up to Easy 1, so a Hard
				// counts less than an Easy
				const recalled = RESULT_SCORES[result] ?? 0;
				const bucket = GAP_BUCKETS.findIndex((b) => gap < b.max);

				for (const target of [
					gapRetention[bucket],
					overallRetention,
					deckRetention,
				]) {
					target.total++;
					target.recalled += recalled;
				}
				if (!retentionByWeek.has(weekStart)) {
					retentionByWeek.set(weekStart, emptyRetention());
				}
				const week = retentionByWeek.get(weekStart);
				week.total++;
				week.recalled += recalled;
			});

			deckReviews += reviews.length;
			const lastReview = reviews[reviews.length - 1];
			if (lastReview) {
				deckReviewed++;
				deckLastStudied = Math.max(
					deckLastStudied,
					lastReview.timestamp
				);
			}
			const isOverdue = lastReview && card.whenDue <= now;
			if (isOverdue) deckOverdue++;

			// Hardest cards skip archived decks: they're not being studied
			if (reviews.length > 0 && !deck.isArchived) {
				cardStats.push({
					cardId: card.cardId,
					front: card.front,
					deckId: deck.deckId,
					deckName: deck.deckName,
					deckColor: deck.deckColor,
					reviewCount: reviews.length,
					againCount,
					hardCount,
					// Reviews graded Again or Hard
					struggleCount: againCount + hardCount,
					lastResult: lastReview.result,
				});
			}

			if (deck.isArchived) return;

			if (!lastReview) {
				maturity.new++;
				return;
			}
			const stage = maturityStage(getInterval(card));
			if (isOverdue) {
				maturity.overdue++;
				overdueByStage[stage]++;
			} else {
				maturity[stage]++;
			}

			if (isOverdue) {
				if (card.whenDue < todayStart) {
					forecast[0].overdue++;
					return;
				}
			}
			if (card.whenDue && card.whenDue < forecastEnd.getTime()) {
				const dayIndex = Math.round(
					(startOfDay(card.whenDue) - todayStart) / DAY
				);
				forecast[dayIndex].due++;
			}
		});

		deckStats.push({
			deckId: deck.deckId,
			deckName: deck.deckName,
			deckColor: deck.deckColor,
			isArchived: !!deck.isArchived,
			cardCount: cards.length,
			reviewedCount: deckReviewed,
			reviewCount: deckReviews,
			retention: rate(deckRetention),
			retentionSample: deckRetention.total,
			overdueCount: deckOverdue,
			overdueShare: deckReviewed > 0 ? deckOverdue / deckReviewed : 0,
			lastStudied: deckLastStudied || null,
		});
	});

	// Records
	const dayKeys = [...reviewsByDay.keys()].sort();
	let bestDay = null;
	reviewsByDay.forEach((count, key) => {
		if (!bestDay || count > bestDay.count) {
			bestDay = { date: parseDateKey(key), count };
		}
	});
	let bestWeek = null;
	reviewsByWeek.forEach((count, weekStart) => {
		if (!bestWeek || count > bestWeek.count) {
			bestWeek = { start: new Date(weekStart), count };
		}
	});

	// Sessions
	allTimestamps.sort((a, b) => a - b);
	const sessions = [];
	allTimestamps.forEach((timestamp, index) => {
		const session = sessions[sessions.length - 1];
		if (index > 0 && timestamp - allTimestamps[index - 1] <= SESSION_GAP) {
			session.end = timestamp;
			session.reviews++;
		} else {
			sessions.push({ start: timestamp, end: timestamp, reviews: 1 });
		}
	});
	const longestSession = sessions.reduce(
		(best, session) =>
			!best || session.reviews > best.reviews ? session : best,
		null
	);

	// Habits
	const busiestSlot = { day: 0, hour: 0, count: 0 };
	punchCard.forEach((hours, day) =>
		hours.forEach((count, hour) => {
			if (count > busiestSlot.count) {
				Object.assign(busiestSlot, { day, hour, count });
			}
		})
	);
	const reviewsByWeekday = punchCard.map((hours) =>
		hours.reduce((sum, count) => sum + count, 0)
	);
	const reviewsByHour = Array.from({ length: 24 }, (_, hour) =>
		punchCard.reduce((sum, hours) => sum + hours[hour], 0)
	);

	return {
		totalReviews: allTimestamps.length,
		resultCounts,
		records: {
			currentStreak: calculateStreakStats(decks).streak,
			longestStreak: longestStreak(dayKeys),
			bestDay,
			bestWeek,
			activeDays: dayKeys.length,
			studyTime,
			sessionCount: sessions.length,
			averageSessionReviews:
				sessions.length > 0
					? allTimestamps.length / sessions.length
					: 0,
			averageSessionLength:
				sessions.length > 0
					? sessions.reduce((sum, s) => sum + (s.end - s.start), 0) /
						sessions.length
					: 0,
			longestSession,
		},
		retention: {
			overall: rate(overallRetention),
			sample: overallRetention.total,
			byGap: GAP_BUCKETS.map((bucket, i) => ({
				label: bucket.label,
				short: bucket.short,
				rate: rate(gapRetention[i]),
				total: gapRetention[i].total,
			})),
			byWeek: [...retentionByWeek.entries()]
				.filter(([, week]) => week.total >= MIN_WEEKLY_REVIEWS)
				.sort(([a], [b]) => a - b)
				.map(([weekStart, week]) => ({
					weekStart,
					rate: rate(week),
					total: week.total,
				})),
		},
		maturity,
		overdueByStage,
		forecast,
		habits: {
			punchCard,
			busiestSlot,
			reviewsByWeekday,
			reviewsByHour,
			medianDurationByResult: RESULTS.map((result) => ({
				result,
				median: median(durationsByResult[result]),
				count: durationsByResult[result].length,
			})),
		},
		hardestCards: cardStats
			.filter((card) => card.struggleCount > 0)
			.sort(
				(a, b) =>
					b.struggleCount - a.struggleCount ||
					b.struggleCount / b.reviewCount -
						a.struggleCount / a.reviewCount
			)
			.slice(0, 10),
		decks: deckStats,
	};
}

// Average of the `days` values ending at `index` (fewer at the very start)
function trailingAverage(prefixSums, index, days) {
	const from = Math.max(0, index + 1 - days);
	return (prefixSums[index + 1] - prefixSums[from]) / (index + 1 - from);
}

/**
 * One entry per day from the first activity to today: reviews that day, a
 * 7-day and 28-day trailing average of daily reviews, and how many cards
 * were new / learning / young / mature / overdue at the end of that day
 * (overdue also split by stage). Maturity skips archived decks, like the
 * Card Maturity section; reviews count all.
 */
export function computeDailyHistory(appData, now = Date.now()) {
	const decks = appData?.decks || [];
	const cards = [];
	let earliest = now;

	decks.forEach((deck) => {
		(deck.cards || []).forEach((card) => {
			const reviews = (card.reviews || [])
				.filter((review) => review?.timestamp)
				.sort((a, b) => a.timestamp - b.timestamp);
			// Cards missing createdAt fall back to their first review, or today
			const created = Math.min(
				card.createdAt || Infinity,
				reviews[0]?.timestamp || Infinity
			);
			const createdAt = created === Infinity ? now : created;
			earliest = Math.min(earliest, createdAt);
			cards.push({
				card,
				reviews,
				createdAt,
				isArchived: deck.isArchived,
			});
		});
	});

	if (cards.length === 0) return [];

	const start = startOfDay(earliest).getTime();
	const dayCount = Math.round((startOfDay(now) - start) / DAY) + 1;
	const dayIndex = (timestamp) =>
		Math.min(
			dayCount,
			Math.max(0, Math.round((startOfDay(timestamp) - start) / DAY))
		);

	const reviews = Array(dayCount).fill(0);
	// Cards rescheduled by a catch-up on each day
	const catchUps = Array(dayCount).fill(0);
	// Difference arrays: +1 where a card enters a stage, -1 where it leaves
	const stageDeltas = {
		new: Array(dayCount + 1).fill(0),
		learning: Array(dayCount + 1).fill(0),
		young: Array(dayCount + 1).fill(0),
		mature: Array(dayCount + 1).fill(0),
		overdueLearning: Array(dayCount + 1).fill(0),
		overdueYoung: Array(dayCount + 1).fill(0),
		overdueMature: Array(dayCount + 1).fill(0),
	};
	const overdueKey = {
		learning: 'overdueLearning',
		young: 'overdueYoung',
		mature: 'overdueMature',
	};
	const addSpan = (stage, from, to) => {
		if (to <= from) return;
		stageDeltas[stage][from]++;
		stageDeltas[stage][to]--;
	};

	cards.forEach(({ card, reviews: cardReviews, createdAt, isArchived }) => {
		cardReviews.forEach((review) => {
			const index = dayIndex(review.timestamp);
			if (index < dayCount) reviews[index]++;
		});
		if (isArchived) return;

		addSpan(
			'new',
			dayIndex(createdAt),
			cardReviews.length ? dayIndex(cardReviews[0].timestamp) : dayCount
		);
		// A card is in its stage until its due date, then overdue
		const addScheduled = (interval, from, to, due) => {
			const stage = maturityStage(interval);
			// Due later today is still on schedule today
			const dueDay = due > now ? dayCount : dayIndex(due);
			addSpan(stage, from, Math.min(to, dueDay));
			addSpan(overdueKey[stage], Math.max(from, dueDay), to);
		};
		const reschedule = getActiveReschedule(card);

		cardReviews.forEach((review, i) => {
			const next = cardReviews[i + 1];
			const from = dayIndex(review.timestamp);
			const to = next ? dayIndex(next.timestamp) : dayCount;
			// The latest review's due date is the card's (before any
			// catch-up); without one the card is never overdue, as in the
			// Card Maturity section
			const due = next
				? null
				: (reschedule ? reschedule.previousWhenDue : card.whenDue) ||
					Infinity;
			// Older reviews may lack an interval: use the actual gap instead
			const endsAt = next ? next.timestamp : due;
			const interval =
				review.interval ||
				(Number.isFinite(endsAt) ? endsAt - review.timestamp : 0);

			if (next) {
				addScheduled(interval, from, to, review.timestamp + interval);
			} else if (reschedule) {
				// Original schedule until the catch-up, the new one after
				const catchUpDay = Math.max(from, dayIndex(reschedule.at));
				addScheduled(interval, from, catchUpDay, due);
				addScheduled(
					reschedule.interval,
					catchUpDay,
					to,
					card.whenDue || Infinity
				);
			} else {
				addScheduled(interval, from, to, due);
			}
		});
		if (card.reschedule?.at) {
			const index = dayIndex(card.reschedule.at);
			if (index < dayCount) catchUps[index]++;
		}
	});

	const prefixSums = [0];
	reviews.forEach((count, i) => prefixSums.push(prefixSums[i] + count));
	const running = Object.fromEntries(
		Object.keys(stageDeltas).map((stage) => [stage, 0])
	);

	return reviews.map((count, i) => {
		Object.keys(running).forEach((stage) => {
			running[stage] += stageDeltas[stage][i];
		});
		const date = new Date(start);
		date.setDate(date.getDate() + i);
		return {
			timestamp: date.getTime(),
			reviews: count,
			average7: trailingAverage(prefixSums, i, 7),
			average28: trailingAverage(prefixSums, i, 28),
			catchUps: catchUps[i],
			...running,
			overdue:
				running.overdueLearning +
				running.overdueYoung +
				running.overdueMature,
		};
	});
}

export function formatDuration(ms) {
	const totalMinutes = Math.round(ms / 60000);
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;
	if (hours > 0) return `${hours}h ${minutes}m`;
	if (totalMinutes > 0) return `${totalMinutes}m`;
	return `${Math.round(ms / 1000)}s`;
}

export function formatShortDate(date, withYear = false) {
	return new Date(date).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		...(withYear && { year: 'numeric' }),
	});
}

// "120 mature, 40 young": which stages a set of overdue cards are in
export function describeOverdue(byStage) {
	const parts = ['mature', 'young', 'learning']
		.filter((stage) => byStage[stage] > 0)
		.map((stage) => `${byStage[stage].toLocaleString()} ${stage}`);
	return parts.length > 0 ? parts.join(', ') : 'Past due date';
}

export function formatPercent(value) {
	return value == null ? '–' : `${Math.round(value * 100)}%`;
}
