import { useRef, useState } from 'react';
import {
	AlertTriangle,
	Bot,
	Check,
	ClipboardCopy,
	FileUp,
	Loader2,
	X,
	XCircle,
} from 'lucide-react';
import { useAppData } from '../contexts/AppDataContext';
import { applyPack, checkPack, linkAssets, readPack } from '../services/pack';
import { prepareNamedImage, storeImage } from '../services/media';

const AGENT_INSTRUCTIONS_URL = '/agents.md';
const MAX_LISTED = 50;

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

function countsLine(label, { created, updated, unchanged }) {
	const parts = [];
	if (created) parts.push(`${created} new`);
	if (updated) parts.push(`${updated} updated`);
	if (unchanged) parts.push(`${unchanged} unchanged`);
	return parts.length ? `${label}: ${parts.join(', ')}` : null;
}

function ProblemList({ items, tone }) {
	if (!items.length) return null;
	const Icon = tone === 'error' ? XCircle : AlertTriangle;
	const color =
		tone === 'error'
			? 'text-red-700 dark:text-red-300'
			: 'text-amber-700 dark:text-amber-300';
	return (
		<ul className={`space-y-1 text-sm ${color}`}>
			{items.slice(0, MAX_LISTED).map((item, i) => (
				<li key={i} className="flex gap-2">
					<Icon className="mt-0.5 h-4 w-4 shrink-0" />
					<span className="min-w-0 break-words">
						{item.path && (
							<code className="font-mono text-xs">
								{item.path}
							</code>
						)}
						{item.path && ': '}
						{item.message}
					</span>
				</li>
			))}
			{items.length > MAX_LISTED && (
				<li className="pl-6">…and {items.length - MAX_LISTED} more</li>
			)}
		</ul>
	);
}

/**
 * Import a content pack (JSON or .zip; see public/agents.md) into the folder
 * being viewed: check it, preview what it will create or update, then apply
 * it and store its images.
 */
export default function ImportPackModal({ parentFolderId = null, onClose }) {
	const { appData, setAppData } = useAppData();
	const [step, setStep] = useState('input'); // input | checking | preview | importing | done
	const [pasted, setPasted] = useState('');
	const [dragging, setDragging] = useState(false);
	const [result, setResult] = useState(null);
	const [copied, setCopied] = useState(null);
	const fileInputRef = useRef(null);

	const check = async (source) => {
		setStep('checking');
		try {
			const { pack, files } = await readPack(source);
			const checked = checkPack(pack, files);
			const errors = [...checked.errors];
			// Images are prepared now, so their final names (and any
			// problems) show in the preview
			const prepared = new Map();
			for (const [name, blob] of checked.assets) {
				try {
					prepared.set(name, await prepareNamedImage(blob));
				} catch (error) {
					errors.push({
						path: `assets["${name}"]`,
						message: error.message,
					});
				}
			}
			let linked = null;
			let preview = null;
			if (!errors.length) {
				linked = linkAssets(
					checked.pack,
					new Map([...prepared].map(([asset, p]) => [asset, p.name]))
				);
				preview = applyPack(appData, linked, { parentFolderId });
			}
			setResult({
				errors,
				warnings: [...checked.warnings, ...(preview?.notices || [])],
				linked,
				prepared,
				summary: preview?.summary,
			});
		} catch (error) {
			setResult({
				errors: [{ path: '', message: error.message }],
				warnings: [],
			});
		}
		setStep('preview');
	};

	const runImport = async () => {
		setStep('importing');
		const uploads = [];
		for (const prepared of result.prepared.values()) {
			const { uploaded } = await storeImage(prepared);
			uploads.push(uploaded);
		}
		let summary = result.summary;
		setAppData((prev) => {
			const applied = applyPack(prev, result.linked, { parentFolderId });
			summary = applied.summary;
			return applied.data;
		});
		const settled = await Promise.allSettled(uploads);
		const failed = settled.filter((s) => s.status === 'rejected').length;
		setResult((r) => ({ ...r, summary, failedUploads: failed }));
		setStep('done');
	};

	const copyText = async (text, what) => {
		try {
			await navigator.clipboard.writeText(text);
			setCopied(what);
			setTimeout(() => setCopied(null), 2000);
		} catch {
			setCopied('failed');
		}
	};

	const copyInstructions = async () => {
		try {
			const response = await fetch(AGENT_INSTRUCTIONS_URL);
			if (!response.ok) throw new Error();
			const text = await response.text();
			await copyText(
				`${text}\n\n(Instructions from ${location.origin}${AGENT_INSTRUCTIONS_URL})`,
				'instructions'
			);
		} catch {
			setCopied('failed');
		}
	};

	// For pasting back to the agent that wrote the pack
	const problemsText = () =>
		[
			...(result?.errors || []).map(
				(e) => `Error ${e.path}: ${e.message}`
			),
			...(result?.warnings || []).map(
				(w) => `Warning ${w.path}: ${w.message}`
			),
		].join('\n');

	const summaryLines = (s) =>
		s
			? [
					countsLine('Folders', s.folders),
					countsLine('Decks', s.decks),
					countsLine('Cards', s.cards),
					s.clozeCardsDeleted
						? `${plural(s.clozeCardsDeleted, 'cloze card')} deleted (its number left the text), with review history`
						: null,
					result?.prepared?.size
						? plural(result.prepared.size, 'image')
						: null,
				].filter(Boolean)
			: [];

	const busy = step === 'checking' || step === 'importing';

	return (
		<div
			className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
			onClick={(e) => e.target === e.currentTarget && !busy && onClose()}
			onKeyDown={(e) => e.key === 'Escape' && !busy && onClose()}
		>
			<div
				role="dialog"
				aria-modal="true"
				aria-labelledby="import-pack-title"
				className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-scale-in"
			>
				<div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/50">
					<h2
						id="import-pack-title"
						className="text-xl font-bold text-gray-900 dark:text-slate-100"
					>
						Import Pack
					</h2>
					<button
						type="button"
						onClick={onClose}
						disabled={busy}
						className="ml-auto p-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 disabled:opacity-50"
						aria-label="Close"
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				<div className="flex-1 overflow-y-auto p-6 space-y-5">
					{(step === 'input' || step === 'checking') && (
						<>
							<p className="text-sm text-gray-600 dark:text-slate-400">
								A pack is a JSON file (or a .zip with the JSON
								and its images) of folders, decks and cards,
								including cloze cards and images. Ask an AI
								agent to write one: give it the instructions
								below.
							</p>
							<div className="flex flex-wrap items-center gap-2">
								<button
									type="button"
									onClick={copyInstructions}
									className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-900/30 hover:bg-teal-100 dark:hover:bg-teal-900/50 rounded-lg transition-colors duration-200"
								>
									{copied === 'instructions' ? (
										<Check className="h-4 w-4" />
									) : (
										<Bot className="h-4 w-4" />
									)}
									{copied === 'instructions'
										? 'Copied'
										: 'Copy instructions for agents'}
								</button>
								<a
									href={AGENT_INSTRUCTIONS_URL}
									target="_blank"
									rel="noopener noreferrer"
									className="text-sm text-teal-700 dark:text-teal-300 underline underline-offset-2"
								>
									{location.host}
									{AGENT_INSTRUCTIONS_URL}
								</a>
								{copied === 'failed' && (
									<span className="text-sm text-orange-600 dark:text-orange-400">
										Couldn't copy; open the link instead
									</span>
								)}
							</div>

							<button
								type="button"
								onClick={() => fileInputRef.current?.click()}
								onDragOver={(e) => {
									e.preventDefault();
									setDragging(true);
								}}
								onDragLeave={() => setDragging(false)}
								onDrop={(e) => {
									e.preventDefault();
									setDragging(false);
									const file = e.dataTransfer.files?.[0];
									if (file) check(file);
								}}
								disabled={busy}
								className={`w-full flex flex-col items-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 transition-colors duration-200 ${
									dragging
										? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
										: 'border-gray-200 dark:border-slate-700 hover:border-teal-400 hover:bg-gray-50 dark:hover:bg-slate-700/40'
								}`}
							>
								{step === 'checking' ? (
									<Loader2 className="h-8 w-8 animate-spin text-teal-500" />
								) : (
									<FileUp className="h-8 w-8 text-gray-400 dark:text-slate-500" />
								)}
								<span className="font-medium text-gray-700 dark:text-slate-200">
									{step === 'checking'
										? 'Checking pack…'
										: 'Choose or drop a .json or .zip pack'}
								</span>
							</button>
							<input
								ref={fileInputRef}
								type="file"
								accept=".json,.zip,application/json,application/zip"
								className="hidden"
								onChange={(e) => {
									const file = e.target.files?.[0];
									e.target.value = '';
									if (file) check(file);
								}}
							/>

							<div className="space-y-2">
								<label
									htmlFor="pack-json"
									className="block text-sm font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide"
								>
									Or paste the JSON
								</label>
								<textarea
									id="pack-json"
									value={pasted}
									onChange={(e) => setPasted(e.target.value)}
									rows={6}
									spellCheck={false}
									placeholder='{ "format": "flashcards-pack", "version": 1, ... }'
									className="w-full px-4 py-3 font-mono text-sm bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-y"
								/>
								<button
									type="button"
									onClick={() => check(pasted)}
									disabled={!pasted.trim() || busy}
									className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 font-semibold rounded-xl transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									Check pasted pack
								</button>
							</div>
						</>
					)}

					{(step === 'preview' ||
						step === 'importing' ||
						step === 'done') &&
						result && (
							<div className="space-y-4">
								{step === 'done' ? (
									<p className="flex items-center gap-2 font-semibold text-teal-700 dark:text-teal-300">
										<Check className="h-5 w-5" />
										Imported
									</p>
								) : result.errors.length ? (
									<p className="font-semibold text-red-700 dark:text-red-300">
										This pack can't be imported until{' '}
										{result.errors.length === 1
											? 'this problem is'
											: `these ${result.errors.length} problems are`}{' '}
										fixed:
									</p>
								) : (
									<p className="font-semibold text-gray-900 dark:text-slate-100">
										Ready to import:
									</p>
								)}
								{result.summary && (
									<ul className="list-disc pl-6 text-gray-700 dark:text-slate-300">
										{summaryLines(result.summary).map(
											(line) => (
												<li key={line}>{line}</li>
											)
										)}
									</ul>
								)}
								{step === 'done' &&
									result.failedUploads > 0 && (
										<p className="text-sm text-orange-600 dark:text-orange-400">
											{plural(
												result.failedUploads,
												'image'
											)}{' '}
											couldn't be uploaded yet; they're
											kept on this device and uploaded
											next time.
										</p>
									)}
								<ProblemList
									items={result.errors}
									tone="error"
								/>
								<ProblemList
									items={result.warnings}
									tone="warning"
								/>
								{(result.errors.length > 0 ||
									result.warnings.length > 0) && (
									<button
										type="button"
										onClick={() =>
											copyText(problemsText(), 'problems')
										}
										className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors duration-200"
									>
										{copied === 'problems' ? (
											<Check className="h-4 w-4" />
										) : (
											<ClipboardCopy className="h-4 w-4" />
										)}
										{copied === 'problems'
											? 'Copied'
											: 'Copy problems for the agent'}
									</button>
								)}
							</div>
						)}
				</div>

				<div className="flex flex-wrap items-center gap-3 px-6 py-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/50">
					{step === 'preview' && !result?.errors.length && (
						<button
							type="button"
							onClick={runImport}
							className="px-6 py-3 bg-linear-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
						>
							Import
						</button>
					)}
					{step === 'importing' && (
						<span className="inline-flex items-center gap-2 text-sm text-teal-700 dark:text-teal-300">
							<Loader2 className="h-4 w-4 animate-spin" />
							Importing…
						</span>
					)}
					{step === 'preview' && (
						<button
							type="button"
							onClick={() => {
								setResult(null);
								setStep('input');
							}}
							className="px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 font-semibold rounded-xl transition-colors duration-200"
						>
							Back
						</button>
					)}
					<button
						type="button"
						onClick={onClose}
						disabled={busy}
						className="ml-auto px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 font-semibold rounded-xl transition-colors duration-200 disabled:opacity-50"
					>
						{step === 'done' ? 'Close' : 'Cancel'}
					</button>
				</div>
			</div>
		</div>
	);
}
