// The four review grades, from "start over" to "lengthen the interval".
// They used to be Anki's Again/Hard/Good/Easy, but this app treats them as
// scheduling decisions rather than Anki's recall levels, so the names changed
// to avoid confusion with Anki and between the old and new meanings.
export const RESULTS = ['forgot', 'sooner', 'right', 'later'];

export const RESULT_LABELS = {
	forgot: 'Forgot',
	sooner: 'Sooner',
	right: 'Right',
	later: 'Later',
};

// Grades saved before the rename, mapped to their new names
const LEGACY_RESULTS = {
	again: 'forgot',
	hard: 'sooner',
	good: 'right',
	easy: 'later',
};

export function normalizeResult(result) {
	return isLegacyResult(result) ? LEGACY_RESULTS[result] : result;
}

function isLegacyResult(result) {
	return Object.hasOwn(LEGACY_RESULTS, result);
}

/**
 * Renames grades saved under the old Again/Hard/Good/Easy names. Only decks
 * and cards with an old grade are copied; everything else keeps its identity,
 * and data with nothing to migrate comes back as the same object.
 * @param {Object} appData - The app data object with folders and decks
 * @returns {Object} App data whose reviews all use the new grade names
 */
export function migrateGrades(appData) {
	if (!appData?.decks) return appData;

	let changed = false;
	const decks = appData.decks.map((deck) => {
		if (!deck.cards?.some(hasLegacyReview)) return deck;
		changed = true;
		return {
			...deck,
			cards: deck.cards.map((card) =>
				hasLegacyReview(card)
					? {
							...card,
							reviews: card.reviews.map((review) =>
								isLegacyResult(review.result)
									? {
											...review,
											result: normalizeResult(
												review.result
											),
										}
									: review
							),
						}
					: card
			),
		};
	});

	return changed ? { ...appData, decks } : appData;
}

function hasLegacyReview(card) {
	return (card.reviews || []).some((review) => isLegacyResult(review.result));
}
