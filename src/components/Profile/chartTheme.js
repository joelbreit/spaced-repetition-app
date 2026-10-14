import { useTheme } from '../../contexts/ThemeContext';

// Hex values for Recharts, which takes colors as SVG props rather than
// Tailwind classes. Dark mode uses the lighter step of each hue.
const LIGHT = {
	axis: 'rgb(107 114 128)', // gray-500
	grid: 'rgb(229 231 235)', // gray-200
	cursor: 'rgb(243 244 246)', // gray-100
	primary: '#14b8a6', // teal-500
	secondary: '#06b6d4', // cyan-500
	muted: 'rgb(209 213 219)', // gray-300
	again: '#ef4444', // red-500
	hard: '#f97316', // orange-500
	good: '#22c55e', // green-500
	easy: '#14b8a6', // teal-500
	surface: '#ffffff',
	ink: 'rgb(55 65 81)', // gray-700
	// Card maturity: one hue, light to dark (matches CardMaturity)
	stageNew: 'rgb(209 213 219)', // gray-300
	stageOverdue: '#f97316', // orange-500
	stageLearning: '#99f6e4', // teal-200
	stageYoung: '#2dd4bf', // teal-400
	stageMature: '#0f766e', // teal-700
};

const DARK = {
	axis: 'rgb(148 163 184)', // slate-400
	grid: 'rgb(51 65 85)', // slate-700
	cursor: 'rgb(51 65 85 / 0.4)',
	primary: '#2dd4bf', // teal-400
	secondary: '#22d3ee', // cyan-400
	muted: 'rgb(71 85 105)', // slate-600
	again: '#f87171', // red-400
	hard: '#fb923c', // orange-400
	good: '#4ade80', // green-400
	easy: '#2dd4bf', // teal-400
	surface: '#1e293b', // slate-800
	ink: 'rgb(226 232 240)', // slate-200
	stageNew: 'rgb(71 85 105)', // slate-600
	stageOverdue: '#fb923c', // orange-400
	stageLearning: '#0f766e', // teal-700
	stageYoung: '#14b8a6', // teal-500
	stageMature: '#5eead4', // teal-300
};

export function useChartColors() {
	const { isDark } = useTheme();
	return isDark ? DARK : LIGHT;
}

export const RESULT_LABELS = {
	again: 'Again',
	hard: 'Hard',
	good: 'Good',
	easy: 'Easy',
};

export const RESULT_SWATCH_CLASSES = {
	again: 'bg-red-500 dark:bg-red-400',
	hard: 'bg-orange-500 dark:bg-orange-400',
	good: 'bg-green-500 dark:bg-green-400',
	easy: 'bg-teal-500 dark:bg-teal-400',
};
