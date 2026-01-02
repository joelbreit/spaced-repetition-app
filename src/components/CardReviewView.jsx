import {
	RotateCcw,
	Edit,
	X,
	BarChart3,
	Clock,
	Target,
	Calendar,
	Flag,
	Star,
	RulerDimensionLine,
	Volume2,
	Weight,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import SegmentedProgressBar from "./SegmentedProgressBar";
import {
	calculateNextInterval,
	getInterval,
	calculateLearningStrength,
	getPerDayReviewRate,
	prettyPrintDueDateAsInterval,
} from "../services/cardCalculations";
import { readAloudAPI } from "../services/apiStorage";

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
	const currentCard = deck.cards[currentCardIndex];
	const totalCards = deck.cards.length;
	const isFlagged = currentCard?.isFlagged || false;
	const isStarred = currentCard?.isStarred || false;

	// Animation state for review result
	const [animationResult, setAnimationResult] = useState(null);
	const [nextDueDate, setNextDueDate] = useState(null);

	// Track if the current card has been flipped at least once
	const [hasBeenFlipped, setHasBeenFlipped] = useState(false);
	const previousCardIndexRef = useRef(currentCardIndex);

	// Track review timing - start time when card is first viewed
	const reviewStartTimeRef = useRef(null);

	// Initialize timer on mount and reset hasBeenFlipped and start timer when card changes
	useEffect(() => {
		if (previousCardIndexRef.current !== currentCardIndex) {
			setHasBeenFlipped(false);
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

	if (!currentCard) {
		return null;
	}

	const readAloud = async (text) => {
		try {
			const audioBlob = await readAloudAPI(text);

			// Get or create persistent audio element in the DOM for extensions to detect
			let audioPlayer = document.getElementById("flashcard-audio-player");
			if (!audioPlayer) {
				audioPlayer = document.createElement("audio");
				audioPlayer.id = "flashcard-audio-player";
				audioPlayer.style.display = "none";
				document.body.appendChild(audioPlayer);
			}

			// Clean up previous URL if exists
			if (audioPlayer.src) {
				URL.revokeObjectURL(audioPlayer.src);
			}

			// Set new audio and play
			audioPlayer.src = URL.createObjectURL(audioBlob);
			audioPlayer.play();
		} catch (error) {
			console.error("Failed to read aloud:", error);
		}
	};

	// Handle review button click - trigger animation then record
	const handleReview = (result) => {
		const timestamp = Date.now(); // Capture timestamp at button click
		const interval = calculateNextInterval(result, currentCard, timestamp);
		const nextDue = timestamp + interval;

		// Calculate review duration (time from card view to review button click)
		const reviewDuration = reviewStartTimeRef.current
			? timestamp - reviewStartTimeRef.current
			: 0;

		setAnimationResult(result);
		setNextDueDate(nextDue);

		// After animation completes, record the review with the same timestamp and duration
		setTimeout(() => {
			onReview(result, timestamp, reviewDuration);
			setAnimationResult(null);
			setNextDueDate(null);
		}, 600);
	};

	// Get animation color based on result
	const getAnimationColor = () => {
		if (!animationResult) return null;

		const colors = {
			again: "bg-red-500/20 dark:bg-red-500/30 border-red-500/50",
			hard: "bg-orange-500/20 dark:bg-orange-500/30 border-orange-500/50",
			good: "bg-green-500/20 dark:bg-green-500/30 border-green-500/50",
			easy: "bg-teal-500/20 dark:bg-teal-500/30 border-teal-500/50",
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
		if (!ms) return "Never reviewed";
		const seconds = Math.floor(ms / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);
		const days = Math.floor(hours / 24);

		if (days > 0) return `${days} day${days !== 1 ? "s" : ""} ago`;
		if (hours > 0) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
		if (minutes > 0)
			return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
		return "Just now";
	};

	const learningStrength = calculateLearningStrength(currentCard);

	// Days until next due
	const daysUntilDue = currentCard.whenDue
		? Math.ceil((currentCard.whenDue - Date.now()) / (1000 * 60 * 60 * 24))
		: 0;

	const formatDaysUntilDue = () => {
		if (!currentCard.whenDue) {
			return "Due";
		}
		if (daysUntilDue < 0) {
			const daysAgo = Math.abs(daysUntilDue);
			if (daysAgo === 1) return "Due yesterday";
			return `Due ${daysAgo} days ago`;
		}
		// if (daysUntilDue === 0) return "Due today";
		if (daysUntilDue === 0) return formatHoursAgo();
		if (daysUntilDue === 1) return "Due tomorrow";
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

			{/* Card */}
			<div className="mb-8" style={{ perspective: "1000px" }}>
				<div
					className={`cursor-pointer group animate-scale-in ${
						animationResult ? "pointer-events-none" : ""
					}`}
					onClick={animationResult ? undefined : onFlip}
					style={{
						transformStyle: "preserve-3d",
						transform: isFlipped
							? "rotateY(180deg)"
							: "rotateY(0deg)",
						transition:
							"transform 0.6s cubic-bezier(0.4, 0.0, 0.2, 1)",
						display: "grid",
					}}
				>
					{/* Front Side */}
					<div
						className={`backdrop-blur-lg bg-white/80 dark:bg-slate-800/80 border border-white/20 dark:border-slate-700/50 rounded-2xl shadow-2xl min-h-[100px] relative overflow-hidden transition-all ${
							animationResult ? getAnimationColor() : ""
						}`}
						style={{
							backfaceVisibility: "hidden",
							WebkitBackfaceVisibility: "hidden",
							gridArea: "1 / 1",
							transitionDuration: "0.6s",
						}}
					>
						{/* Animation overlay with next due date */}
						{animationResult && (
							<div className="absolute inset-0 flex items-center justify-center z-20 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm">
								<div className="text-center px-6">
									<div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
										{prettyPrintDueDateAsInterval(
											nextDueDate
										)}
									</div>
									<div className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
										Next Review
									</div>
								</div>
							</div>
						)}
						{/* Read Aloud Button */}
						<button
							onClick={(e) => {
								e.stopPropagation();
								// read this side of the card aloud
								readAloud(currentCard.front);
							}}
							className={`absolute top-4 right-28 p-2 rounded-lg transition-all duration-200 z-10 bg-white/50 dark:bg-slate-700/50 text-gray-400 dark:text-slate-500 hover:bg-white/70 dark:hover:bg-slate-700/70 hover:text-blue-500 dark:hover:text-blue-400 border border-gray-200 dark:border-slate-600`}
							title="Read aloud"
						>
							<Volume2 className="h-5 w-5" />
						</button>
						{/* Star Button */}
						<button
							onClick={(e) => {
								e.stopPropagation();
								if (onToggleStar) {
									onToggleStar(currentCard.cardId);
								}
							}}
							className={`absolute top-4 right-16 p-2 rounded-lg transition-all duration-200 z-10 ${
								isStarred
									? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-900/50"
									: "bg-white/50 dark:bg-slate-700/50 text-gray-400 dark:text-slate-500 hover:bg-white/70 dark:hover:bg-slate-700/70 hover:text-yellow-500 dark:hover:text-yellow-400 border border-gray-200 dark:border-slate-600"
							}`}
							title={isStarred ? "Unstar card" : "Star card"}
						>
							<Star
								className={`h-5 w-5 ${
									isStarred ? "fill-current" : ""
								}`}
							/>
						</button>
						{/* Flag Button */}
						<button
							onClick={(e) => {
								e.stopPropagation();
								if (onToggleFlag) {
									onToggleFlag(currentCard.cardId);
								}
							}}
							className={`absolute top-4 right-4 p-2 rounded-lg transition-all duration-200 z-10 ${
								isFlagged
									? "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-900/50"
									: "bg-white/50 dark:bg-slate-700/50 text-gray-400 dark:text-slate-500 hover:bg-white/70 dark:hover:bg-slate-700/70 hover:text-orange-500 dark:hover:text-orange-400 border border-gray-200 dark:border-slate-600"
							}`}
							title={isFlagged ? "Unflag card" : "Flag card"}
						>
							<Flag
								className={`h-5 w-5 ${
									isFlagged ? "fill-current" : ""
								}`}
							/>
						</button>
						<div className="flex h-full flex-col justify-center p-6">
							<div className="text-center">
								<div className="mb-4 text-sm font-semibold uppercase tracking-wide text-teal-600 dark:text-teal-400">
									Front
								</div>
								<div className="text-2xl font-medium text-gray-900 dark:text-white leading-relaxed">
									{currentCard.front}
								</div>
							</div>
						</div>
						<div className="absolute bottom-4 left-4 text-sm text-gray-500 dark:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
							Click to flip
						</div>
					</div>

					{/* Back Side */}
					<div
						className={`backdrop-blur-lg bg-white/80 dark:bg-slate-800/80 border border-white/20 dark:border-slate-700/50 rounded-2xl shadow-2xl min-h-[100px] relative overflow-hidden transition-all ${
							animationResult ? getAnimationColor() : ""
						}`}
						style={{
							backfaceVisibility: "hidden",
							WebkitBackfaceVisibility: "hidden",
							transform: "rotateY(180deg)",
							gridArea: "1 / 1",
							transitionDuration: "0.6s",
						}}
					>
						{/* Animation overlay with next due date */}
						{animationResult && (
							<div className="absolute inset-0 flex items-center justify-center z-20 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm">
								<div className="text-center px-6">
									<div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
										{prettyPrintDueDateAsInterval(
											nextDueDate
										)}
									</div>
									<div className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
										Next Review
									</div>
								</div>
							</div>
						)}

						{/* Read Aloud Button */}
						<button
							onClick={(e) => {
								e.stopPropagation();
								// read this side of the card aloud
								readAloud(currentCard.back);
							}}
							className={`absolute top-4 right-28 p-2 rounded-lg transition-all duration-200 z-10 bg-white/50 dark:bg-slate-700/50 text-gray-400 dark:text-slate-500 hover:bg-white/70 dark:hover:bg-slate-700/70 hover:text-blue-500 dark:hover:text-blue-400 border border-gray-200 dark:border-slate-600`}
							title="Read aloud"
						>
							<Volume2 className="h-5 w-5" />
						</button>
						{/* Star Button */}
						<button
							onClick={(e) => {
								e.stopPropagation();
								if (onToggleStar) {
									onToggleStar(currentCard.cardId);
								}
							}}
							className={`absolute top-4 right-16 p-2 rounded-lg transition-all duration-200 z-10 ${
								isStarred
									? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-900/50"
									: "bg-white/50 dark:bg-slate-700/50 text-gray-400 dark:text-slate-500 hover:bg-white/70 dark:hover:bg-slate-700/70 hover:text-yellow-500 dark:hover:text-yellow-400 border border-gray-200 dark:border-slate-600"
							}`}
							title={isStarred ? "Unstar card" : "Star card"}
						>
							<Star
								className={`h-5 w-5 ${
									isStarred ? "fill-current" : ""
								}`}
							/>
						</button>
						{/* Flag Button */}
						<button
							onClick={(e) => {
								e.stopPropagation();
								if (onToggleFlag) {
									onToggleFlag(currentCard.cardId);
								}
							}}
							className={`absolute top-4 right-4 p-2 rounded-lg transition-all duration-200 z-10 ${
								isFlagged
									? "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-900/50"
									: "bg-white/50 dark:bg-slate-700/50 text-gray-400 dark:text-slate-500 hover:bg-white/70 dark:hover:bg-slate-700/70 hover:text-orange-500 dark:hover:text-orange-400 border border-gray-200 dark:border-slate-600"
							}`}
							title={isFlagged ? "Unflag card" : "Flag card"}
						>
							<Flag
								className={`h-5 w-5 ${
									isFlagged ? "fill-current" : ""
								}`}
							/>
						</button>
						<div className="flex h-full flex-col justify-center p-6">
							<div className="text-center">
								<div className="mb-4 text-sm font-semibold uppercase tracking-wide text-teal-600 dark:text-teal-400">
									Back
								</div>
								<div className="text-2xl font-medium text-gray-900 dark:text-white leading-relaxed">
									{currentCard.back}
								</div>
							</div>
						</div>
						<div className="absolute bottom-4 left-4 text-sm text-gray-500 dark:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
							Click to flip
						</div>
					</div>
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
										? "text-red-600 dark:text-red-400"
										: daysUntilDue === 0
										? "text-orange-600 dark:text-orange-400"
										: "text-gray-600 dark:text-gray-400"
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
								onClick={() => handleReview("again")}
								disabled={!!animationResult}
								className="px-6 py-4 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
							>
								<div className="text-lg font-semibold">
									Again
								</div>
								<div className="text-sm opacity-90">Poor</div>
							</button>
							<button
								onClick={() => handleReview("hard")}
								disabled={!!animationResult}
								className="px-6 py-4 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
							>
								<div className="text-lg font-semibold">
									Hard
								</div>
								<div className="text-sm opacity-90">
									Difficult
								</div>
							</button>
							<button
								onClick={() => handleReview("good")}
								disabled={!!animationResult}
								className="px-6 py-4 bg-green-500 hover:bg-green-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
							>
								<div className="text-lg font-semibold">
									Good
								</div>
								<div className="text-sm opacity-90">
									Correct
								</div>
							</button>
							<button
								onClick={() => handleReview("easy")}
								disabled={!!animationResult}
								className="px-6 py-4 bg-linear-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
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
						Edit Card
					</button>
					<button
						onClick={onEndReview}
						className="flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
					>
						<X className="h-5 w-5" />
						End Review
					</button>
				</div>
			</div>
		</div>
	);
}
