import { useEffect, useState } from 'react';
import CardText from './CardText';
import { clozeOrds } from '../services/cloze';
import { hasBlockMarkdown } from '../services/markdown';

/** value, updated `delay` ms after it stops changing */
function useDebounced(value, delay) {
	const [debounced, setDebounced] = useState(value);
	useEffect(() => {
		const timer = setTimeout(() => setDebounced(value), delay);
		return () => clearTimeout(timer);
	}, [value, delay]);
	return debounced;
}

function Face({ label, text, cloze, empty }) {
	const alignText = cloze?.text ?? text ?? '';
	return (
		<div className="flex min-w-0 flex-col rounded-xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800/80">
			<div className="border-b border-gray-200/70 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:border-slate-700/70 dark:text-slate-400">
				{label}
			</div>
			<div
				className={`max-h-80 overflow-y-auto break-words px-4 py-4 text-base font-medium text-gray-900 dark:text-white ${
					hasBlockMarkdown(alignText) ? 'text-left' : 'text-center'
				}`}
			>
				{text?.trim() || cloze ? (
					<CardText text={text} cloze={cloze} />
				) : (
					<span className="text-sm font-normal text-gray-400 dark:text-slate-500">
						{empty}
					</span>
				)}
			</div>
		</div>
	);
}

/**
 * Live preview of a card as review shows it, front and back, rendered from
 * Markdown. For a cloze note pass `clozeText` (and `clozeExtra`): it previews
 * one of its cards, chosen with a c1/c2/... switch.
 * @param {number} [ord] - the cloze card to show first
 */
export default function CardPreview({
	front = '',
	back = '',
	clozeText,
	clozeExtra = '',
	ord,
}) {
	const isCloze = clozeText !== undefined;
	// Debounced, so diagrams don't redraw on every keystroke
	const values = {
		front: useDebounced(front, 250),
		back: useDebounced(back, 250),
		clozeText: useDebounced(clozeText ?? '', 250),
		clozeExtra: useDebounced(clozeExtra, 250),
	};
	const ords = isCloze ? clozeOrds(values.clozeText) : [];
	const [picked, setPicked] = useState(ord);
	const shownOrd = ords.includes(picked) ? picked : ords[0];

	const cloze = (side) =>
		shownOrd
			? {
					text: values.clozeText,
					ord: shownOrd,
					side,
					extra: values.clozeExtra,
				}
			: null;

	return (
		<div className="space-y-3">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<span className="text-sm font-semibold uppercase tracking-wide text-gray-700 dark:text-slate-300">
					Preview
				</span>
				{ords.length > 1 && (
					<div
						role="radiogroup"
						aria-label="Cloze card to preview"
						className="inline-flex flex-wrap gap-1"
					>
						{ords.map((n) => (
							<button
								key={n}
								type="button"
								role="radio"
								aria-checked={n === shownOrd}
								onClick={() => setPicked(n)}
								className={`rounded-md px-2 py-0.5 text-xs font-semibold transition-colors duration-200 ${
									n === shownOrd
										? 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300'
										: 'text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-700'
								}`}
							>
								c{n}
							</button>
						))}
					</div>
				)}
			</div>
			{isCloze && !shownOrd ? (
				<Face
					label="Front"
					text=""
					empty="Add a deletion to preview its card"
				/>
			) : (
				<>
					<Face
						label="Front"
						text={values.front}
						cloze={cloze('front')}
						empty="The front shows here"
					/>
					<Face
						label="Back"
						text={values.back}
						cloze={cloze('back')}
						empty="The back shows here"
					/>
				</>
			)}
			<p className="text-xs text-gray-400 dark:text-slate-500">
				Markdown: **bold**, *italic*, `code`, lists, tables, ```lang
				code blocks and ```mermaid diagrams
			</p>
		</div>
	);
}
