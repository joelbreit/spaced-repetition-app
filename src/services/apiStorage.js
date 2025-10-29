const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT;

if (!API_ENDPOINT) {
	console.error('VITE_API_ENDPOINT is not defined in environment variables');
}

/**
 * Load flashcard data from the API
 * @returns {Promise<Object>} The flashcard data
 */
export async function loadFromAPI() {
	try {
		const response = await fetch(`${API_ENDPOINT}/data`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
			},
		});

		if (!response.ok) {
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
 * Save flashcard data to the API
 * @param {Object} data - The flashcard data to save
 * @returns {Promise<Object>} Response from the API
 */
export async function saveToAPI(data) {
	try {
		const response = await fetch(`${API_ENDPOINT}/data`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(data),
		});

		if (!response.ok) {
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
			method: 'GET',
		});
		return response.ok;
	} catch (error) {
		console.error(`Error: ${error}`);
		return false;
	}
}