import { useState, useEffect } from "react";
import {
	Star,
	Flag,
	X,
	BookOpen,
	ChevronDown,
	ChevronUp,
	Link2,
} from "lucide-react";

export default function CardEditView({
	appData,
	deckId,
	cardId,
	onSave,
	onCancel,
	onToggleStar,
	onToggleFlag,
}) {
	const [front, setFront] = useState("");
	const [back, setBack] = useState("");
	const [isStarred, setIsStarred] = useState(false);
	const [isFlagged, setIsFlagged] = useState(false);
	const [partnerCardId, setPartnerCardId] = useState(null);
	const [reviews, setReviews] = useState([]);
	const [showReviews, setShowReviews] = useState(false);

	useEffect(() => {
		if (cardId && deckId) {
			const deck = appData.decks.find((d) => d.deckId === deckId);
			if (deck) {
				const card = deck.cards.find((c) => c.cardId === cardId);
				if (card) {
					setFront(card.front);
					setBack(card.back);
					setIsStarred(card.isStarred || false);
					setIsFlagged(card.isFlagged || false);
					setPartnerCardId(card.partnerCardId || null);
					setReviews(card.reviews || []);
				}
			}
		} else {
			// Reset for new card
			setFront("");
			setBack("");
			setIsStarred(false);
			setIsFlagged(false);
			setPartnerCardId(null);
			setReviews([]);
		}
	}, [cardId, deckId, appData]);

	const handleSave = () => {
		if (front.trim() && back.trim()) {
			onSave(deckId, cardId, front.trim(), back.trim());
		}
	};

	const handleToggleStar = () => {
		if (cardId && onToggleStar) {
			onToggleStar(deckId, cardId);
		}
	};

	const handleToggleFlag = () => {
		if (cardId && onToggleFlag) {
			onToggleFlag(deckId, cardId);
		}
	};

	const handleBackdropClick = (e) => {
		if (e.target === e.currentTarget) {
			onCancel();
		}
	};

	const formatReviewDate = (timestamp) => {
		const date = new Date(timestamp);
		return date.toLocaleString(undefined, {
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const formatReviewDuration = (duration) => {
		if (!duration) return "N/A";
		const seconds = Math.floor(duration / 1000);
		if (seconds < 60) return `${seconds}s`;
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;
		return `${minutes}m ${remainingSeconds}s`;
	};

	const getResultColor = (result) => {
		const colors = {
			again: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20",
			hard: "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20",
			good: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20",
			easy: "text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20",
		};
		return (
			colors[result] ||
			"text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20"
		);
	};

	const getPartnerCard = () => {
		if (!partnerCardId || !deckId) return null;
		const deck = appData.decks.find((d) => d.deckId === deckId);
		if (!deck) return null;
		return deck.cards.find((c) => c.cardId === partnerCardId);
	};

	const partnerCard = getPartnerCard();

	return (
		<div
			className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
			onClick={handleBackdropClick}
		>
			<div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
					<h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
						{cardId ? "Edit Card" : "Create New Card"}
					</h2>
					<button
						onClick={onCancel}
						className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"
						aria-label="Close"
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				{/* Scrollable Content */}
				<div className="flex-1 overflow-y-auto p-6">
					<div className="space-y-6">
						{/* Card Indicators Row */}
						{cardId && (
							<div className="flex items-center gap-3 flex-wrap">
								{/* Star Button */}
								<button
									onClick={handleToggleStar}
									className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 ${
										isStarred
											? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-900/50"
											: "bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-slate-500 hover:bg-gray-200 dark:hover:bg-slate-600 hover:text-yellow-500 dark:hover:text-yellow-400"
									}`}
									title={
										isStarred ? "Unstar card" : "Star card"
									}
								>
									<Star
										className={`h-4 w-4 ${
											isStarred ? "fill-current" : ""
										}`}
									/>
									<span className="text-sm font-medium">
										{isStarred ? "Starred" : "Star"}
									</span>
								</button>

								{/* Flag Button */}
								<button
									onClick={handleToggleFlag}
									className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 ${
										isFlagged
											? "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-900/50"
											: "bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-slate-500 hover:bg-gray-200 dark:hover:bg-slate-600 hover:text-orange-500 dark:hover:text-orange-400"
									}`}
									title={
										isFlagged ? "Unflag card" : "Flag card"
									}
								>
									<Flag
										className={`h-4 w-4 ${
											isFlagged ? "fill-current" : ""
										}`}
									/>
									<span className="text-sm font-medium">
										{isFlagged ? "Flagged" : "Flag"}
									</span>
								</button>

								{/* Partner Card Indicator */}
								{partnerCard && (
									<div className="flex items-center gap-2 px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
										<Link2 className="h-4 w-4" />
										<span className="text-sm font-medium">
											Has Partner Card
										</span>
									</div>
								)}

								{/* Reviews Indicator */}
								<button
									onClick={() => setShowReviews(!showReviews)}
									className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
								>
									<BookOpen className="h-4 w-4" />
									<span className="text-sm font-medium">
										{reviews.length} Review
										{reviews.length !== 1 ? "s" : ""}
									</span>
									{reviews.length > 0 &&
										(showReviews ? (
											<ChevronUp className="h-4 w-4" />
										) : (
											<ChevronDown className="h-4 w-4" />
										))}
								</button>
							</div>
						)}

						{/* Reviews List */}
						{cardId && showReviews && reviews.length > 0 && (
							<div className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
								<div className="max-h-64 overflow-y-auto">
									<div className="divide-y divide-gray-200 dark:divide-slate-700">
										{reviews
											.slice()
											.reverse()
											.map((review) => (
												<div
													key={review.reviewId}
													className="p-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
												>
													<div className="flex items-start justify-between gap-4">
														<div className="flex-1 min-w-0">
															<div className="flex items-center gap-2 mb-2">
																<span
																	className={`px-2 py-1 rounded text-xs font-medium capitalize ${getResultColor(
																		review.result
																	)}`}
																>
																	{
																		review.result
																	}
																</span>
																{review.reviewDuration && (
																	<span className="text-xs text-gray-500 dark:text-slate-400">
																		{formatReviewDuration(
																			review.reviewDuration
																		)}
																	</span>
																)}
															</div>
															<p className="text-sm text-gray-600 dark:text-slate-400">
																{formatReviewDate(
																	review.timestamp
																)}
															</p>
															{review.interval && (
																<p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
																	Interval:{" "}
																	{Math.floor(
																		review.interval /
																			(1000 *
																				60 *
																				60 *
																				24)
																	)}{" "}
																	days
																</p>
															)}
														</div>
													</div>
												</div>
											))}
									</div>
								</div>
							</div>
						)}

						{/* Front Input */}
						<div>
							<label className="mb-3 block text-sm font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wide">
								Front
							</label>
							<textarea
								value={front}
								onChange={(e) => setFront(e.target.value)}
								placeholder="Enter the front of the card"
								rows={4}
								className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200 resize-y min-h-[100px]"
							/>
						</div>

						{/* Back Input */}
						<div>
							<label className="mb-3 block text-sm font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wide">
								Back
							</label>
							<textarea
								value={back}
								onChange={(e) => setBack(e.target.value)}
								placeholder="Enter the back of the card"
								rows={5}
								className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-y transition-all duration-200 min-h-[120px]"
							/>
						</div>
					</div>
				</div>

				{/* Footer with Buttons */}
				<div className="p-6 border-t border-gray-200 dark:border-slate-700">
					<div className="flex gap-4">
						<button
							onClick={onCancel}
							className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 font-medium rounded-xl transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
						>
							Cancel
						</button>
						<button
							onClick={handleSave}
							disabled={!front.trim() || !back.trim()}
							className="flex-1 px-6 py-3 bg-linear-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
						>
							{cardId ? "Update Card" : "Create Card"}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
