// Folder colors are stored as one of these keys (folderColor). Keys are
// persisted in user data, so never rename or remove one. Class strings are
// written out in full so Tailwind can find them.
export const FOLDER_COLORS = {
	teal: {
		label: 'Teal',
		swatch: 'bg-teal-500',
		icon: 'text-teal-500 dark:text-teal-400',
		tile: 'bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400',
		accent: 'border-l-teal-500 dark:border-l-teal-500',
	},
	blue: {
		label: 'Blue',
		swatch: 'bg-blue-500',
		icon: 'text-blue-500 dark:text-blue-400',
		tile: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
		accent: 'border-l-blue-500 dark:border-l-blue-500',
	},
	indigo: {
		label: 'Indigo',
		swatch: 'bg-indigo-500',
		icon: 'text-indigo-500 dark:text-indigo-400',
		tile: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400',
		accent: 'border-l-indigo-500 dark:border-l-indigo-500',
	},
	violet: {
		label: 'Violet',
		swatch: 'bg-violet-500',
		icon: 'text-violet-500 dark:text-violet-400',
		tile: 'bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400',
		accent: 'border-l-violet-500 dark:border-l-violet-500',
	},
	pink: {
		label: 'Pink',
		swatch: 'bg-pink-500',
		icon: 'text-pink-500 dark:text-pink-400',
		tile: 'bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400',
		accent: 'border-l-pink-500 dark:border-l-pink-500',
	},
	red: {
		label: 'Red',
		swatch: 'bg-red-500',
		icon: 'text-red-500 dark:text-red-400',
		tile: 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400',
		accent: 'border-l-red-500 dark:border-l-red-500',
	},
	orange: {
		label: 'Orange',
		swatch: 'bg-orange-500',
		icon: 'text-orange-500 dark:text-orange-400',
		tile: 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
		accent: 'border-l-orange-500 dark:border-l-orange-500',
	},
	amber: {
		label: 'Amber',
		swatch: 'bg-amber-500',
		icon: 'text-amber-500 dark:text-amber-400',
		tile: 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
		accent: 'border-l-amber-500 dark:border-l-amber-500',
	},
	green: {
		label: 'Green',
		swatch: 'bg-green-500',
		icon: 'text-green-500 dark:text-green-400',
		tile: 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400',
		accent: 'border-l-green-500 dark:border-l-green-500',
	},
	slate: {
		label: 'Slate',
		swatch: 'bg-slate-500',
		icon: 'text-slate-500 dark:text-slate-400',
		tile: 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300',
		accent: 'border-l-slate-500 dark:border-l-slate-500',
	},
};

export const DEFAULT_FOLDER_COLOR = 'teal';

// Unknown values (including the hex placeholder from the original schema)
// fall back to the default color
export function normalizeFolderColor(color) {
	return FOLDER_COLORS[color] ? color : DEFAULT_FOLDER_COLOR;
}

export function getFolderColor(color) {
	return FOLDER_COLORS[normalizeFolderColor(color)];
}
