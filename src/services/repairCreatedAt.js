/**
 * Repairs missing createdAt values in app data
 * - Cards: uses earliest whenDue or review timestamp
 * - Decks: uses earliest card createdAt value
 * - Folders: uses earliest subfolder or deck createdAt value
 */

/**
 * Repairs missing createdAt values for cards, decks, and folders
 * @param {Object} appData - The app data object with folders, decks, and cards
 * @returns {Object} - Updated app data with repaired createdAt values
 */
export function repairCreatedAtValues(appData) {
	const updatedData = JSON.parse(JSON.stringify(appData)); // Deep clone
	const { folders, decks } = updatedData;

	// Step 1: Repair cards first (they are the base level)
	decks.forEach((deck) => {
		if (deck.cards && Array.isArray(deck.cards)) {
			deck.cards.forEach((card) => {
				if (!card.createdAt) {
					// Find earliest timestamp from whenDue or reviews
					const timestamps = [];

					// Add whenDue if it exists
					if (card.whenDue) {
						timestamps.push(card.whenDue);
					}

					// Add all review timestamps
					if (card.reviews && Array.isArray(card.reviews)) {
						card.reviews.forEach((review) => {
							if (review.timestamp) {
								timestamps.push(review.timestamp);
							}
						});
					}

					// Use the earliest timestamp, or current time if none found
					if (timestamps.length > 0) {
						card.createdAt = Math.min(...timestamps);
					} else {
						// Fallback to current time if no timestamps available
						card.createdAt = Date.now();
					}
				}
			});
		}
	});

	// Step 2: Repair decks (based on their cards' createdAt values)
	decks.forEach((deck) => {
		if (!deck.createdAt) {
			// Find earliest card createdAt in this deck
			const cardCreatedAts = [];

			if (deck.cards && Array.isArray(deck.cards)) {
				deck.cards.forEach((card) => {
					if (card.createdAt) {
						cardCreatedAts.push(card.createdAt);
					}
				});
			}

			// Use the earliest card createdAt, or current time if no cards have createdAt
			if (cardCreatedAts.length > 0) {
				deck.createdAt = Math.min(...cardCreatedAts);
			} else {
				// Fallback to current time if no cards have createdAt
				deck.createdAt = Date.now();
			}
		}
	});

	// Step 3: Repair folders (based on subfolders and decks)
	// We need to process folders in order from deepest to shallowest
	// First, build a map of folder relationships
	const folderMap = new Map();
	folders.forEach((folder) => {
		folderMap.set(folder.folderId, folder);
	});

	// Helper function to get all descendant folder IDs (recursive)
	const getDescendantFolderIds = (folderId) => {
		const descendants = [];
		folders.forEach((folder) => {
			if (folder.parentFolderId === folderId) {
				descendants.push(folder.folderId);
				descendants.push(...getDescendantFolderIds(folder.folderId));
			}
		});
		return descendants;
	};

	// Helper function to calculate folder depth
	const getFolderDepth = (folderId) => {
		const folder = folderMap.get(folderId);
		if (!folder || !folder.parentFolderId) {
			return 0;
		}
		return 1 + getFolderDepth(folder.parentFolderId);
	};

	// Sort folders by depth (deepest first) so we can process children before parents
	const sortedFolders = [...folders].sort(
		(a, b) => getFolderDepth(b.folderId) - getFolderDepth(a.folderId)
	);

	// Process each folder
	sortedFolders.forEach((folder) => {
		if (!folder.createdAt) {
			const timestamps = [];

			// Get all descendant folder IDs (all subfolders at any level)
			const descendantFolderIds = getDescendantFolderIds(folder.folderId);

			// Add createdAt from all descendant folders
			descendantFolderIds.forEach((descendantId) => {
				const descendantFolder = folderMap.get(descendantId);
				if (descendantFolder && descendantFolder.createdAt) {
					timestamps.push(descendantFolder.createdAt);
				}
			});

			// Add createdAt from all decks in this folder and its subfolders
			// First, get all descendant folder IDs including this folder itself
			const allFolderIds = [folder.folderId, ...descendantFolderIds];
			decks.forEach((deck) => {
				if (allFolderIds.includes(deck.parentFolderId) && deck.createdAt) {
					timestamps.push(deck.createdAt);
				}
			});

			// Use the earliest timestamp, or current time if none found
			if (timestamps.length > 0) {
				folder.createdAt = Math.min(...timestamps);
			} else {
				// Fallback to current time if no children have createdAt
				folder.createdAt = Date.now();
			}
		}
	});

	return updatedData;
}

