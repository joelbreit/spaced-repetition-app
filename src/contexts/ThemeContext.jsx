import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

// 'system' follows the OS setting; 'light' and 'dark' override it.
// index.html reads the same key before first paint to avoid a flash.
const STORAGE_KEY = 'themePreference';
const PREFERENCES = ['system', 'light', 'dark'];
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

function readPreference() {
	try {
		const saved = localStorage.getItem(STORAGE_KEY);
		return PREFERENCES.includes(saved) ? saved : 'system';
	} catch {
		return 'system';
	}
}

export function ThemeProvider({ children }) {
	const [preference, setPreference] = useState(readPreference);
	const [systemIsDark, setSystemIsDark] = useState(darkQuery.matches);

	useEffect(() => {
		const handleChange = (event) => setSystemIsDark(event.matches);
		darkQuery.addEventListener('change', handleChange);
		return () => darkQuery.removeEventListener('change', handleChange);
	}, []);

	const isDark =
		preference === 'dark' || (preference === 'system' && systemIsDark);

	useEffect(() => {
		document.documentElement.classList.toggle('dark', isDark);
		document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
	}, [isDark]);

	useEffect(() => {
		try {
			localStorage.setItem(STORAGE_KEY, preference);
		} catch {
			// Storage unavailable (e.g. private mode): the choice lasts this visit
		}
	}, [preference]);

	// Cycles system → light → dark
	const toggleTheme = () => {
		setPreference(
			(prev) =>
				PREFERENCES[
					(PREFERENCES.indexOf(prev) + 1) % PREFERENCES.length
				]
		);
	};

	return (
		<ThemeContext.Provider
			value={{ isDark, preference, setPreference, toggleTheme }}
		>
			{children}
		</ThemeContext.Provider>
	);
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
	const context = useContext(ThemeContext);
	if (context === undefined) {
		throw new Error('useTheme must be used within a ThemeProvider');
	}
	return context;
}
