import { useRef } from 'react';
import { Brackets } from 'lucide-react';
import { clozeOrds, wrapCloze } from '../services/cloze';

const inputClasses =
	'w-full px-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200';

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

/**
 * Text and extra fields for a cloze note. "Make cloze" (or Ctrl/Cmd+Shift+C)
 * wraps the selected text in the next {{cN::...}}; Alt as well reuses the
 * last number, so several deletions can share one card.
 * @param {number[]} [savedOrds] - when editing, the note's current numbers,
 *   to warn before a card is removed
 */
export default function ClozeFields({
	text,
	onTextChange,
	extra,
	onExtraChange,
	onKeyDown,
	textRef,
	savedOrds,
	autoFocus = false,
	rows = 4,
}) {
	const ownRef = useRef(null);
	const ref = textRef || ownRef;
	const ords = clozeOrds(text);
	const removed = (savedOrds || []).filter((ord) => !ords.includes(ord));

	const makeCloze = (sameNumber = false) => {
		const el = ref.current;
		if (!el) return;
		const last = ords[ords.length - 1];
		const result = wrapCloze(
			text,
			el.selectionStart,
			el.selectionEnd,
			sameNumber && last ? last : undefined
		);
		onTextChange(result.text);
		requestAnimationFrame(() => {
			el.focus();
			el.setSelectionRange(result.cursor, result.cursor);
		});
	};

	const handleKeyDown = (e) => {
		// e.code is the physical key (Alt changes e.key on a Mac); some
		// synthetic events only carry e.key
		const isC = e.code === 'KeyC' || e.key?.toLowerCase() === 'c';
		if ((e.ctrlKey || e.metaKey) && e.shiftKey && isC) {
			e.preventDefault();
			makeCloze(e.altKey);
			return;
		}
		onKeyDown?.(e);
	};

	return (
		<div className="space-y-3">
			<textarea
				ref={ref}
				placeholder="Text with deletions, e.g. The {{c1::mitochondria}} is the powerhouse of the cell"
				value={text}
				onChange={(e) => onTextChange(e.target.value)}
				onKeyDown={handleKeyDown}
				rows={rows}
				autoFocus={autoFocus}
				className={`${inputClasses} resize-y`}
			/>
			<div className="flex flex-wrap items-center gap-3">
				<button
					type="button"
					// Keep the textarea's selection when the button is pressed
					onMouseDown={(e) => e.preventDefault()}
					onClick={() => makeCloze()}
					className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-900/30 hover:bg-teal-100 dark:hover:bg-teal-900/50 rounded-lg transition-colors duration-200"
				>
					<Brackets className="h-4 w-4" />
					Make cloze
				</button>
				<span className="hidden pointer-fine:inline text-xs text-gray-400 dark:text-slate-500">
					Ctrl/⌘ + Shift + C · add Alt to reuse the last number
				</span>
				<span
					className={`ml-auto text-sm ${
						ords.length
							? 'text-gray-600 dark:text-slate-400'
							: 'text-orange-600 dark:text-orange-400'
					}`}
				>
					{ords.length
						? `Makes ${plural(ords.length, 'card')}`
						: 'Select text and make a cloze to add a deletion'}
				</span>
			</div>
			{removed.length > 0 && (
				<p className="text-sm text-orange-600 dark:text-orange-400">
					Saving deletes the card for{' '}
					{removed.map((ord) => `c${ord}`).join(', ')}, with its
					review history.
				</p>
			)}
			<input
				type="text"
				placeholder="Extra (optional): shown on the back"
				value={extra}
				onChange={(e) => onExtraChange(e.target.value)}
				onKeyDown={onKeyDown}
				className={inputClasses}
			/>
		</div>
	);
}
