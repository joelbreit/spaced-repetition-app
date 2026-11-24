import { useRef, useState } from 'react';
import { Check, X } from 'lucide-react';
import ClozeFields from './ClozeFields';
import CardPreview from './CardPreview';
import PreviewToggle from './PreviewToggle';
import { useShowPreview } from '../hooks/useShowPreview';
import { clozeOrds } from '../services/cloze';

const inputClasses =
	'w-full px-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200 resize-y';

const TYPES = [
	['basic', 'Basic'],
	['cloze', 'Cloze'],
];

/**
 * Modal for adding cards to a deck, basic (front/back) or cloze, with a live
 * preview. "Add Card" adds and closes; Ctrl/Cmd+Enter adds and clears the
 * fields for the next one, so a batch can be typed without the mouse.
 * @param {'basic'|'cloze'} type - kept by the caller while the page is open
 * @param {Function} onAddBasic - (front, back)
 * @param {Function} onAddCloze - (text, extra)
 */
export default function NewCardModal({
	type,
	onTypeChange,
	onAddBasic,
	onAddCloze,
	onClose,
}) {
	const [front, setFront] = useState('');
	const [back, setBack] = useState('');
	const [clozeText, setClozeText] = useState('');
	const [clozeExtra, setClozeExtra] = useState('');
	const [added, setAdded] = useState(0);
	const [showPreview, togglePreview] = useShowPreview();
	const frontRef = useRef(null);
	const clozeRef = useRef(null);

	const isCloze = type === 'cloze';
	const canAdd = isCloze
		? clozeOrds(clozeText).length > 0
		: !!front.trim() && !!back.trim();
	const hasInput = isCloze
		? !!(clozeText.trim() || clozeExtra.trim())
		: !!(front.trim() || back.trim());

	const add = ({ keepOpen = false } = {}) => {
		if (!canAdd) return;
		if (isCloze) {
			onAddCloze(clozeText.trim(), clozeExtra.trim());
			setClozeText('');
			setClozeExtra('');
		} else {
			onAddBasic(front.trim(), back.trim());
			setFront('');
			setBack('');
		}
		if (!keepOpen) {
			onClose();
			return;
		}
		setAdded((n) => n + 1);
		(isCloze ? clozeRef : frontRef).current?.focus();
	};

	const handleKeyDown = (e) => {
		if (e.key === 'Escape') {
			e.preventDefault();
			onClose();
		} else if (
			e.key === 'Enter' &&
			(e.ctrlKey || e.metaKey) &&
			!e.nativeEvent.isComposing
		) {
			e.preventDefault();
			add({ keepOpen: true });
		}
	};

	// A stray click outside doesn't throw away typed text
	const handleBackdropClick = (e) => {
		if (e.target === e.currentTarget && !hasInput) onClose();
	};

	return (
		<div
			className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
			onClick={handleBackdropClick}
			onKeyDown={handleKeyDown}
		>
			<div
				role="dialog"
				aria-modal="true"
				aria-labelledby="new-card-title"
				className={`bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 w-full ${
					showPreview ? 'max-w-5xl' : 'max-w-2xl'
				} max-h-[90vh] overflow-hidden flex flex-col animate-scale-in`}
			>
				{/* Header */}
				<div className="flex flex-wrap items-center gap-3 px-6 py-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/50">
					<h2
						id="new-card-title"
						className="text-xl font-bold text-gray-900 dark:text-slate-100"
					>
						Add New Card
					</h2>
					<div
						role="radiogroup"
						aria-label="Card type"
						className="inline-flex rounded-lg bg-gray-200/70 dark:bg-slate-900 p-1"
					>
						{TYPES.map(([value, label]) => (
							<button
								key={value}
								type="button"
								role="radio"
								aria-checked={type === value}
								onClick={() => onTypeChange(value)}
								className={`px-3 py-1 text-sm font-medium rounded-md transition-colors duration-200 ${
									type === value
										? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 shadow-sm'
										: 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
								}`}
							>
								{label}
							</button>
						))}
					</div>
					<div className="ml-auto flex items-center gap-1">
						<PreviewToggle
							show={showPreview}
							onToggle={togglePreview}
						/>
						<button
							type="button"
							onClick={onClose}
							className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700"
							aria-label="Close"
						>
							<X className="h-5 w-5" />
						</button>
					</div>
				</div>

				{/* Fields and preview */}
				<div className="flex-1 overflow-y-auto">
					<div
						className={`p-6 grid gap-6 ${
							showPreview ? 'lg:grid-cols-2' : ''
						}`}
					>
						<div className="space-y-4 min-w-0">
							{isCloze ? (
								<ClozeFields
									text={clozeText}
									onTextChange={setClozeText}
									extra={clozeExtra}
									onExtraChange={setClozeExtra}
									textRef={clozeRef}
									rows={6}
									autoFocus
								/>
							) : (
								<>
									<div className="space-y-2">
										<label
											htmlFor="new-card-front"
											className="block text-sm font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide"
										>
											Front
										</label>
										<textarea
											id="new-card-front"
											ref={frontRef}
											placeholder="Front of card..."
											value={front}
											onChange={(e) =>
												setFront(e.target.value)
											}
											rows={4}
											autoFocus
											className={inputClasses}
										/>
									</div>
									<div className="space-y-2">
										<label
											htmlFor="new-card-back"
											className="block text-sm font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide"
										>
											Back
										</label>
										<textarea
											id="new-card-back"
											placeholder="Back of card..."
											value={back}
											onChange={(e) =>
												setBack(e.target.value)
											}
											rows={6}
											className={inputClasses}
										/>
									</div>
								</>
							)}
						</div>
						{showPreview && (
							<div className="min-w-0">
								{isCloze ? (
									<CardPreview
										clozeText={clozeText}
										clozeExtra={clozeExtra}
									/>
								) : (
									<CardPreview front={front} back={back} />
								)}
							</div>
						)}
					</div>
				</div>

				{/* Footer */}
				<div className="flex flex-wrap items-center gap-3 px-6 py-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/50">
					<button
						type="button"
						onClick={() => add()}
						disabled={!canAdd}
						className="px-6 py-3 bg-linear-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
					>
						Add Card
					</button>
					<button
						type="button"
						onClick={onClose}
						className="px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 font-semibold rounded-xl transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
					>
						{added ? 'Done' : 'Cancel'}
					</button>
					{added > 0 && (
						<span className="inline-flex items-center gap-1.5 text-sm text-teal-700 dark:text-teal-300">
							<Check className="h-4 w-4" />
							{added} added
						</span>
					)}
					<span className="hidden pointer-fine:inline ml-auto text-xs text-gray-400 dark:text-slate-500">
						Ctrl/⌘ + Enter adds and starts the next{' '}
						{isCloze ? 'note' : 'card'} · Esc to close
					</span>
				</div>
			</div>
		</div>
	);
}
