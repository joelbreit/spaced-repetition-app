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
	BookOpen,
	Settings,
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

	// Get source deck name if this is a folder review
	const sourceDeckName = currentCard?.sourceDeckId
		? appData.decks?.find((d) => d.deckId === currentCard.sourceDeckId)
				?.deckName
		: null;

	// Animation state for review result
	const [animationResult, setAnimationResult] = useState(null);
	const [nextDueDate, setNextDueDate] = useState(null);
	const [selectedReview, setSelectedReview] = useState(null);

	// Track if the current card has been flipped at least once
	const [hasBeenFlipped, setHasBeenFlipped] = useState(false);
	const previousCardIndexRef = useRef(currentCardIndex);

	// Track review timing - start time when card is first viewed
	const reviewStartTimeRef = useRef(null);

	// Refs for read aloud buttons
	const frontReadAloudRef = useRef(null);
	const backReadAloudRef = useRef(null);

	// Playback speed state
	const [playbackSpeed, setPlaybackSpeed] = useState(() => {
		// Load from localStorage, default to 1.0
		const saved = localStorage.getItem('readAloudPlaybackSpeed');
		return saved ? parseFloat(saved) : 1.0;
	});

	// Read aloud settings state
	const [readAloudSettings, setReadAloudSettings] = useState(() => {
		// Load from localStorage, default to Ruth/generative/off
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
			// Start timing when card is first shown
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

	// Save playback speed to localStorage when it changes
	useEffect(() => {
		localStorage.setItem(
			'readAloudPlaybackSpeed',
			playbackSpeed.toString()
		);
	}, [playbackSpeed]);

	// Auto-read when side is shown (after flip animation)
	useEffect(() => {
		const autoRead = readAloudSettings.autoRead;
		if (autoRead === 'off' || !currentCard || animationResult) {
			return;
		}
		const timeoutId = setTimeout(() => {
			const frontLen = (currentCard.front || '').length;
			const backLen = (currentCard.back || '').length;
			let shouldReadFront = false;
			let shouldReadBack = false;
			if (autoRead === 'both') {
				shouldReadFront = !isFlipped;
				shouldReadBack = isFlipped;
			} else if (autoRead === 'front') {
				shouldReadFront = !isFlipped;
			} else if (autoRead === 'back') {
				shouldReadBack = isFlipped;
			} else if (autoRead === 'longer') {
				if (!isFlipped && frontLen >= backLen) shouldReadFront = true;
				if (isFlipped && backLen >= frontLen) shouldReadBack = true;
			}
			if (shouldReadFront && (currentCard.front || '').trim()) {
				frontReadAloudRef.current?.togglePlayPause();
			}
			if (shouldReadBack && (currentCard.back || '').trim()) {
				backReadAloudRef.current?.togglePlayPause();
			}
		}, 650);
		return () => clearTimeout(timeoutId);
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

	// Handle review button click - trigger animation then record
	const handleReview = useCallback(
		(result) => {
			if (!currentCard) return;

			const timestamp = Date.now(); // Capture timestamp at button click
			const interval = calculateNextInterval(
				result,
				currentCard,
				timestamp
			);
			const nextDue = timestamp + interval;

			// Calculate review duration (time from card view to review button click)
			const reviewDuration = reviewStartTimeRef.current
				? timestamp - reviewStartTimeRef.current
				: 0;

			setAnimationResult(result);
			setNextDueDate(nextDue);
			setSelectedReview(result);

			// After animation completes, record the review with the same timestamp and duration
			setTimeout(() => {
				onReview(result, timestamp, reviewDuration);

				// Keep the animation result visible for a bit longer while it flips back
				// This matches the 300ms delay in OverviewPage.jsx
				setTimeout(() => {
					setAnimationResult(null);
					setNextDueDate(null);
					setSelectedReview(null);
				}, 300);
			}, 600);
		},
		[currentCard, onReview]
	);

	// Function to toggle play/pause for current side
	const toggleCurrentSideAudio = useCallback(() => {
		const currentReadAloudRef = isFlipped
			? backReadAloudRef
			: frontReadAloudRef;
		if (currentReadAloudRef.current) {
			currentReadAloudRef.current.togglePlayPause();
		}
	}, [isFlipped]);

	// Keyboard shortcuts
	useEffect(() => {
		const handleKeyDown = (event) => {
			// Don't trigger shortcuts if user is typing in an input/textarea
			if (
				event.target.tagName === 'INPUT' ||
				event.target.tagName === 'TEXTAREA' ||
				event.target.isContentEditable
			) {
				return;
			}

			// Space: play/pause audio
			if (event.key === ' ' || event.code === 'Space') {
				event.preventDefault();
				if (!animationResult) {
					toggleCurrentSideAudio();
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
		toggleCurrentSideAudio,
		handleReview,
		onFlip,
	]);

	if (!currentCard) {
		return null;
	}

	const handleSpeedChange = (newSpeed) => {
		setPlaybackSpeed(newSpeed);
	};

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

	// Time since last review
	const lastReview = reviews.length > 0 ? reviews[reviews.length - 1] : null;
	const timeSinceLastReview = lastReview
		? Date.now() - lastReview.timestamp
		: null;

	const formatTimeAgo = (ms) => {
		if (!ms) return 'Never reviewed';
		const seconds = Math.floor(ms / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);
		const days = Math.floor(hours / 24);

		if (days > 0) return `${days} day${days !== 1 ? 's' : ''} ago`;
		if (hours > 0) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
		if (minutes > 0)
			return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
		return 'Just now';
	};

	const learningStrength = calculateLearningStrength(currentCard);

	// Days until next due
	const daysUntilDue = currentCard.whenDue
		? Math.ceil((currentCard.whenDue - Date.now()) / (1000 * 60 * 60 * 24))
		: 0;

	const formatDaysUntilDue = () => {
		if (!currentCard.whenDue) {
			return 'Due';
		}
		if (daysUntilDue < 0) {
			const daysAgo = Math.abs(daysUntilDue);
			if (daysAgo === 1) return 'Due yesterday';
			return `Due ${daysAgo} days ago`;
		}
		// if (daysUntilDue === 0) return "Due today";
		if (daysUntilDue === 0) return formatHoursAgo();
		if (daysUntilDue === 1) return 'Due tomorrow';
		return `Due in ${daysUntilDue} days`;
	};

	// e.g. Due x hours ago
	const formatHoursAgo = () => {
		const hoursAgo = Math.ceil(
			(Date.now() - currentCard.whenDue) / (1000 * 60 * 60)
		);

		if (hoursAgo === 1) return formatMinutesAgo();
		return `Due ${hoursAgo} hours ago`;
	};

	// e.g. Due x minutes ago
	const formatMinutesAgo = () => {
		const minutesAgo = Math.ceil(
			(Date.now() - currentCard.whenDue) / (1000 * 60)
		);
		return `Due ${minutesAgo} minutes ago`;
	};

	const formatInterval = () => {
		const interval = getInterval(currentCard);

		// days
		const days = Math.floor(interval / (1000 * 60 * 60 * 24));
		if (days > 0) return `${days} days`;
		// hours
		const hours = Math.floor(interval / (1000 * 60 * 60));
		if (hours > 0) return `${hours} hours`;
		// minutes
		const minutes = Math.floor(interval / (1000 * 60));
		return `${minutes} minutes`;
	};

	return (
		<div className="mx-auto max-w-4xl">
			{/* Segmented Progress Bar */}
			<SegmentedProgressBar
				sections={sections}
				currentCardIndex={currentCardIndex}
				totalCards={totalCards}
			/>

			{/* Source Deck Name (for folder reviews) */}
			{sourceDeckName && (
				<div className="mb-4 flex justify-center">
					<div className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border border-gray-200/50 dark:border-slate-700/50 rounded-lg text-sm text-gray-700 dark:text-gray-300">
						<BookOpen className="h-4 w-4 text-teal-500" />
						<span className="font-medium">From:</span>
						<span className="text-teal-600 dark:text-teal-400">
							{sourceDeckName}
						</span>
					</div>
				</div>
			)}

			{/* Card */}
			<div className="mb-8" style={{ perspective: '1000px' }}>
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
						ref={frontReadAloudRef}
						side="Front"
						text={currentCard.front}
						animationResult={animationResult}
						nextDueDate={animationResult ? nextDueDate : null}
						animationColor={getAnimationColor()}
						playbackSpeed={playbackSpeed}
						onSpeedChange={handleSpeedChange}
						voiceId={readAloudSettings.voiceId}
						engine={readAloudSettings.engine}
						isStarred={isStarred}
						isFlagged={isFlagged}
						onToggleStar={onToggleStar}
						onToggleFlag={onToggleFlag}
						cardId={currentCard.cardId}
						transform="rotateY(0deg)"
					/>

					{/* Back Side */}
					<CardSide
						ref={backReadAloudRef}
						side="Back"
						text={currentCard.back}
						animationResult={animationResult}
						nextDueDate={animationResult ? nextDueDate : null}
						animationColor={getAnimationColor()}
						playbackSpeed={playbackSpeed}
						onSpeedChange={handleSpeedChange}
						voiceId={readAloudSettings.voiceId}
						engine={readAloudSettings.engine}
						isStarred={isStarred}
						isFlagged={isFlagged}
						onToggleStar={onToggleStar}
						onToggleFlag={onToggleFlag}
						cardId={currentCard.cardId}
						transform="rotateY(180deg)"
					/>
				</div>
			</div>

			{/* Card Statistics - Compact */}
			<div className="mb-6">
				<div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-sm border border-gray-200/50 dark:border-slate-700/50 rounded-lg px-4 py-2">
					<div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs">
						{/* Review Count */}
						<div className="flex items-center gap-1.5">
							<BarChart3 className="h-3 w-3 text-teal-500" />
							<span className="text-gray-600 dark:text-gray-400 font-medium">
								{reviewCount}
							</span>
							<span className="text-gray-500 dark:text-gray-500">
								reviews
							</span>
						</div>

						{/* Time Since Last Review */}
						<div className="flex items-center gap-1.5">
							<Clock className="h-3 w-3 text-blue-500" />
							<span className="text-gray-600 dark:text-gray-400">
								{formatTimeAgo(timeSinceLastReview)}
							</span>
						</div>

						{/* Learning Strength */}
						<div className="flex items-center gap-1.5">
							<Target className="h-3 w-3 text-green-500" />
							<span className="text-gray-600 dark:text-gray-400 font-medium">
								{Math.round(learningStrength)}%
							</span>
							<span className="text-gray-500 dark:text-gray-500">
								mastery
							</span>
						</div>

						{/* Next Due Date */}
						<div className="flex items-center gap-1.5">
							<Calendar className="h-3 w-3 text-cyan-500" />
							<span
								className={`font-medium ${
									daysUntilDue < 0
										? 'text-red-600 dark:text-red-400'
										: daysUntilDue === 0
											? 'text-orange-600 dark:text-orange-400'
											: 'text-gray-600 dark:text-gray-400'
								}`}
							>
								{formatDaysUntilDue()}
							</span>
						</div>

						{/* Interval */}
						<div className="flex items-center gap-1.5">
							<RulerDimensionLine className="h-3 w-3 text-blue-500" />
							<span className="text-gray-600 dark:text-gray-400 font-medium">
								{formatInterval()}
							</span>
						</div>

						{/* Burden/Day */}
						<div className="flex items-center gap-1.5">
							<Weight className="h-3 w-3 text-purple-500" />
							<span className="text-gray-600 dark:text-gray-400 font-medium">
								{getPerDayReviewRate(currentCard).toFixed(2)}
							</span>
							<span className="text-gray-500 dark:text-gray-500">
								burden/day
							</span>
						</div>
					</div>
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
				<div className="flex justify-center gap-4">
					<button
						onClick={() => onEditCard(currentCard.cardId)}
						className="flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 font-medium rounded-xl transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
					>
						<Edit className="h-5 w-5" />
						<span className="hidden sm:inline">Edit</span>
					</button>
					<button
						onClick={() => setShowSettingsModal(true)}
						className="flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 font-medium rounded-xl transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
					>
						<Settings className="h-5 w-5" />
						<span className="hidden sm:inline">Settings</span>
					</button>
					<button
						onClick={onEndReview}
						className="flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
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
