import { useState } from 'react';

const STORAGE_KEY = 'cardEditorPreview';

function readSetting() {
	try {
		return localStorage.getItem(STORAGE_KEY) !== 'off';
	} catch {
		return true;
	}
}

/**
 * Whether the card editors show a live preview: on by default, remembered on
 * this device. Returns [show, toggle].
 */
export function useShowPreview() {
	const [show, setShow] = useState(readSetting);
	const toggle = () =>
		setShow((prev) => {
			try {
				localStorage.setItem(STORAGE_KEY, prev ? 'off' : 'on');
			} catch {
				// Storage unavailable: the choice lasts this visit
			}
			return !prev;
		});
	return [show, toggle];
}
