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
		<div className="mx-auto max-w-3xl">
			{/* Progress bar */}
			<div className="mb-6">
				<div className="mb-2 flex items-center justify-between text-sm">
					<span className="text-gray-600 dark:text-gray-400">
						Card {currentCardIndex + 1} of {deck.cards.length}
					</span>
					<span className="text-gray-600 dark:text-gray-400">
						{Math.round(progress)}%
					</span>
				</div>
				<div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
					<div
						className="h-full bg-blue-600 transition-all duration-300 dark:bg-blue-500"
						style={{ width: `${progress}%` }}
					/>
				</div>
			</div>

			{/* Card */}
			<div className="mb-6">
				<div
					className="relative min-h-[400px] cursor-pointer rounded-lg border-4 border-blue-600 bg-white p-8 shadow-lg transition-all hover:shadow-xl dark:border-blue-500 dark:bg-slate-800"
					onClick={onFlip}
				>
					<div className="flex h-full flex-col justify-center">
						{!isFlipped ? (
							<div className="text-center">
								<div className="mb-4 text-sm font-medium uppercase tracking-wide text-blue-600 dark:text-blue-400">
									Front
								</div>
								<div className="text-2xl font-medium text-gray-900 dark:text-white">
									{currentCard.front}
								</div>
							</div>
						) : (
							<div className="text-center">
								<div className="mb-4 text-sm font-medium uppercase tracking-wide text-blue-600 dark:text-blue-400">
									Back
								</div>
								<div className="text-2xl font-medium text-gray-900 dark:text-white">
									{currentCard.back}
								</div>
							</div>
						)}
					</div>

					<div className="absolute bottom-4 left-4 text-sm text-gray-500 dark:text-gray-400">
						Click to flip
					</div>
				</div>
			</div>

			{/* Review buttons */}
			<div className="space-y-4">
				{isFlipped ? (
					<div>
						<h3 className="mb-3 text-center text-lg font-semibold text-gray-700 dark:text-gray-300">
							How did you do?
						</h3>
						<div className="grid grid-cols-2 gap-3 md:grid-cols-4">
							<button
								onClick={() => onReview("again")}
								className="rounded-md bg-red-600 px-4 py-3 font-medium text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
							>
								<div>Again</div>
								<div className="text-xs opacity-90">Poor</div>
							</button>
							<button
								onClick={() => onReview("hard")}
								className="rounded-md bg-orange-600 px-4 py-3 font-medium text-white hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600"
							>
								<div>Hard</div>
								<div className="text-xs opacity-90">
									Difficult
								</div>
							</button>
							<button
								onClick={() => onReview("good")}
								className="rounded-md bg-green-600 px-4 py-3 font-medium text-white hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
							>
								<div>Good</div>
								<div className="text-xs opacity-90">
									Correct
								</div>
							</button>
							<button
								onClick={() => onReview("easy")}
								className="rounded-md bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
							>
								<div>Easy</div>
								<div className="text-xs opacity-90">Simple</div>
							</button>
						</div>
					</div>
				) : (
					<div className="text-center">
						<button
							onClick={onFlip}
							className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
						>
							<RotateCcw className="h-5 w-5" />
							Show Answer
						</button>
					</div>
				)}

				{/* Action buttons */}
				<div className="flex justify-center gap-3">
					<button
						onClick={() => onEditCard(currentCard.cardId)}
						className="flex items-center gap-2 rounded-md bg-gray-600 px-4 py-2 text-white hover:bg-gray-700 dark:bg-gray-500 dark:hover:bg-gray-600"
					>
						<Edit className="h-4 w-4" />
						Edit Card
					</button>
					<button
						onClick={onEndReview}
						className="flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
					>
						<X className="h-4 w-4" />
						End Review
					</button>
				</div>
			</div>
		</div>
	);
}
