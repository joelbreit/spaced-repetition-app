/**
 * Shuffle cards randomly, then nudge the order so that sibling cards (cards
 * of the same note: a reversed front/back pair, or a cloze note's cards) end
 * up far apart.
 *
 * Best-effort: aims for each pair of siblings to be at least 40% of the list
 * apart, split between a note's gaps when it has more than two cards, using a
 * bounded number of random swaps that only ever reduce the total shortfall.
 * Returns a new array; the input is not modified. The name predates cloze
 * cards; partners are the two-card case.
 */
export function shuffleSpreadingPartners(cards) {
	const order = cards.slice();
	const n = order.length;

	for (let i = n - 1; i > 0; i -= 1) {
		const j = Math.floor(Math.random() * (i + 1));
		[order[i], order[j]] = [order[j], order[i]];
	}

	if (n < 3) return order;

	// Cards in this list grouped by note; only notes with 2+ cards matter
	const byNote = new Map();
	order.forEach((card) => {
		if (!card.noteId) return;
		if (!byNote.has(card.noteId)) byNote.set(card.noteId, []);
		byNote.get(card.noteId).push(card.cardId);
	});
	const siblings = new Map();
	byNote.forEach((ids) => {
		if (ids.length < 2) return;
		ids.forEach((id) =>
			siblings.set(
				id,
				ids.filter((other) => other !== id)
			)
		);
	});
	if (siblings.size === 0) return order;

	// 40% of the list: well above a plain shuffle's typical gap, but loose
	// enough that all-pair decks don't settle into a predictable mirrored
	// order. A note with k cards splits that over its k - 1 gaps, so the
	// target stays reachable. Small lists still aim to avoid back-to-back
	// siblings.
	const targetFor = (count) =>
		Math.max(2, Math.floor((n * 0.4) / (count - 1)));

	// position of each cardId in `order`
	const pos = new Map(order.map((card, i) => [card.cardId, i]));

	const shortfallAt = (i) => {
		const ids = siblings.get(order[i].cardId);
		if (!ids) return 0;
		const target = targetFor(ids.length + 1);
		return ids.reduce(
			(sum, id) => sum + Math.max(0, target - Math.abs(i - pos.get(id))),
			0
		);
	};

	const maxIterations = n * 50;
	for (let iter = 0; iter < maxIterations; iter += 1) {
		const violators = [];
		for (let i = 0; i < n; i += 1) {
			if (shortfallAt(i) > 0) violators.push(i);
		}
		if (violators.length === 0) break;

		const a = violators[Math.floor(Math.random() * violators.length)];
		const b = Math.floor(Math.random() * n);
		if (a === b) continue;

		const before = shortfallAt(a) + shortfallAt(b);
		swap(order, pos, a, b);
		const after = shortfallAt(a) + shortfallAt(b);
		// Every sibling gap that moved involves a or b, and shortfall is
		// symmetric within a pair, so these two positions capture the change.
		if (after > before) swap(order, pos, a, b);
	}

	return order;
}

function swap(order, pos, a, b) {
	[order[a], order[b]] = [order[b], order[a]];
	pos.set(order[a].cardId, a);
	pos.set(order[b].cardId, b);
}
