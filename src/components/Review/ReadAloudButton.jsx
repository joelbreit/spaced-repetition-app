import {
	Volume2,
	ChevronDown,
	Plus,
	Minus,
	Loader2,
	Pause,
} from 'lucide-react';
import {
	useState,
	useEffect,
	useRef,
	useImperativeHandle,
	forwardRef,
	useCallback,
} from 'react';
import { readAloudAPI } from '../../services/apiStorage';

const ReadAloudButton = forwardRef(function ReadAloudButton(
	{ text, playbackSpeed, onSpeedChange, voiceId = null, engine = null },
	ref
) {
	const [showSpeedDropdown, setShowSpeedDropdown] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [isPlaying, setIsPlaying] = useState(false);
	const dropdownRef = useRef(null);
	const audioPlayerRef = useRef(null);
	const currentAudioTextRef = useRef(null);

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(event.target)
			) {
				setShowSpeedDropdown(false);
			}
		};

		if (showSpeedDropdown) {
			document.addEventListener('mousedown', handleClickOutside);
			return () => {
				document.removeEventListener('mousedown', handleClickOutside);
			};
		}
	}, [showSpeedDropdown]);

	// Get or create audio player
	const getAudioPlayer = () => {
		let audioPlayer = document.getElementById('flashcard-audio-player');
		if (!audioPlayer) {
			audioPlayer = document.createElement('audio');
			audioPlayer.id = 'flashcard-audio-player';
			audioPlayer.style.display = 'none';
			document.body.appendChild(audioPlayer);
		}
		return audioPlayer;
	};

	// Set up audio event listeners
	useEffect(() => {
		const audioPlayer = getAudioPlayer();
		audioPlayerRef.current = audioPlayer;

		const handlePlay = () => setIsPlaying(true);
		const handlePause = () => setIsPlaying(false);
		const handleEnded = () => {
			setIsPlaying(false);
			currentAudioTextRef.current = null;
		};
		const handleError = () => {
			setIsLoading(false);
			setIsPlaying(false);
			currentAudioTextRef.current = null;
		};

		audioPlayer.addEventListener('play', handlePlay);
		audioPlayer.addEventListener('pause', handlePause);
		audioPlayer.addEventListener('ended', handleEnded);
		audioPlayer.addEventListener('error', handleError);

		return () => {
			audioPlayer.removeEventListener('play', handlePlay);
			audioPlayer.removeEventListener('pause', handlePause);
			audioPlayer.removeEventListener('ended', handleEnded);
			audioPlayer.removeEventListener('error', handleError);
		};
	}, []);

	// Update playback speed when it changes
	useEffect(() => {
		if (audioPlayerRef.current) {
			audioPlayerRef.current.playbackRate = playbackSpeed;
		}
	}, [playbackSpeed]);

	// Stop audio and reset state when text changes
	useEffect(() => {
		const audioPlayer = audioPlayerRef.current;
		if (audioPlayer && currentAudioTextRef.current !== text) {
			// Text changed, stop any playing audio
			if (!audioPlayer.paused) {
				audioPlayer.pause();
			}
			setIsPlaying(false);
			setIsLoading(false);
			currentAudioTextRef.current = null;
		}
	}, [text]);

	const handlePause = useCallback(() => {
		const audioPlayer = audioPlayerRef.current;
		if (audioPlayer && !audioPlayer.paused) {
			audioPlayer.pause();
		}
	}, []);

	const handleResume = useCallback(() => {
		const audioPlayer = audioPlayerRef.current;
		if (audioPlayer && audioPlayer.paused) {
			audioPlayer.play();
		}
	}, []);

	const readAloud = useCallback(
		async (textToRead) => {
			// If already playing the same text, pause it
			if (isPlaying && currentAudioTextRef.current === textToRead) {
				handlePause();
				return;
			}

			// If paused and it's the same text, resume
			const audioPlayer = audioPlayerRef.current;
			if (
				audioPlayer &&
				audioPlayer.paused &&
				audioPlayer.src &&
				currentAudioTextRef.current === textToRead
			) {
				handleResume();
				return;
			}

			// Otherwise, load and play new audio
			const loadStartTime = Date.now();
			setIsLoading(true);

			try {
				const audioBlob = await readAloudAPI(
					textToRead,
					voiceId,
					engine
				);
				const loadTime = Date.now() - loadStartTime;
				console.log(`Audio loaded in ${loadTime}ms`);

				const audioPlayer = getAudioPlayer();

				// Clean up previous URL if exists
				if (audioPlayer.src) {
					URL.revokeObjectURL(audioPlayer.src);
				}

				// Track which text this audio is for
				currentAudioTextRef.current = textToRead;

				// Make sure the metadata is loaded before setting the playback rate
				audioPlayer.onloadedmetadata = () => {
					audioPlayer.playbackRate = playbackSpeed;
					setIsLoading(false);
				};

				// Set playback speed and new audio, then play
				audioPlayer.src = URL.createObjectURL(audioBlob);
				audioPlayer.play().catch((error) => {
					console.error('Failed to play audio:', error);
					setIsLoading(false);
					setIsPlaying(false);
					currentAudioTextRef.current = null;
				});
			} catch (error) {
				console.error('Failed to read aloud:', error);
				setIsLoading(false);
				setIsPlaying(false);
				currentAudioTextRef.current = null;
			}
		},
		[playbackSpeed, isPlaying, handlePause, handleResume, voiceId, engine]
	);

	// Expose play/pause method to parent via ref
	useImperativeHandle(
		ref,
		() => ({
			togglePlayPause: () => {
				const audioPlayer = audioPlayerRef.current;
				if (audioPlayer && !audioPlayer.paused) {
					handlePause();
				} else {
					readAloud(text);
				}
			},
		}),
		[text, handlePause, readAloud]
	);

	const adjustPlaybackSpeed = (delta) => {
		const newSpeed = Math.max(0.1, Math.min(3.0, playbackSpeed + delta));
		const roundedSpeed = Math.round(newSpeed * 10) / 10; // Round to 1 decimal place
		onSpeedChange(roundedSpeed);
	};

	return (
		<div
			ref={dropdownRef}
			className="absolute top-4 right-28 z-10 flex items-center"
		>
			<div className="flex items-center border border-gray-200 dark:border-slate-600 rounded-lg overflow-hidden bg-white/50 dark:bg-slate-700/50">
				<button
					onClick={(e) => {
						e.stopPropagation();
						readAloud(text);
					}}
					className="p-2 transition-all duration-200 text-gray-400 dark:text-slate-500 hover:bg-white/70 dark:hover:bg-slate-700/70 hover:text-blue-500 dark:hover:text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
					title={isPlaying ? 'Pause' : 'Read aloud'}
					disabled={isLoading}
				>
					{isLoading ? (
						<Loader2 className="h-5 w-5 animate-spin" />
					) : isPlaying ? (
						<Pause className="h-5 w-5" />
					) : (
						<Volume2 className="h-5 w-5" />
					)}
				</button>
				<div className="h-6 w-px bg-gray-200 dark:bg-slate-600" />
				<button
					onClick={(e) => {
						e.stopPropagation();
						setShowSpeedDropdown(!showSpeedDropdown);
					}}
					className={`p-2 transition-all duration-200 text-gray-400 dark:text-slate-500 hover:bg-white/70 dark:hover:bg-slate-700/70 hover:text-blue-500 dark:hover:text-blue-400 ${
						showSpeedDropdown
							? 'bg-white/70 dark:bg-slate-700/70 text-blue-500 dark:text-blue-400'
							: ''
					}`}
					title="Playback speed"
				>
					<ChevronDown
						className={`h-4 w-4 transition-transform ${
							showSpeedDropdown ? 'rotate-180' : ''
						}`}
					/>
				</button>
			</div>

			{/* Speed Dropdown Menu */}
			{showSpeedDropdown && (
				<div className="absolute top-full right-0 mt-1 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 py-2 z-50">
					<div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
						Playback Speed
					</div>
					<div className="flex items-center justify-between px-3 py-2">
						<button
							onClick={(e) => {
								e.stopPropagation();
								adjustPlaybackSpeed(-0.1);
							}}
							className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300 transition-colors"
							title="Decrease speed"
						>
							<Minus className="h-4 w-4" />
						</button>
						<span className="text-sm font-medium text-gray-900 dark:text-slate-100 min-w-12 text-center">
							{playbackSpeed.toFixed(1)}x
						</span>
						<button
							onClick={(e) => {
								e.stopPropagation();
								adjustPlaybackSpeed(0.1);
							}}
							className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300 transition-colors"
							title="Increase speed"
						>
							<Plus className="h-4 w-4" />
						</button>
					</div>
				</div>
			)}
		</div>
	);
});

export default ReadAloudButton;
