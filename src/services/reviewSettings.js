// Review-session settings (text-to-speech + card animation), stored per device.
// The `readAloudSettings` key predates the non-TTS options and is kept so
// existing saved settings carry over.
const SETTINGS_KEY = 'readAloudSettings';
const SPEED_KEY = 'readAloudPlaybackSpeed';

// Card flip animation length in ms, by setting
export const FLIP_DURATIONS = {
	normal: 200,
	fast: 100,
	off: 0,
};

export const DEFAULT_REVIEW_SETTINGS = {
	voiceId: 'Ruth',
	engine: 'generative',
	autoRead: 'off',
	playbackSpeed: 1.0,
	prefetchAudio: false,
	waitForAudio: false,
	flipSpeed: 'normal',
};

export function loadReviewSettings() {
	try {
		const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
		const savedSpeed = parseFloat(localStorage.getItem(SPEED_KEY));
		const settings = { ...DEFAULT_REVIEW_SETTINGS, ...saved };
		if (!Number.isNaN(savedSpeed)) settings.playbackSpeed = savedSpeed;
		if (!(settings.flipSpeed in FLIP_DURATIONS)) {
			settings.flipSpeed = DEFAULT_REVIEW_SETTINGS.flipSpeed;
		}
		return settings;
	} catch (error) {
		console.error('Error loading review settings:', error);
		return { ...DEFAULT_REVIEW_SETTINGS };
	}
}

export function saveReviewSettings(settings) {
	try {
		localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
		localStorage.setItem(SPEED_KEY, String(settings.playbackSpeed));
	} catch (error) {
		console.error('Error saving review settings:', error);
	}
}

export function getFlipDuration() {
	return FLIP_DURATIONS[loadReviewSettings().flipSpeed];
}
