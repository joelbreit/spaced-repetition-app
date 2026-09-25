import { X, Keyboard } from 'lucide-react';

const SHORTCUT_GROUPS = [
	{
		title: 'Reviewing',
		shortcuts: [
			{ keys: ['Enter'], description: 'Flip card' },
			{ keys: ['←', '1'], description: 'Again' },
			{ keys: ['↓', '2'], description: 'Hard' },
			{ keys: ['→', '3'], description: 'Good' },
			{ keys: ['↑', '4'], description: 'Easy' },
			{ keys: ['Z'], description: 'Undo last review' },
		],
	},
	{
		title: 'Card',
		shortcuts: [
			{ keys: ['Space'], description: 'Read aloud / pause' },
			{ keys: ['S'], description: 'Star' },
			{ keys: ['F'], description: 'Flag' },
			{ keys: ['E'], description: 'Edit' },
		],
	},
	{
		title: 'Session',
		shortcuts: [
			{ keys: ['?'], description: 'Show this list' },
			{ keys: ['Esc'], description: 'End review' },
		],
	},
];

export function Kbd({ children, className = '' }) {
	return (
		<kbd
			className={`inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded-md border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-xs font-semibold font-sans text-gray-600 dark:text-slate-300 shadow-[0_1px_0_rgba(0,0,0,0.08)] ${className}`}
		>
			{children}
		</kbd>
	);
}

export default function KeyboardShortcutsModal({ isOpen, onClose }) {
	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div
				role="dialog"
				aria-modal="true"
				aria-labelledby="shortcuts-title"
				className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 w-full max-w-md max-h-[90vh] overflow-y-auto animate-scale-in"
			>
				<div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-700">
					<div className="flex items-center gap-2">
						<Keyboard className="h-5 w-5 text-teal-500" />
						<h2
							id="shortcuts-title"
							className="text-lg font-semibold text-gray-900 dark:text-slate-100"
						>
							Keyboard shortcuts
						</h2>
					</div>
					<button
						onClick={onClose}
						className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-slate-200 dark:hover:bg-slate-700 transition-colors"
						aria-label="Close"
					>
						<X className="h-5 w-5" />
					</button>
				</div>
				<div className="px-6 py-4 space-y-5">
					{SHORTCUT_GROUPS.map((group) => (
						<div key={group.title}>
							<h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
								{group.title}
							</h3>
							<ul className="space-y-2">
								{group.shortcuts.map((shortcut) => (
									<li
										key={shortcut.description}
										className="flex items-center justify-between text-sm text-gray-700 dark:text-slate-200"
									>
										<span>{shortcut.description}</span>
										<span className="flex items-center gap-1">
											{shortcut.keys.map((key, i) => (
												<span
													key={key}
													className="flex items-center gap-1"
												>
													{i > 0 && (
														<span className="text-xs text-gray-400">
															or
														</span>
													)}
													<Kbd>{key}</Kbd>
												</span>
											))}
										</span>
									</li>
								))}
							</ul>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
