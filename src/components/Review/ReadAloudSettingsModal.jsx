import { useState, useEffect } from "react";
import { X, Volume2 } from "lucide-react";

// Voice and engine compatibility mapping
const VOICE_ENGINES = {
	Danielle: ["standard", "neural", "generative"],
	Gregory: ["neural"],
	Joanna: ["neural", "generative"],
	Kendra: ["standard", "neural"],
	Kimberly: ["standard", "neural"],
	Salli: ["standard", "neural", "generative"],
	Joey: ["standard", "neural"],
	Matthew: ["neural"],
	Ruth: ["neural", "generative"],
	Stephen: ["neural", "generative"],
};

const VOICE_LIST = Object.keys(VOICE_ENGINES).sort();

const ENGINE_LABELS = {
	standard: "Standard",
	neural: "Neural (Higher Quality)",
	generative: "Generative (Premium)",
};

const AUTO_READ_OPTIONS = [
	{ value: "off", label: "Off" },
	{ value: "both", label: "Both sides" },
	{ value: "front", label: "Front only" },
	{ value: "back", label: "Back only" },
	{ value: "longer", label: "Longer side only" },
];

export default function ReadAloudSettingsModal({
	isOpen,
	onClose,
	onSave,
	currentVoiceId = "Ruth",
	currentEngine = "generative",
	currentAutoRead = "off",
}) {
	const [selectedVoiceId, setSelectedVoiceId] = useState(currentVoiceId);
	const [selectedEngine, setSelectedEngine] = useState(currentEngine);
	const [selectedAutoRead, setSelectedAutoRead] = useState(currentAutoRead);

	// Update local state when props change
	useEffect(() => {
		setSelectedVoiceId(currentVoiceId);
		setSelectedEngine(currentEngine);
		setSelectedAutoRead(currentAutoRead);
	}, [currentVoiceId, currentEngine, currentAutoRead]);

	// Get available engines for selected voice
	const availableEngines = VOICE_ENGINES[selectedVoiceId] || ["neural"];

	// If current engine is not available for selected voice, reset to first available
	useEffect(() => {
		if (!availableEngines.includes(selectedEngine)) {
			setSelectedEngine(availableEngines[0]);
		}
	}, [selectedVoiceId, availableEngines]);

	const handleBackdropClick = (e) => {
		if (e.target === e.currentTarget) {
			onClose();
		}
	};

	const handleSave = () => {
		onSave(selectedVoiceId, selectedEngine, selectedAutoRead);
		onClose();
	};

	const handleCancel = () => {
		// Reset to original values
		setSelectedVoiceId(currentVoiceId);
		setSelectedEngine(currentEngine);
		setSelectedAutoRead(currentAutoRead);
		onClose();
	};

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
			onClick={handleBackdropClick}
		>
			<div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 w-full max-w-md overflow-hidden flex flex-col">
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
					<div className="flex items-center gap-3">
						<Volume2 className="h-6 w-6 text-teal-500" />
						<h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
							Text-to-Speech Settings
						</h2>
					</div>
					<button
						onClick={handleCancel}
						className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"
						aria-label="Close"
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				{/* Content */}
				<div className="p-6 space-y-6">
					{/* Voice Selection */}
					<div>
						<label className="mb-3 block text-sm font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wide">
							Voice
						</label>
						<select
							value={selectedVoiceId}
							onChange={(e) => setSelectedVoiceId(e.target.value)}
							className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200"
						>
							{VOICE_LIST.map((voiceId) => (
								<option key={voiceId} value={voiceId}>
									{voiceId}
								</option>
							))}
						</select>
						<p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
							Select the voice for text-to-speech
						</p>
					</div>

					{/* Engine Selection */}
					<div>
						<label className="mb-3 block text-sm font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wide">
							Engine
						</label>
						<select
							value={selectedEngine}
							onChange={(e) => setSelectedEngine(e.target.value)}
							className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200"
						>
							{availableEngines.map((engine) => (
								<option key={engine} value={engine}>
									{ENGINE_LABELS[engine]}
								</option>
							))}
						</select>
						<p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
							{selectedEngine === "generative" &&
								"Generative voices offer the highest quality but cost more."}
							{selectedEngine === "neural" &&
								"Neural engine provides high-quality, natural-sounding speech."}
							{selectedEngine === "standard" &&
								"Standard engine is cost-effective with good quality."}
						</p>
					</div>

					{/* Auto-read when side is shown */}
					<div>
						<label className="mb-3 block text-sm font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wide">
							Auto-read when side is shown
						</label>
						<select
							value={selectedAutoRead}
							onChange={(e) => setSelectedAutoRead(e.target.value)}
							className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200"
						>
							{AUTO_READ_OPTIONS.map((opt) => (
								<option key={opt.value} value={opt.value}>
									{opt.label}
								</option>
							))}
						</select>
						<p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
							Automatically read the selected side when it is displayed
						</p>
					</div>
				</div>

				{/* Footer */}
				<div className="p-6 border-t border-gray-200 dark:border-slate-700">
					<div className="flex gap-4">
						<button
							onClick={handleCancel}
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
