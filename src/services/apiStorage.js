const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT;

if (!API_ENDPOINT) {
	console.error('VITE_API_ENDPOINT is not defined in environment variables');
}

/**
 * Load flashcard data from the API (with authentication)
 * @param {string} authToken - JWT token from Cognito
 * @returns {Promise<Object>} The flashcard data
 */
export async function loadFromAPI(authToken) {
	try {
		const response = await fetch(`${API_ENDPOINT}/data`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${authToken}`,
			},
		});

		if (!response.ok) {
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
 * @returns {Promise<Object>} Response from the API
 */
export async function saveToAPI(data, authToken) {
	try {
		const response = await fetch(`${API_ENDPOINT}/data`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${authToken}`,
			},
			body: JSON.stringify(data),
		});

		if (!response.ok) {
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