import { useState, useEffect } from 'react';
import { X, Settings, Minus, Plus } from 'lucide-react';
import { DEFAULT_REVIEW_SETTINGS } from '../../services/reviewSettings';

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

const ENGINE_LABELS = {
	standard: 'Standard',
	neural: 'Neural (Higher Quality)',
	generative: 'Generative (Premium)',
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

const labelClass =
	'mb-3 block text-sm font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wide';
const hintClass = 'mt-2 text-xs text-gray-500 dark:text-slate-400';
const selectClass =
	'w-full px-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200';
const boxClass =
	'flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl';

function Toggle({ checked, onChange, disabled = false, label }) {
	return (
		<button
			type="button"
			role="switch"
			aria-checked={checked}
			aria-label={label}
			onClick={() => onChange(!checked)}
			disabled={disabled}
			className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed ${
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

function SectionHeading({ children }) {
	return (
		<h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
			{children}
		</h3>
	);
}

export default function ReviewSettingsModal({
	isOpen,
	onClose,
	onSave,
	settings = DEFAULT_REVIEW_SETTINGS,
}) {
	const [draft, setDraft] = useState(settings);
	const update = (changes) => setDraft((prev) => ({ ...prev, ...changes }));

	// Reset the draft whenever the modal opens or saved settings change
	useEffect(() => {
		setDraft(settings);
	}, [settings, isOpen]);

	// Pre-load audio is only meaningful when auto-read is enabled
	const prefetchDisabled = draft.autoRead === 'off';

	// Keep pre-load coupled to auto-read: force it off when auto-read is off
	useEffect(() => {
		if (draft.autoRead === 'off' && draft.prefetchAudio) {
			update({ prefetchAudio: false });
		}
	}, [draft.autoRead, draft.prefetchAudio]);

	// Get available engines for selected voice
	const availableEngines = VOICE_ENGINES[draft.voiceId] || ['neural'];

	// If current engine is not available for selected voice, reset to first available
	useEffect(() => {
		const engines = VOICE_ENGINES[draft.voiceId] || ['neural'];
		if (!engines.includes(draft.engine)) {
			update({ engine: engines[0] });
		}
	}, [draft.voiceId, draft.engine]);

	const handleBackdropClick = (e) => {
		if (e.target === e.currentTarget) {
			onClose();
		}
	};

	const handleSave = () => {
		onSave(draft);
		onClose();
	};

	const adjustPlaybackSpeed = (delta) => {
		const newSpeed = Math.max(
			0.5,
			Math.min(4.0, draft.playbackSpeed + delta)
		);
		update({ playbackSpeed: Math.round(newSpeed * 10) / 10 });
	};

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
			onClick={handleBackdropClick}
		>
			<div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700 shrink-0">
					<div className="flex items-center gap-3">
						<Settings className="h-6 w-6 text-teal-500" />
						<h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
							Settings
						</h2>
					</div>
					<button
						onClick={onClose}
						className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"
						aria-label="Close"
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				{/* Content */}
				<div className="flex-1 overflow-y-auto p-6 space-y-6">
					<SectionHeading>Text-to-Speech</SectionHeading>

					{/* Voice Selection */}
					<div>
						<label className={labelClass}>Voice</label>
						<select
							value={draft.voiceId}
							onChange={(e) =>
								update({ voiceId: e.target.value })
							}
							className={selectClass}
						>
							{VOICE_LIST.map((voiceId) => (
								<option key={voiceId} value={voiceId}>
									{voiceId}
								</option>
							))}
						</select>
						<p className={hintClass}>
							Select the voice for text-to-speech
						</p>
					</div>

					{/* Engine Selection */}
					<div>
						<label className={labelClass}>Engine</label>
						<select
							value={draft.engine}
							onChange={(e) => update({ engine: e.target.value })}
							className={selectClass}
						>
							{availableEngines.map((engine) => (
								<option key={engine} value={engine}>
									{ENGINE_LABELS[engine]}
								</option>
							))}
						</select>
						<p className={hintClass}>
							{draft.engine === 'generative' &&
								'Generative voices offer the highest quality but cost more.'}
							{draft.engine === 'neural' &&
								'Neural engine provides high-quality, natural-sounding speech.'}
							{draft.engine === 'standard' &&
								'Standard engine is cost-effective with good quality.'}
						</p>
					</div>

					{/* Playback Speed */}
					<div>
						<label className={labelClass}>Playback Speed</label>
						<div className={boxClass}>
							<button
								onClick={() => adjustPlaybackSpeed(-0.1)}
								disabled={draft.playbackSpeed <= 0.5}
								className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
								title="Decrease speed"
							>
								<Minus className="h-5 w-5" />
							</button>
							<span className="text-xl font-semibold text-gray-900 dark:text-slate-100 min-w-16 text-center">
								{draft.playbackSpeed.toFixed(1)}x
							</span>
							<button
								onClick={() => adjustPlaybackSpeed(0.1)}
								disabled={draft.playbackSpeed >= 4.0}
								className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
								title="Increase speed"
							>
								<Plus className="h-5 w-5" />
							</button>
						</div>
						<p className={hintClass}>
							Adjust the playback speed (0.5x - 4.0x)
						</p>
					</div>

					{/* Auto-read when side is shown */}
					<div>
						<label className={labelClass}>
							Auto-read when side is shown
						</label>
						<select
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
						<p className={hintClass}>
							Automatically read the selected side when it is
							displayed
						</p>
					</div>

					{/* Pre-load Audio */}
					<div className={prefetchDisabled ? 'opacity-50' : ''}>
						<label className={labelClass}>Pre-load Audio</label>
						<div className={boxClass}>
							<span className="text-sm text-gray-700 dark:text-slate-300">
								Pre-load next 2 cards
							</span>
							<Toggle
								label="Pre-load next 2 cards"
								checked={draft.prefetchAudio}
								onChange={(prefetchAudio) =>
									update({ prefetchAudio })
								}
								disabled={prefetchDisabled}
							/>
						</div>
						<p className={hintClass}>
							{prefetchDisabled
								? 'Enable auto-read to pre-load audio for upcoming cards'
								: 'Pre-loads audio for the next 2 cards to reduce playback delays'}
						</p>
					</div>

					{/* Finish audio before advancing */}
					<div>
						<label className={labelClass}>
							Finish audio before next card
						</label>
						<div className={boxClass}>
							<span className="text-sm text-gray-700 dark:text-slate-300">
								Let audio finish after grading
							</span>
							<Toggle
								label="Let audio finish after grading"
								checked={draft.waitForAudio}
								onChange={(waitForAudio) =>
									update({ waitForAudio })
								}
							/>
						</div>
						<p className={hintClass}>
							{draft.waitForAudio
								? 'Grading while audio plays waits for it to finish before moving on. Pause or press Space to move on right away.'
								: 'Grading moves on to the next card immediately, stopping any audio'}
						</p>
					</div>

					<div className="border-t border-gray-200 dark:border-slate-700 pt-6">
						<SectionHeading>Animation</SectionHeading>
					</div>

					{/* Card flip animation */}
					<div>
						<label className={labelClass}>Card Flip</label>
						<div
							role="radiogroup"
							aria-label="Card flip animation"
							className="grid grid-cols-3 gap-1 p-1 bg-gray-100 dark:bg-slate-900/50 rounded-xl"
						>
							{FLIP_SPEED_OPTIONS.map((opt) => {
								const selected = draft.flipSpeed === opt.value;
								return (
									<button
										key={opt.value}
										type="button"
										role="radio"
										aria-checked={selected}
										onClick={() =>
											update({ flipSpeed: opt.value })
										}
										className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 ${
											selected
												? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm'
												: 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
										}`}
									>
										{opt.label}
									</button>
								);
							})}
						</div>
						<p className={hintClass}>
							{draft.flipSpeed === 'off'
								? 'Cards switch sides instantly'
								: draft.flipSpeed === 'fast'
									? 'Cards flip in half the usual time'
									: 'Cards flip with the standard animation'}
						</p>
					</div>
				</div>

				{/* Footer */}
				<div className="p-6 border-t border-gray-200 dark:border-slate-700 shrink-0">
					<div className="flex gap-4">
						<button
							onClick={onClose}
							className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 font-medium rounded-xl transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
						>
							Cancel
						</button>
						<button
							onClick={handleSave}
							className="flex-1 px-6 py-3 bg-linear-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
						>
							Save
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
