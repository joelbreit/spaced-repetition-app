import {
	RotateCcw,
	Edit,
	X,
	BarChart3,
	Clock,
	Target,
	Calendar,
	RulerDimensionLine,
	Weight,
	Settings,
	Volume2,
	Loader2,
	Pause,
} from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import SegmentedProgressBar from '../SegmentedProgressBar';
import CardSide from './CardSide';
import ReadAloudSettingsModal from './ReadAloudSettingsModal';
import {
	calculateNextInterval,
	getInterval,
	calculateLearningStrength,
	getPerDayReviewRate,
} from '../../services/cardCalculations';
import { useAppData } from '../../contexts/AppDataContext';
import { readAloudAPI } from '../../services/apiStorage';

export default function CardReviewView({
	deck,
	currentCardIndex,
	isFlipped,
	sections = [],
	onFlip,
	onReview,
	onEditCard,
	onEndReview,
	onToggleFlag,
	onToggleStar,
}) {
	const { appData } = useAppData();
	const currentCard = deck.cards[currentCardIndex];
	const totalCards = deck.cards.length;
	const isFlagged = currentCard?.isFlagged || false;
	const isStarred = currentCard?.isStarred || false;

	// Get source deck info if this is a folder review
	const sourceDeck = currentCard?.sourceDeckId
		? appData.decks?.find((d) => d.deckId === currentCard.sourceDeckId)
		: null;
	const displayDeckName = sourceDeck?.deckName || deck.deckName;
	const displayDeckSymbol = sourceDeck?.deckSymbol || deck.deckSymbol || '📚';

	// Animation state for review result
	const [animationResult, setAnimationResult] = useState(null);
	const [nextDueDate, setNextDueDate] = useState(null);
	const [selectedReview, setSelectedReview] = useState(null);

	// Track if the current card has been flipped at least once
	const [hasBeenFlipped, setHasBeenFlipped] = useState(false);
	const previousCardIndexRef = useRef(currentCardIndex);

	// Track review timing - start time when card is first viewed
	const reviewStartTimeRef = useRef(null);

	// Read aloud state
	const [isLoadingAudio, setIsLoadingAudio] = useState(false);
	const [isPlayingAudio, setIsPlayingAudio] = useState(false);
	const audioPlayerRef = useRef(null);
	const currentAudioTextRef = useRef(null);

	// Playback speed (read from localStorage, not stateful since settings modal handles changes)
	const playbackSpeed = parseFloat(
		localStorage.getItem('readAloudPlaybackSpeed') || '1.0'
	);

	// Read aloud settings state
	const [readAloudSettings, setReadAloudSettings] = useState(() => {
		try {
			const saved = localStorage.getItem('readAloudSettings');
			if (saved) {
				const settings = JSON.parse(saved);
				return {
					voiceId: settings.voiceId || 'Ruth',
					engine: settings.engine || 'generative',
					autoRead: settings.autoRead || 'off',
				};
			}
		} catch (error) {
			console.error('Error loading readAloud settings:', error);
		}
		return { voiceId: 'Ruth', engine: 'generative', autoRead: 'off' };
	});

	// Settings modal state
	const [showSettingsModal, setShowSettingsModal] = useState(false);

	// Initialize timer on mount and reset hasBeenFlipped and start timer when card changes
	useEffect(() => {
		if (previousCardIndexRef.current !== currentCardIndex) {
			setHasBeenFlipped(false);
			setSelectedReview(null);
			previousCardIndexRef.current = currentCardIndex;
			reviewStartTimeRef.current = Date.now();
		}
	}, [currentCardIndex]);

	// Initialize timer on initial mount
	useEffect(() => {
		if (reviewStartTimeRef.current === null && currentCard) {
			reviewStartTimeRef.current = Date.now();
		}
	}, [currentCard]);

	// Mark as flipped when isFlipped becomes true
	useEffect(() => {
		if (isFlipped && !hasBeenFlipped) {
			setHasBeenFlipped(true);
		}
	}, [isFlipped, hasBeenFlipped]);

	// Get or create audio player
	const getAudioPlayer = useCallback(() => {
		let audioPlayer = document.getElementById('flashcard-audio-player');
		if (!audioPlayer) {
			audioPlayer = document.createElement('audio');
			audioPlayer.id = 'flashcard-audio-player';
			audioPlayer.style.display = 'none';
			document.body.appendChild(audioPlayer);
		}
		return audioPlayer;
	}, []);

	// Set up audio event listeners
	useEffect(() => {
		const audioPlayer = getAudioPlayer();
		audioPlayerRef.current = audioPlayer;

		const handlePlay = () => setIsPlayingAudio(true);
		const handlePause = () => setIsPlayingAudio(false);
		const handleEnded = () => {
			setIsPlayingAudio(false);
			currentAudioTextRef.current = null;
		};
		const handleError = () => {
			setIsLoadingAudio(false);
			setIsPlayingAudio(false);
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
	}, [getAudioPlayer]);

	// Update playback speed when it changes
	useEffect(() => {
		if (audioPlayerRef.current) {
			audioPlayerRef.current.playbackRate = playbackSpeed;
		}
	}, [playbackSpeed]);

	// Stop audio when card changes or flips
	useEffect(() => {
		const audioPlayer = audioPlayerRef.current;
		if (audioPlayer && !audioPlayer.paused) {
			audioPlayer.pause();
		}
		setIsPlayingAudio(false);
		setIsLoadingAudio(false);
		currentAudioTextRef.current = null;
	}, [currentCardIndex, isFlipped]);

	// Auto-read when side is shown (after flip animation)
	useEffect(() => {
		const autoRead = readAloudSettings.autoRead;
		if (autoRead === 'off' || !currentCard || animationResult) {
			return;
		}
		const timeoutId = setTimeout(() => {
			const frontLen = (currentCard.front || '').length;
			const backLen = (currentCard.back || '').length;
			let shouldRead = false;

			if (autoRead === 'both') {
				shouldRead = true;
			} else if (autoRead === 'front') {
				shouldRead = !isFlipped;
			} else if (autoRead === 'back') {
				shouldRead = isFlipped;
			} else if (autoRead === 'longer') {
				if (!isFlipped && frontLen >= backLen) shouldRead = true;
				if (isFlipped && backLen >= frontLen) shouldRead = true;
			}

			if (shouldRead) {
				const textToRead = isFlipped
					? currentCard.back
					: currentCard.front;
				if ((textToRead || '').trim()) {
					handleReadAloud();
				}
			}
		}, 650);
		return () => clearTimeout(timeoutId);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		isFlipped,
		currentCardIndex,
		currentCard?.cardId,
		readAloudSettings.autoRead,
		animationResult,
		currentCard,
	]);

	// Handle settings save
	const handleSaveSettings = (voiceId, engine, autoRead = 'off') => {
		const newSettings = { voiceId, engine, autoRead };
		setReadAloudSettings(newSettings);
		localStorage.setItem('readAloudSettings', JSON.stringify(newSettings));
	};

	// Handle Read Aloud
	const handleReadAloud = useCallback(async () => {
		const textToRead = isFlipped ? currentCard?.back : currentCard?.front;
		if (!textToRead?.trim()) return;

		const audioPlayer = audioPlayerRef.current;

		// If already playing the same text, pause it
		if (isPlayingAudio && currentAudioTextRef.current === textToRead) {
			audioPlayer?.pause();
			return;
		}

		// If paused and it's the same text, resume
		if (
			audioPlayer &&
			audioPlayer.paused &&
			audioPlayer.src &&
			currentAudioTextRef.current === textToRead
		) {
			audioPlayer.play();
			return;
		}

		// Otherwise, load and play new audio
		setIsLoadingAudio(true);

		try {
			const audioBlob = await readAloudAPI(
				textToRead,
				readAloudSettings.voiceId,
				readAloudSettings.engine
			);

			const player = getAudioPlayer();

			if (player.src) {
				URL.revokeObjectURL(player.src);
			}

			currentAudioTextRef.current = textToRead;

			player.onloadedmetadata = () => {
				player.playbackRate = playbackSpeed;
				setIsLoadingAudio(false);
			};

			player.src = URL.createObjectURL(audioBlob);
			player.play().catch((error) => {
				console.error('Failed to play audio:', error);
				setIsLoadingAudio(false);
				setIsPlayingAudio(false);
				currentAudioTextRef.current = null;
			});
		} catch (error) {
			console.error('Failed to read aloud:', error);
			setIsLoadingAudio(false);
			setIsPlayingAudio(false);
			currentAudioTextRef.current = null;
		}
	}, [
		isFlipped,
		currentCard,
		isPlayingAudio,
		readAloudSettings,
		playbackSpeed,
		getAudioPlayer,
	]);

	// Handle review button click - trigger animation then record
	const handleReview = useCallback(
		(result) => {
			if (!currentCard) return;

			const timestamp = Date.now();
			const interval = calculateNextInterval(
				result,
				currentCard,
				timestamp
			);
			const nextDue = timestamp + interval;

			const reviewDuration = reviewStartTimeRef.current
				? timestamp - reviewStartTimeRef.current
				: 0;

			setAnimationResult(result);
			setNextDueDate(nextDue);
			setSelectedReview(result);

			setTimeout(() => {
				onReview(result, timestamp, reviewDuration);

				setTimeout(() => {
					setAnimationResult(null);
					setNextDueDate(null);
					setSelectedReview(null);
				}, 300);
			}, 600);
		},
		[currentCard, onReview]
	);

	// Keyboard shortcuts
	useEffect(() => {
		const handleKeyDown = (event) => {
			if (
				event.target.tagName === 'INPUT' ||
				event.target.tagName === 'TEXTAREA' ||
				event.target.isContentEditable
			) {
				return;
			}

			// Escape: end review (unless settings modal is open)
			if (event.key === 'Escape' && !showSettingsModal) {
				event.preventDefault();
				onEndReview();
				return;
			}

			// Space: play/pause audio
			if (event.key === ' ' || event.code === 'Space') {
				event.preventDefault();
				if (!animationResult) {
					handleReadAloud();
				}
				return;
			}

			// Enter: flip card
			if (event.key === 'Enter') {
				event.preventDefault();
				if (!animationResult) {
					onFlip();
				}
				return;
			}

			// Arrow keys: review actions (only when card is flipped)
			if (!hasBeenFlipped || animationResult) {
				return;
			}

			switch (event.key) {
				case 'ArrowLeft':
					event.preventDefault();
					handleReview('again');
					break;
				case 'ArrowDown':
					event.preventDefault();
					handleReview('hard');
					break;
				case 'ArrowRight':
					event.preventDefault();
					handleReview('good');
					break;
				case 'ArrowUp':
					event.preventDefault();
					handleReview('easy');
					break;
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, [
		isFlipped,
		hasBeenFlipped,
		animationResult,
		handleReadAloud,
		handleReview,
		onFlip,
		showSettingsModal,
		onEndReview,
	]);

	if (!currentCard) {
		return null;
	}

	// Get animation color based on result
	const getAnimationColor = () => {
		if (!animationResult) return null;

		const colors = {
			again: 'bg-red-500/20 dark:bg-red-500/30 border-red-500/50',
			hard: 'bg-orange-500/20 dark:bg-orange-500/30 border-orange-500/50',
			good: 'bg-green-500/20 dark:bg-green-500/30 border-green-500/50',
			easy: 'bg-teal-500/20 dark:bg-teal-500/30 border-teal-500/50',
		};
		return colors[animationResult] || null;
	};

	// Calculate statistics
	const reviews = currentCard.reviews || [];
	const reviewCount = reviews.length;

	const lastReview = reviews.length > 0 ? reviews[reviews.length - 1] : null;
	const timeSinceLastReview = lastReview
		? Date.now() - lastReview.timestamp
		: null;

	const formatTimeAgo = (ms) => {
		if (!ms) return 'Never';
		const seconds = Math.floor(ms / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);
		const days = Math.floor(hours / 24);

		if (days > 0) return `${days}d ago`;
		if (hours > 0) return `${hours}h ago`;
		if (minutes > 0) return `${minutes}m ago`;
		return 'Just now';
	};

	const learningStrength = calculateLearningStrength(currentCard);

	const daysUntilDue = currentCard.whenDue
		? Math.ceil((currentCard.whenDue - Date.now()) / (1000 * 60 * 60 * 24))
		: 0;

	const formatDaysUntilDue = () => {
		if (!currentCard.whenDue) return 'Due';
		if (daysUntilDue < 0) {
			const daysAgo = Math.abs(daysUntilDue);
			if (daysAgo === 1) return 'Yesterday';
			return `${daysAgo}d overdue`;
		}
		if (daysUntilDue === 0) return 'Today';
		if (daysUntilDue === 1) return 'Tomorrow';
		return `In ${daysUntilDue}d`;
	};

	const formatInterval = () => {
		const interval = getInterval(currentCard);
		const days = Math.floor(interval / (1000 * 60 * 60 * 24));
		if (days > 0) return `${days}d`;
		const hours = Math.floor(interval / (1000 * 60 * 60));
		if (hours > 0) return `${hours}h`;
		const minutes = Math.floor(interval / (1000 * 60));
		return `${minutes}m`;
	};

	const getDueColor = () => {
		if (daysUntilDue < 0) return 'text-red-600 dark:text-red-400';
		if (daysUntilDue === 0) return 'text-orange-600 dark:text-orange-400';
		return 'text-gray-600 dark:text-gray-400';
	};

	// Build stats array for CardSide
	const cardStats = [
		{
			icon: <BarChart3 className="h-3 w-3 text-teal-500" />,
			value: reviewCount,
			label: 'reviews',
		},
		{
			icon: <Clock className="h-3 w-3 text-blue-500" />,
			value: formatTimeAgo(timeSinceLastReview),
		},
		{
			icon: <Target className="h-3 w-3 text-green-500" />,
			value: `${Math.round(learningStrength)}%`,
			label: 'mastery',
		},
		{
			icon: <Calendar className="h-3 w-3 text-cyan-500" />,
			value: formatDaysUntilDue(),
			valueColor: getDueColor(),
		},
		{
			icon: <RulerDimensionLine className="h-3 w-3 text-blue-500" />,
			value: formatInterval(),
			label: 'interval',
		},
		{
			icon: <Weight className="h-3 w-3 text-purple-500" />,
			value: getPerDayReviewRate(currentCard).toFixed(2),
			label: 'burden',
		},
	];

	return (
		<div className="mx-auto max-w-4xl">
			{/* Segmented Progress Bar */}
			<SegmentedProgressBar
				sections={sections}
				currentCardIndex={currentCardIndex}
				totalCards={totalCards}
			/>

			{/* Card */}
			<div className="mb-6" style={{ perspective: '1000px' }}>
				<div
					className={`cursor-pointer group animate-scale-in ${
						animationResult ? 'pointer-events-none' : ''
					}`}
					onClick={animationResult ? undefined : onFlip}
					style={{
						transformStyle: 'preserve-3d',
						transform: isFlipped
							? 'rotateY(180deg)'
							: 'rotateY(0deg)',
						transition:
							'transform 0.6s cubic-bezier(0.4, 0.0, 0.2, 1)',
						display: 'grid',
					}}
				>
					{/* Front Side */}
					<CardSide
						side="Front"
						text={currentCard.front}
						animationResult={animationResult}
						nextDueDate={animationResult ? nextDueDate : null}
						animationColor={getAnimationColor()}
						isStarred={isStarred}
						isFlagged={isFlagged}
						onToggleStar={onToggleStar}
						onToggleFlag={onToggleFlag}
						cardId={currentCard.cardId}
						transform="rotateY(0deg)"
						deckName={displayDeckName}
						deckSymbol={displayDeckSymbol}
						stats={cardStats}
					/>

					{/* Back Side */}
					<CardSide
						side="Back"
						text={currentCard.back}
						animationResult={animationResult}
						nextDueDate={animationResult ? nextDueDate : null}
						animationColor={getAnimationColor()}
						isStarred={isStarred}
						isFlagged={isFlagged}
						onToggleStar={onToggleStar}
						onToggleFlag={onToggleFlag}
						cardId={currentCard.cardId}
						transform="rotateY(180deg)"
						deckName={displayDeckName}
						deckSymbol={displayDeckSymbol}
						stats={cardStats}
					/>
				</div>
			</div>

			{/* Review buttons */}
			<div className="space-y-6">
				{hasBeenFlipped ? (
					<div>
						<h3 className="mb-6 text-center text-xl font-semibold text-gray-700 dark:text-gray-300">
							How did you do?
						</h3>
						<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
							<button
								onClick={() => handleReview('again')}
								disabled={!!animationResult}
								className={`px-6 py-4 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${
									selectedReview === 'again'
										? 'ring-4 ring-red-300 dark:ring-red-400 scale-105 shadow-2xl'
										: ''
								}`}
							>
								<div className="text-lg font-semibold">
									Again
								</div>
								<div className="text-sm opacity-90">Poor</div>
							</button>
							<button
								onClick={() => handleReview('hard')}
								disabled={!!animationResult}
								className={`px-6 py-4 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${
									selectedReview === 'hard'
										? 'ring-4 ring-orange-300 dark:ring-orange-400 scale-105 shadow-2xl'
										: ''
								}`}
							>
								<div className="text-lg font-semibold">
									Hard
								</div>
								<div className="text-sm opacity-90">
									Difficult
								</div>
							</button>
							<button
								onClick={() => handleReview('good')}
								disabled={!!animationResult}
								className={`px-6 py-4 bg-green-500 hover:bg-green-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${
									selectedReview === 'good'
										? 'ring-4 ring-green-300 dark:ring-green-400 scale-105 shadow-2xl'
										: ''
								}`}
							>
								<div className="text-lg font-semibold">
									Good
								</div>
								<div className="text-sm opacity-90">
									Correct
								</div>
							</button>
							<button
								onClick={() => handleReview('easy')}
								disabled={!!animationResult}
								className={`px-6 py-4 bg-linear-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${
									selectedReview === 'easy'
										? 'ring-4 ring-teal-300 dark:ring-teal-400 scale-105 shadow-2xl'
										: ''
								}`}
							>
								<div className="text-lg font-semibold">
									Easy
								</div>
								<div className="text-sm opacity-90">Simple</div>
							</button>
						</div>
					</div>
				) : (
					<div className="text-center">
						<button
							onClick={onFlip}
							className="inline-flex items-center gap-3 px-8 py-4 bg-linear-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
						>
							<RotateCcw className="h-6 w-6" />
							Show Answer
						</button>
					</div>
				)}

				{/* Action buttons */}
				<div className="flex justify-center gap-3 flex-wrap">
					<button
						onClick={handleReadAloud}
						disabled={isLoadingAudio}
						className="flex items-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 font-medium rounded-xl transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
						title={isPlayingAudio ? 'Pause' : 'Read aloud (Space)'}
					>
						{isLoadingAudio ? (
							<Loader2 className="h-5 w-5 animate-spin" />
						) : isPlayingAudio ? (
							<Pause className="h-5 w-5" />
						) : (
							<Volume2 className="h-5 w-5" />
						)}
						<span className="hidden sm:inline">
							{isPlayingAudio ? 'Pause' : 'Listen'}
						</span>
					</button>
					<button
						onClick={() => onEditCard(currentCard.cardId)}
						className="flex items-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 font-medium rounded-xl transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
					>
						<Edit className="h-5 w-5" />
						<span className="hidden sm:inline">Edit</span>
					</button>
					<button
						onClick={() => setShowSettingsModal(true)}
						className="flex items-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 font-medium rounded-xl transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
					>
						<Settings className="h-5 w-5" />
						<span className="hidden sm:inline">Settings</span>
					</button>
					<button
						onClick={onEndReview}
						className="flex items-center gap-2 px-4 py-3 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
					>
						<X className="h-5 w-5" />
						<span className="hidden sm:inline">End</span>
					</button>
				</div>
			</div>

			{/* Settings Modal */}
			<ReadAloudSettingsModal
				isOpen={showSettingsModal}
				onClose={() => setShowSettingsModal(false)}
				onSave={handleSaveSettings}
				currentVoiceId={readAloudSettings.voiceId}
				currentEngine={readAloudSettings.engine}
				currentAutoRead={readAloudSettings.autoRead}
			/>
		</div>
	);
}
