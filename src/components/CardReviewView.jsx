import { RotateCcw, Edit, X } from "lucide-react";

export default function CardReviewView({
	deck,
	currentCardIndex,
	isFlipped,
	onFlip,
	onReview,
	onEditCard,
	onEndReview,
}) {
	const currentCard = deck.cards[currentCardIndex];
	const progress = ((currentCardIndex + 1) / deck.cards.length) * 100;

	if (!currentCard) {
		return null;
	}

	return (
		<div className="mx-auto max-w-4xl">
			{/* Progress bar */}
			<div className="mb-8">
				<div className="mb-3 flex items-center justify-between text-sm">
					<span className="text-gray-600 dark:text-gray-400 font-medium">
						Card {currentCardIndex + 1} of {deck.cards.length}
					</span>
					<span className="text-gray-600 dark:text-gray-400 font-medium">
						{Math.round(progress)}%
					</span>
				</div>
				<div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
					<div
						className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full transition-all duration-500 ease-out relative overflow-hidden"
						style={{ width: `${progress}%` }}
					>
						{/* Shimmer effect */}
						<div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
					</div>
				</div>
			</div>

			{/* Card */}
			<div className="mb-8">
				<div
					className="relative min-h-[500px] cursor-pointer backdrop-blur-lg bg-white/80 dark:bg-slate-800/80 border border-white/20 dark:border-slate-700/50 rounded-2xl shadow-2xl transition-all duration-300 hover:shadow-3xl hover:scale-[1.02] group animate-scale-in"
					onClick={onFlip}
				>
					<div className="flex h-full flex-col justify-center p-8">
						{!isFlipped ? (
							<div className="text-center">
								<div className="mb-6 text-sm font-semibold uppercase tracking-wide text-teal-600 dark:text-teal-400">
									Front
								</div>
								<div className="text-3xl font-medium text-gray-900 dark:text-white leading-relaxed">
									{currentCard.front}
								</div>
							</div>
						) : (
							<div className="text-center">
								<div className="mb-6 text-sm font-semibold uppercase tracking-wide text-teal-600 dark:text-teal-400">
									Back
								</div>
								<div className="text-3xl font-medium text-gray-900 dark:text-white leading-relaxed">
									{currentCard.back}
								</div>
							</div>
						)}
					</div>

					<div className="absolute bottom-6 left-6 text-sm text-gray-500 dark:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
						Click to flip
					</div>
				</div>
			</div>

			{/* Review buttons */}
			<div className="space-y-6">
				{isFlipped ? (
					<div>
						<h3 className="mb-6 text-center text-xl font-semibold text-gray-700 dark:text-gray-300">
							How did you do?
						</h3>
						<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
							<button
								onClick={() => onReview("again")}
								className="px-6 py-4 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
							>
								<div className="text-lg font-semibold">
									Again
								</div>
								<div className="text-sm opacity-90">Poor</div>
							</button>
							<button
								onClick={() => onReview("hard")}
								className="px-6 py-4 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
							>
								<div className="text-lg font-semibold">
									Hard
								</div>
								<div className="text-sm opacity-90">
									Difficult
								</div>
							</button>
							<button
								onClick={() => onReview("good")}
								className="px-6 py-4 bg-green-500 hover:bg-green-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
							>
								<div className="text-lg font-semibold">
									Good
								</div>
								<div className="text-sm opacity-90">
									Correct
								</div>
							</button>
							<button
								onClick={() => onReview("easy")}
								className="px-6 py-4 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
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
							className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
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
