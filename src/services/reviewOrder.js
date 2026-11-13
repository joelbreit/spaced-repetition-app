/**
 * Shuffle cards randomly, then nudge the order so that partner cards
 * (reversed front/back pairs linked via `partnerCardId`) end up far apart.
 *
 * Best-effort: aims for each pair to be at least 40% of the list apart, using a
 * bounded number of random swaps that only ever reduce the total shortfall.
 * Returns a new array; the input is not modified.
 */
export function shuffleSpreadingPartners(cards) {
	const order = cards.slice();
	const n = order.length;

	for (let i = n - 1; i > 0; i -= 1) {
		const j = Math.floor(Math.random() * (i + 1));
		[order[i], order[j]] = [order[j], order[i]];
	}

	// 40% of the list: well above a plain shuffle's typical gap, but loose enough
	// that all-pair decks don't settle into a predictable mirrored order.
	// Small lists still aim to avoid back-to-back partners.
	if (n < 3) return order;
	const target = Math.max(2, Math.floor(n * 0.4));

	// position of each cardId in `order`
	const pos = new Map(order.map((card, i) => [card.cardId, i]));
	const partnerOf = (card) =>
		card.partnerCardId && pos.has(card.partnerCardId)
			? card.partnerCardId
			: null;

	if (!order.some(partnerOf)) return order;

	const shortfallAt = (i) => {
		const partnerId = partnerOf(order[i]);
		if (!partnerId) return 0;
		return Math.max(0, target - Math.abs(i - pos.get(partnerId)));
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
		// Partners of a and b also moved relative to them, but shortfall is
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
