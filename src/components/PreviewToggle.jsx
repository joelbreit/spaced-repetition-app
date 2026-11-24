import { Eye, EyeOff } from 'lucide-react';

/** Header button that shows or hides a card editor's preview */
export default function PreviewToggle({ show, onToggle }) {
	const Icon = show ? EyeOff : Eye;
	return (
		<button
			type="button"
			onClick={onToggle}
			aria-pressed={show}
			className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition-colors duration-200"
		>
			<Icon className="h-4 w-4" />
			{show ? 'Hide preview' : 'Preview'}
		</button>
	);
}
