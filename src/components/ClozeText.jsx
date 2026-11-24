import { clozeParts } from '../services/cloze';

/**
 * A cloze card's side: on the front its deletion is a blank ([...] or
 * [hint]); on the back the answer is highlighted and the note's extra, if
 * any, follows. Inherits size and alignment from its container.
 */
export default function ClozeText({ text, ord, side, extra }) {
	const parts = clozeParts(text, ord, side);
	return (
		<>
			{parts.map((part, index) =>
				part.type === 'text' ? (
					<span key={index}>{part.text}</span>
				) : (
					<span
						key={index}
						className={
							part.type === 'blank'
								? 'rounded-md bg-teal-100 px-1.5 font-semibold text-teal-700 dark:bg-teal-900/40 dark:text-teal-300'
								: 'rounded-md bg-cyan-100 px-1 font-semibold text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200'
						}
					>
						{part.text}
					</span>
				)
			)}
			{side === 'back' && extra?.trim() && (
				<span className="mt-4 block border-t border-gray-200 pt-3 text-[0.8em] font-normal text-gray-600 dark:border-slate-700 dark:text-slate-400">
					{extra}
				</span>
			)}
		</>
	);
}
