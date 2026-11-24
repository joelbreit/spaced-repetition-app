import { useState, useEffect, useRef, useId } from 'react';
import {
	X,
	Settings,
	Minus,
	Plus,
	Play,
	Square,
	Loader2,
	RotateCcw,
} from 'lucide-react';
import { DEFAULT_REVIEW_SETTINGS } from '../../services/reviewSettings';
import { readAloudAPI } from '../../services/apiStorage';
import { useAuth } from '../../contexts/AuthContext';

// Voice and engine compatibility mapping
const VOICE_ENGINES = {
	Danielle: ['standard', 'neural', 'generative'],
	Gregory: ['neural'],
	Joanna: ['neural', 'generative'],
	Kendra: ['standard', 'neural'],
	Kimberly: ['standard', 'neural'],
	Salli: ['standard', 'neural', 'generative'],
	Joey: ['standard', 'neural'],
	Matthew: ['neural'],
	Ruth: ['neural', 'generative'],
	Stephen: ['neural', 'generative'],
};

const VOICE_LIST = Object.keys(VOICE_ENGINES).sort();

const ENGINE_OPTIONS = [
	{ value: 'standard', label: 'Standard' },
	{ value: 'neural', label: 'Neural' },
	{ value: 'generative', label: 'Generative' },
];

const ENGINE_HINTS = {
	standard: 'Lowest cost (~$4 per 1M characters), good quality.',
	neural: 'Natural-sounding speech (~$16 per 1M characters).',
	generative: 'Most lifelike voices (~$30 per 1M characters).',
};

const AUTO_READ_OPTIONS = [
	{ value: 'off', label: 'Off' },
	{ value: 'both', label: 'Both sides' },
	{ value: 'front', label: 'Front only' },
	{ value: 'back', label: 'Back only' },
	{ value: 'longer', label: 'Longer side only' },
];

const FLIP_SPEED_OPTIONS = [
	{ value: 'normal', label: 'Normal' },
	{ value: 'fast', label: 'Fast' },
	{ value: 'off', label: 'Off' },
];

const FLIP_HINTS = {
	normal: 'Cards flip with the standard animation.',
	fast: 'Cards flip in half the usual time.',
	off: 'Cards switch sides instantly.',
};

const SPEED_MIN = 0.5;
const SPEED_MAX = 4.0;
const SPEED_PRESETS = [0.75, 1, 1.25, 1.5, 2];

const PREVIEW_TEXT =
	'Hi there! This is how your flashcards will sound during review.';

const labelClass =
	'mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300';
const hintClass = 'mt-2 text-xs text-gray-500 dark:text-slate-400';
const selectClass =
	'w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200';
const iconButtonClass =
	'p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-teal-500';

const settingsEqual = (a, b) =>
	Object.keys({ ...a, ...b }).every((key) => a[key] === b[key]);

function Toggle({ id, checked, onChange, disabled = false, describedBy }) {
	return (
		<button
			id={id}
			type="button"
			role="switch"
			aria-checked={checked}
			aria-describedby={describedBy}
			onClick={() => onChange(!checked)}
			disabled={disabled}
			className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 disabled:cursor-not-allowed ${
				checked ? 'bg-teal-500' : 'bg-gray-200 dark:bg-slate-600'
			}`}
		>
			<span
				className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
					checked ? 'translate-x-6' : 'translate-x-1'
				}`}
			/>
		</button>
	);
}

// A labelled switch row: title and description on the left, switch on the right
function ToggleRow({ title, description, checked, onChange, disabled }) {
	const id = useId();
	return (
		<div
			className={`flex items-start justify-between gap-4 ${disabled ? 'opacity-50' : ''}`}
		>
			<div>
				<label
					htmlFor={id}
					className={`block text-sm font-medium text-gray-700 dark:text-slate-300 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
				>
					{title}
				</label>
				<p
					id={`${id}-hint`}
					className="mt-1 text-xs text-gray-500 dark:text-slate-400"
				>
					{description}
				</p>
			</div>
			<Toggle
				id={id}
				checked={checked}
				onChange={onChange}
				disabled={disabled}
				describedBy={`${id}-hint`}
			/>
		</div>
	);
}

function SegmentedControl({ label, options, value, onChange, columns }) {
	return (
		<div
			role="radiogroup"
			aria-label={label}
			className="grid gap-1 p-1 bg-gray-100 dark:bg-slate-900/50 rounded-xl"
			style={{
				gridTemplateColumns: `repeat(${columns ?? options.length}, minmax(0, 1fr))`,
			}}
		>
			{options.map((opt) => {
				const selected = value === opt.value;
				return (
					<button
						key={opt.value}
						type="button"
						role="radio"
						aria-checked={selected}
						disabled={opt.disabled}
						title={opt.title}
						onClick={() => onChange(opt.value)}
						className={`px-2 py-2 text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-40 disabled:cursor-not-allowed ${
							selected
								? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm'
								: 'text-gray-600 dark:text-slate-400 enabled:hover:text-gray-900 dark:enabled:hover:text-slate-200'
						}`}
					>
						{opt.label}
					</button>
				);
			})}
		</div>
	);
}

function Section({ title, children }) {
	return (
		<section className="space-y-5">
			<h3 className="text-xs font-semibold uppercase tracking-wide text-teal-600 dark:text-teal-400">
				{title}
			</h3>
			{children}
		</section>
	);
}

// Plays a short sample with the draft voice/engine/speed so the user can
// hear a change before saving it
function useVoicePreview(voiceId, engine, playbackSpeed, isOpen) {
	const audioRef = useRef(null);
	const cacheRef = useRef(new Map());
	const requestRef = useRef(0);
	const [status, setStatus] = useState('idle'); // idle | loading | playing
	const [error, setError] = useState(null);
	const { authToken, refreshToken } = useAuth();

	const stop = () => {
		requestRef.current += 1;
		audioRef.current?.pause();
		setStatus('idle');
	};

	// Keep the speed of a playing preview in sync with the stepper
	useEffect(() => {
		if (audioRef.current) audioRef.current.playbackRate = playbackSpeed;
	}, [playbackSpeed]);

	// Stop when the voice/engine changes or the modal closes
	useEffect(() => {
		stop();
		setError(null);
	}, [voiceId, engine, isOpen]);

	// Release the audio element and cached blobs on unmount
	useEffect(() => {
		const cache = cacheRef.current;
		return () => {
			audioRef.current?.pause();
			if (audioRef.current?.src)
				URL.revokeObjectURL(audioRef.current.src);
			cache.clear();
		};
	}, []);

	const play = async () => {
		const request = ++requestRef.current;
		setError(null);
		setStatus('loading');
		try {
			const key = `${voiceId}|${engine}`;
			let blob = cacheRef.current.get(key);
			if (!blob) {
				blob = await readAloudAPI(PREVIEW_TEXT, voiceId, engine, {
					authToken,
					refreshToken,
				});
				cacheRef.current.set(key, blob);
			}
			if (request !== requestRef.current) return;

			if (!audioRef.current) {
				audioRef.current = new Audio();
				audioRef.current.addEventListener('ended', () =>
					setStatus('idle')
				);
			}
			const audio = audioRef.current;
			if (audio.src) URL.revokeObjectURL(audio.src);
			audio.src = URL.createObjectURL(blob);
			audio.defaultPlaybackRate = playbackSpeed;
			audio.playbackRate = playbackSpeed;
			await audio.play();
			if (request === requestRef.current) setStatus('playing');
		} catch (err) {
			if (request !== requestRef.current) return;
			console.error('Voice preview failed:', err);
			setError(
				err.code === 'SIGN_IN_REQUIRED'
					? 'Sign in to preview voices.'
					: 'Could not play the preview. Please try again.'
			);
			setStatus('idle');
		}
	};

	return { status, error, play, stop };
}

export default function ReviewSettingsModal({
	isOpen,
	onClose,
	onSave,
	settings = DEFAULT_REVIEW_SETTINGS,
}) {
	const [draft, setDraft] = useState(settings);
	const update = (changes) => setDraft((prev) => ({ ...prev, ...changes }));
	const dialogRef = useRef(null);
	const ids = {
		title: useId(),
		voice: useId(),
		autoRead: useId(),
	};

	// Reset the draft whenever the modal opens or saved settings change
	useEffect(() => {
		setDraft(settings);
	}, [settings, isOpen]);

	// Move focus into the dialog when it opens
	useEffect(() => {
		if (isOpen) dialogRef.current?.focus();
	}, [isOpen]);

	const preview = useVoicePreview(
		draft.voiceId,
		draft.engine,
		draft.playbackSpeed,
		isOpen
	);

	const availableEngines = VOICE_ENGINES[draft.voiceId] || ['neural'];

	// Pre-load audio is only meaningful when auto-read is enabled. The saved
	// preference is kept while auto-read is off so it comes back when re-enabled.
	const prefetchDisabled = draft.autoRead === 'off';

	// What will actually be saved: pre-load can't be on without auto-read
	const normalized = prefetchDisabled
		? { ...draft, prefetchAudio: false }
		: draft;
	const hasChanges = !settingsEqual(normalized, settings);
	const isDefault = settingsEqual(normalized, DEFAULT_REVIEW_SETTINGS);

	const handleVoiceChange = (voiceId) => {
		const engines = VOICE_ENGINES[voiceId] || ['neural'];
		// Keep the current engine when the new voice supports it
		update({
			voiceId,
			engine: engines.includes(draft.engine) ? draft.engine : engines[0],
		});
	};

	const handleBackdropClick = (e) => {
		if (e.target === e.currentTarget) onClose();
	};

	const handleKeyDown = (e) => {
		if (e.key === 'Escape') {
			e.stopPropagation();
			onClose();
		}
	};

	const handleSave = () => {
		onSave(normalized);
		onClose();
	};

	const setPlaybackSpeed = (speed) => {
		const clamped = Math.max(SPEED_MIN, Math.min(SPEED_MAX, speed));
		update({ playbackSpeed: Math.round(clamped * 100) / 100 });
	};

	if (!isOpen) return null;

	const speedLabel = `${Number(draft.playbackSpeed.toFixed(2))}x`;

	return (
		<div
			className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
			onClick={handleBackdropClick}
		>
			<div
				ref={dialogRef}
				role="dialog"
				aria-modal="true"
				aria-labelledby={ids.title}
				tabIndex={-1}
				onKeyDown={handleKeyDown}
				className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col focus:outline-none"
			>
				{/* Header */}
				<div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-slate-700 shrink-0">
					<div className="flex items-center gap-3">
						<Settings className="h-6 w-6 text-teal-500" />
						<h2
							id={ids.title}
							className="text-2xl font-bold text-gray-900 dark:text-slate-100"
						>
							Review Settings
						</h2>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"
						aria-label="Close"
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				{/* Content */}
				<div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
					<Section title="Voice">
						{/* Voice + preview */}
						<div>
							<label htmlFor={ids.voice} className={labelClass}>
								Voice
							</label>
							<div className="flex gap-2">
								<select
									id={ids.voice}
									value={draft.voiceId}
									onChange={(e) =>
										handleVoiceChange(e.target.value)
									}
									className={selectClass}
								>
									{VOICE_LIST.map((voiceId) => (
										<option key={voiceId} value={voiceId}>
											{voiceId}
										</option>
									))}
								</select>
								<button
									type="button"
									onClick={
										preview.status === 'idle'
											? preview.play
											: preview.stop
									}
									className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-900/30 hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500"
									aria-label={
										preview.status === 'idle'
											? 'Preview voice'
											: 'Stop preview'
									}
								>
									{preview.status === 'loading' ? (
										<Loader2 className="h-4 w-4 animate-spin" />
									) : preview.status === 'playing' ? (
										<Square className="h-4 w-4" />
									) : (
										<Play className="h-4 w-4" />
									)}
									{preview.status === 'playing'
										? 'Stop'
										: 'Preview'}
								</button>
							</div>
							{preview.error && (
								<p
									role="alert"
									className="mt-2 text-xs text-red-600 dark:text-red-400"
								>
									{preview.error}
								</p>
							)}
						</div>

						{/* Engine */}
						<div>
							<span className={labelClass}>Engine</span>
							<SegmentedControl
								label="Speech engine"
								value={draft.engine}
								onChange={(engine) => update({ engine })}
								options={ENGINE_OPTIONS.map((opt) => {
									const disabled = !availableEngines.includes(
										opt.value
									);
									return {
										...opt,
										disabled,
										title: disabled
											? `Not available for ${draft.voiceId}`
											: undefined,
									};
								})}
							/>
							<p className={hintClass}>
								{ENGINE_HINTS[draft.engine]}
							</p>
						</div>

						{/* Playback Speed */}
						<div>
							<span className={labelClass}>Playback speed</span>
							<div className="flex flex-wrap items-center gap-x-2 gap-y-3">
								<button
									type="button"
									onClick={() =>
										setPlaybackSpeed(
											draft.playbackSpeed - 0.1
										)
									}
									disabled={draft.playbackSpeed <= SPEED_MIN}
									className={iconButtonClass}
									aria-label="Decrease speed"
								>
									<Minus className="h-4 w-4" />
								</button>
								<span
									aria-live="polite"
									className="w-14 text-center text-lg font-semibold tabular-nums text-gray-900 dark:text-slate-100"
								>
									{speedLabel}
								</span>
								<button
									type="button"
									onClick={() =>
										setPlaybackSpeed(
											draft.playbackSpeed + 0.1
										)
									}
									disabled={draft.playbackSpeed >= SPEED_MAX}
									className={iconButtonClass}
									aria-label="Increase speed"
								>
									<Plus className="h-4 w-4" />
								</button>
								<div className="flex gap-1 sm:ml-auto">
									{SPEED_PRESETS.map((speed) => {
										const selected =
											Math.abs(
												draft.playbackSpeed - speed
											) < 0.001;
										return (
											<button
												key={speed}
												type="button"
												onClick={() =>
													setPlaybackSpeed(speed)
												}
												aria-pressed={selected}
												className={`px-2 py-1 text-xs font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 ${
													selected
														? 'bg-teal-500 text-white'
														: 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600'
												}`}
											>
												{speed}x
											</button>
										);
									})}
								</div>
							</div>
						</div>
					</Section>

					<Section title="Audio during review">
						{/* Auto-read */}
						<div>
							<label
								htmlFor={ids.autoRead}
								className={labelClass}
							>
								Auto-read when a side is shown
							</label>
							<select
								id={ids.autoRead}
								value={draft.autoRead}
								onChange={(e) =>
									update({ autoRead: e.target.value })
								}
								className={selectClass}
							>
								{AUTO_READ_OPTIONS.map((opt) => (
									<option key={opt.value} value={opt.value}>
										{opt.label}
									</option>
								))}
							</select>
						</div>

						<ToggleRow
							title="Pre-load upcoming audio"
							description={
								prefetchDisabled
									? 'Turn on auto-read to pre-load audio for the next 2 cards.'
									: 'Fetches audio for the next 2 cards ahead of time to avoid delays.'
							}
							checked={draft.prefetchAudio && !prefetchDisabled}
							onChange={(prefetchAudio) =>
								update({ prefetchAudio })
							}
							disabled={prefetchDisabled}
						/>

						<ToggleRow
							title="Finish audio before next card"
							description={
								draft.waitForAudio
									? 'After grading, audio plays to the end before moving on. Press Space to skip.'
									: 'Grading moves on immediately, stopping any audio.'
							}
							checked={draft.waitForAudio}
							onChange={(waitForAudio) =>
								update({ waitForAudio })
							}
						/>
					</Section>

					<Section title="Animation">
						<div>
							<span className={labelClass}>Card flip</span>
							<SegmentedControl
								label="Card flip animation"
								options={FLIP_SPEED_OPTIONS}
								value={draft.flipSpeed}
								onChange={(flipSpeed) => update({ flipSpeed })}
							/>
							<p className={hintClass}>
								{FLIP_HINTS[draft.flipSpeed]}
							</p>
						</div>
					</Section>
				</div>

				{/* Footer */}
				<div className="px-6 py-4 border-t border-gray-200 dark:border-slate-700 shrink-0 flex items-center gap-3">
					<button
						type="button"
						onClick={() => setDraft({ ...DEFAULT_REVIEW_SETTINGS })}
						disabled={isDefault}
						className="inline-flex items-center gap-1.5 px-2 py-2 text-sm font-medium text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-teal-500"
						title="Reset all settings to their defaults"
					>
						<RotateCcw className="h-4 w-4" />
						Reset
					</button>
					<div className="ml-auto flex gap-3">
						<button
							type="button"
							onClick={onClose}
							className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 font-medium rounded-xl transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-slate-500"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={handleSave}
							disabled={!hasChanges}
							className="px-6 py-2.5 bg-linear-to-r from-teal-500 to-cyan-500 enabled:hover:from-teal-600 enabled:hover:to-cyan-600 text-white font-medium rounded-xl shadow-lg enabled:hover:shadow-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
						>
							Save
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
