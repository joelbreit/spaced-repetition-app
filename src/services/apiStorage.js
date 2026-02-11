const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT;

if (!API_ENDPOINT) {
	console.error('VITE_API_ENDPOINT is not defined in environment variables');
}

/**
 * Load flashcard data from the API (with authentication)
 * @param {string} authToken - JWT token from Cognito
 * @param {Function} [refreshToken] - Optional function to refresh the token if it expires
 * @returns {Promise<Object>} The flashcard data
 */
export async function loadFromAPI(authToken, refreshToken = null) {
	try {
		const response = await fetch(`${API_ENDPOINT}/data`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${authToken}`,
			},
		});

		if (!response.ok) {
			if (response.status === 401 && refreshToken) {
				// Token expired, try refreshing and retry once
				console.log('Token expired, refreshing...');
				const newToken = await refreshToken();
				if (newToken) {
					// Retry with new token
					const retryResponse = await fetch(`${API_ENDPOINT}/data`, {
						method: 'GET',
						headers: {
							'Content-Type': 'application/json',
							Authorization: `Bearer ${newToken}`,
						},
					});
					if (!retryResponse.ok) {
						throw new Error(
							`HTTP error! status: ${retryResponse.status}`
						);
					}
					const data = await retryResponse.json();
					return data;
				}
			}
			if (response.status === 401) {
				throw new Error('Unauthorized - please log in again');
			}
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data = await response.json();
		return data;
	} catch (error) {
		console.error('Error loading from API:', error);
		throw error;
	}
}

/**
 * Save flashcard data to the API (with authentication)
 * @param {Object} data - The flashcard data to save
 * @param {string} authToken - JWT token from Cognito
 * @param {Function} [refreshToken] - Optional function to refresh the token if it expires
 * @returns {Promise<Object>} Response from the API
 */
export async function saveToAPI(data, authToken, refreshToken = null) {
	try {
		const response = await fetch(`${API_ENDPOINT}/data`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${authToken}`,
			},
			body: JSON.stringify(data),
		});

		if (!response.ok) {
			if (response.status === 401 && refreshToken) {
				// Token expired, try refreshing and retry once
				console.log('Token expired, refreshing...');
				const newToken = await refreshToken();
				if (newToken) {
					// Retry with new token
					const retryResponse = await fetch(`${API_ENDPOINT}/data`, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							Authorization: `Bearer ${newToken}`,
						},
						body: JSON.stringify(data),
					});
					if (!retryResponse.ok) {
						throw new Error(
							`HTTP error! status: ${retryResponse.status}`
						);
					}
					const result = await retryResponse.json();
					return result;
				}
			}
			if (response.status === 401) {
				throw new Error('Unauthorized - please log in again');
			}
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const result = await response.json();
		return result;
	} catch (error) {
		console.error('Error saving to API:', error);
		throw error;
	}
}

/**
 * Patch flashcard data to the API (with authentication)
 * Only sends the changed portion (card or deck) instead of entire dataset
 * @param {Object} patchData - The patch data object with format:
 *   - Card patch: { type: 'card', deckId: string, card: CardObject }
 *   - Deck patch: { type: 'deck', deck: DeckObject }
 * @param {string} authToken - JWT token from Cognito
 * @param {Function} [refreshToken] - Optional function to refresh the token if it expires
 * @returns {Promise<Object>} Response from the API
 */
export async function patchToAPI(patchData, authToken, refreshToken = null) {
	try {
		const response = await fetch(`${API_ENDPOINT}/data`, {
			method: 'PATCH',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${authToken}`,
			},
			body: JSON.stringify(patchData),
		});

		if (!response.ok) {
			if (response.status === 401 && refreshToken) {
				// Token expired, try refreshing and retry once
				console.log('Token expired, refreshing...');
				const newToken = await refreshToken();
				if (newToken) {
					// Retry with new token
					const retryResponse = await fetch(`${API_ENDPOINT}/data`, {
						method: 'PATCH',
						headers: {
							'Content-Type': 'application/json',
							Authorization: `Bearer ${newToken}`,
						},
						body: JSON.stringify(patchData),
					});
					if (!retryResponse.ok) {
						throw new Error(
							`HTTP error! status: ${retryResponse.status}`
						);
					}
					const result = await retryResponse.json();
					return result;
				}
			}
			if (response.status === 401) {
				throw new Error('Unauthorized - please log in again');
			}
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const result = await response.json();
		return result;
	} catch (error) {
		console.error('Error patching to API:', error);
		throw error;
	}
}

/**
 * Check if the API is accessible
 * @returns {Promise<boolean>}
 */
export async function checkAPIHealth() {
	try {
		const response = await fetch(`${API_ENDPOINT}/data`, {
			method: 'OPTIONS',
		});
		return response.ok;
	} catch (error) {
		console.error('Error checking API health:', error);
		return false;
	}
}

/**
 * Read text aloud using AWS Polly text-to-speech
 * @param {string} text - The text to convert to speech
 * @param {string} [voiceId] - Optional voice ID (defaults to saved setting or 'Ruth')
 * @param {string} [engine] - Optional engine type (defaults to saved setting or 'generative')
 * @returns {Promise<Blob>} Audio blob
 */
export async function readAloudAPI(text, voiceId = null, engine = null) {
	// Load settings from localStorage or use defaults
	let finalVoiceId = voiceId;
	let finalEngine = engine;

	if (!finalVoiceId || !finalEngine) {
		try {
			const savedSettings = localStorage.getItem('readAloudSettings');
			if (savedSettings) {
				const settings = JSON.parse(savedSettings);
				finalVoiceId = finalVoiceId || settings.voiceId || 'Ruth';
				finalEngine = finalEngine || settings.engine || 'generative';
			} else {
				finalVoiceId = finalVoiceId || 'Ruth';
				finalEngine = finalEngine || 'generative';
			}
		} catch (error) {
			console.error('Error loading readAloud settings:', error);
			finalVoiceId = finalVoiceId || 'Ruth';
			finalEngine = finalEngine || 'generative';
		}
	}

	try {
		const response = await fetch(`${API_ENDPOINT}/read-aloud`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				text,
				VoiceId: finalVoiceId,
				Engine: finalEngine,
			}),
		});

		// Estimated cost calculation based on engine
		// Generative: $30 per 1M characters
		// Neural: $16 per 1M characters
		// Standard: $4 per 1M characters
		let costPerMillion = 30; // generative default
		if (finalEngine === 'neural') {
			costPerMillion = 16;
		} else if (finalEngine === 'standard') {
			costPerMillion = 4;
		}
		const dollars = (text.length / 1000000) * costPerMillion;
		console.log(`Estimated cost (${finalEngine}): $${dollars.toFixed(4)}`);

		if (!response.ok) {
			let errorMessage = `HTTP error! status: ${response.status}`;
			try {
				const errorData = await response.json();
				errorMessage =
					errorData.error || errorData.message || errorMessage;
			} catch {
				errorMessage = response.statusText || errorMessage;
			}
			throw new Error(errorMessage);
		}

		const contentType = response.headers.get('content-type');

		if (contentType && contentType.includes('audio/mpeg')) {
			const blob = await response.blob();
			return blob; // Just return the blob
		} else {
			const data = await response.json();
			throw new Error(data.error || data.message || 'Unknown error');
		}
	} catch (error) {
		console.error('Error reading aloud:', error);
		throw error;
	}
}
