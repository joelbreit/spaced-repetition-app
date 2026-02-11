import { useState, useEffect, useMemo } from 'react';
import {
	Star,
	Flag,
	X,
	BookOpen,
	ChevronDown,
	ChevronUp,
	Link2,
} from 'lucide-react';
import { useAppData } from '../contexts/AppDataContext';

export default function CardEditView({
	appData,
	deckId,
	cardId,
	onSave,
	onCancel,
	onToggleStar,
	onToggleFlag,
}) {
	const { setAppData } = useAppData();
	const [front, setFront] = useState('');
	const [back, setBack] = useState('');
	const [isStarred, setIsStarred] = useState(false);
	const [isFlagged, setIsFlagged] = useState(false);
	const [partnerCardId, setPartnerCardId] = useState(null);
	const [reviews, setReviews] = useState([]);
	const [showReviews, setShowReviews] = useState(false);
	const [updatePartnerCard, setUpdatePartnerCard] = useState(false);
	const [originalCard, setOriginalCard] = useState(null); // Store original card data for comparison

	useEffect(() => {
		if (cardId && deckId) {
			const deck = appData.decks.find((d) => d.deckId === deckId);
			if (deck) {
				const card = deck.cards.find((c) => c.cardId === cardId);
				if (card) {
					// Store original card data for comparison
					setOriginalCard({ front: card.front, back: card.back });
					setFront(card.front);
					setBack(card.back);
					setIsStarred(card.isStarred || false);
					setIsFlagged(card.isFlagged || false);
					setPartnerCardId(card.partnerCardId || null);
					setReviews(card.reviews || []);

					// Check if partner card exists and cards match, then set checkbox default
					const partner = card.partnerCardId
						? deck.cards.find(
								(c) => c.cardId === card.partnerCardId
							)
						: null;
					if (partner) {
						const match =
							card.front.trim() === partner.back.trim() &&
							card.back.trim() === partner.front.trim();
						setUpdatePartnerCard(match);
					} else {
						setUpdatePartnerCard(false);
					}
				}
			}
		} else {
			// Reset for new card
			setOriginalCard(null);
			setFront('');
			setBack('');
			setIsStarred(false);
			setIsFlagged(false);
			setPartnerCardId(null);
			setReviews([]);
			setUpdatePartnerCard(false);
		}
	}, [cardId, deckId, appData]);

	const handleSave = () => {
		if (front.trim() && back.trim()) {
			const trimmedFront = front.trim();
			const trimmedBack = back.trim();

			// Update the current card
			onSave(deckId, cardId, trimmedFront, trimmedBack);

			// If checkbox is checked and partner card exists, update partner card (swap front/back)
			if (updatePartnerCard && partnerCard && partnerCardId) {
				setAppData((prev) => ({
					...prev,
					decks: (prev.decks || []).map((deck) =>
						deck.deckId === deckId
							? {
									...deck,
									cards: deck.cards.map((card) =>
										card.cardId === partnerCardId
											? {
													...card,
													front: trimmedBack,
													back: trimmedFront,
												}
											: card
									),
								}
							: deck
					),
				}));
			}
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
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});
	};

	const formatReviewDuration = (duration) => {
		if (!duration) return 'N/A';
		const seconds = Math.floor(duration / 1000);
		if (seconds < 60) return `${seconds}s`;
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;
		return `${minutes}m ${remainingSeconds}s`;
	};

	const getResultColor = (result) => {
		const colors = {
			again: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20',
			hard: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20',
			good: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20',
			easy: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20',
		};
		return (
			colors[result] ||
			'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20'
		);
	};

	const getPartnerCard = () => {
		if (!partnerCardId || !deckId) return null;
		const deck = appData.decks.find((d) => d.deckId === deckId);
		if (!deck) return null;
		return deck.cards.find((c) => c.cardId === partnerCardId);
	};

	const partnerCard = getPartnerCard();

	// Check if cards match based on original saved state (not current edited state)
	// This card's original front == partner's back, this card's original back == partner's front
	const cardsMatch = useMemo(() => {
		if (!partnerCard || !cardId || !originalCard) return false;
		const originalFront = originalCard.front.trim();
		const originalBack = originalCard.back.trim();
		return (
			originalFront === partnerCard.back.trim() &&
			originalBack === partnerCard.front.trim()
		);
	}, [partnerCard, originalCard, cardId]);

	// Force uncheck if cards don't match (but allow manual toggle when they do match)
	useEffect(() => {
		if (cardId && partnerCard && !cardsMatch) {
			setUpdatePartnerCard(false);
		}
	}, [cardsMatch, cardId, partnerCard]);

	return (
		<div
			className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
			onClick={handleBackdropClick}
		>
			<div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-scale-in">
				{/* Header */}
				<div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/50">
					<h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
						{cardId ? 'Edit Card' : 'Create New Card'}
					</h2>
					<button
						onClick={onCancel}
						className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700"
						aria-label="Close"
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				{/* Scrollable Content */}
				<div className="flex-1 overflow-y-auto">
					<div className="p-6 space-y-6">
						{/* Card Metadata Section */}
						{cardId && (
							<div className="space-y-4">
								{/* Action Buttons Row */}
								<div className="flex items-center gap-2 flex-wrap">
									{/* Star Button */}
									<button
										onClick={handleToggleStar}
										className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 ${
											isStarred
												? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-900/50 shadow-sm'
												: 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-600 hover:text-yellow-600 dark:hover:text-yellow-400'
										}`}
										title={
											isStarred
												? 'Unstar card'
												: 'Star card'
										}
									>
										<Star
											className={`h-4 w-4 ${
												isStarred ? 'fill-current' : ''
											}`}
										/>
										<span className="text-sm font-medium">
											{isStarred ? 'Starred' : 'Star'}
										</span>
									</button>

									{/* Flag Button */}
									<button
										onClick={handleToggleFlag}
										className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 ${
											isFlagged
												? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-900/50 shadow-sm'
												: 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-600 hover:text-orange-600 dark:hover:text-orange-400'
										}`}
										title={
											isFlagged
												? 'Unflag card'
												: 'Flag card'
										}
									>
										<Flag
											className={`h-4 w-4 ${
												isFlagged ? 'fill-current' : ''
											}`}
										/>
										<span className="text-sm font-medium">
											{isFlagged ? 'Flagged' : 'Flag'}
										</span>
									</button>

									{/* Partner Card Indicator */}
									{partnerCard && (
										<div className="inline-flex items-center gap-2 px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg">
											<Link2 className="h-4 w-4" />
											<span className="text-sm font-medium">
												Partner Card
											</span>
										</div>
									)}
								</div>

								{/* Reviews Section */}
								{reviews.length > 0 && (
									<div className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden bg-gray-50/50 dark:bg-slate-900/30">
										<button
											onClick={() =>
												setShowReviews(!showReviews)
											}
											className="w-full flex items-center justify-between p-4 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
										>
											<div className="flex items-center gap-2">
												<BookOpen className="h-4 w-4 text-gray-600 dark:text-slate-400" />
												<span className="text-sm font-semibold text-gray-700 dark:text-slate-300">
													{reviews.length} Review
													{reviews.length !== 1
														? 's'
														: ''}
												</span>
											</div>
											{showReviews ? (
												<ChevronUp className="h-4 w-4 text-gray-500 dark:text-slate-400" />
											) : (
												<ChevronDown className="h-4 w-4 text-gray-500 dark:text-slate-400" />
											)}
										</button>

										{showReviews && (
											<div className="border-t border-gray-200 dark:border-slate-700">
												<div className="max-h-64 overflow-y-auto">
													<div className="divide-y divide-gray-200 dark:divide-slate-700">
														{reviews
															.slice()
															.reverse()
															.map((review) => (
																<div
																	key={
																		review.reviewId
																	}
																	className="p-4 hover:bg-white dark:hover:bg-slate-800/50 transition-colors"
																>
																	<div className="flex items-start gap-3">
																		<span
																			className={`px-2.5 py-1 rounded-md text-xs font-semibold capitalize whitespace-nowrap ${getResultColor(
																				review.result
																			)}`}
																		>
																			{
																				review.result
																			}
																		</span>
																		<div className="flex-1 min-w-0 space-y-1">
																			<p className="text-sm font-medium text-gray-900 dark:text-slate-100">
																				{formatReviewDate(
																					review.timestamp
																				)}
																			</p>
																			<div className="flex items-center gap-3 text-xs text-gray-500 dark:text-slate-400">
																				{review.reviewDuration && (
																					<span>
																						Duration:{' '}
																						{formatReviewDuration(
																							review.reviewDuration
																						)}
																					</span>
																				)}
																				{review.interval && (
																					<span>
																						Interval:{' '}
																						{Math.floor(
																							review.interval /
																								(1000 *
																									60 *
																									60 *
																									24)
																						)}{' '}
																						days
																					</span>
																				)}
																			</div>
																		</div>
																	</div>
																</div>
															))}
													</div>
												</div>
											</div>
										)}
									</div>
								)}
							</div>
						)}

						{/* Form Fields Section */}
						<div className="space-y-6 pt-2">
							{/* Front Input */}
							<div className="space-y-2">
								<label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide">
									Front
								</label>
								<textarea
									value={front}
									onChange={(e) => setFront(e.target.value)}
									placeholder="Enter the front of the card"
									rows={5}
									className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200 resize-y min-h-[120px] font-medium"
								/>
							</div>

							{/* Back Input */}
							<div className="space-y-2">
								<label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide">
									Back
								</label>
								<textarea
									value={back}
									onChange={(e) => setBack(e.target.value)}
									placeholder="Enter the back of the card"
									rows={6}
									className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-y transition-all duration-200 min-h-[140px] font-medium"
								/>
							</div>
						</div>
					</div>
				</div>

				{/* Footer with Buttons */}
				<div className="px-6 py-5 border-t border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/50 space-y-4">
					{/* Partner Card Update Checkbox - only show when editing and partner exists */}
					{cardId && partnerCard && (
						<div className="pb-2">
							<label
								className={`flex items-start gap-3 p-3 rounded-xl transition-all duration-200 ${
									cardsMatch
										? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800'
										: 'cursor-not-allowed'
								}`}
							>
								<input
									type="checkbox"
									checked={updatePartnerCard}
									onChange={(e) =>
										setUpdatePartnerCard(e.target.checked)
									}
									disabled={!cardsMatch}
									className={`mt-0.5 h-5 w-5 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 accent-teal-600 dark:accent-teal-400 ${
										cardsMatch
											? 'border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-teal-400 dark:hover:border-teal-500 cursor-pointer'
											: 'border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-800/50 cursor-not-allowed'
									}`}
								/>
								<div className="flex-1 min-w-0">
									<span
										className={`text-sm font-medium block ${
											cardsMatch
												? 'text-gray-700 dark:text-slate-200'
												: 'text-gray-400 dark:text-slate-500'
										}`}
									>
										Also update partner card (front/back
										reversed)
									</span>
									{!cardsMatch && (
										<p className="text-xs text-gray-500 dark:text-slate-400 mt-1.5 leading-relaxed">
											Disabled: Cards don't match. This
											card's front should equal the
											partner's back, and vice versa.
										</p>
									)}
								</div>
							</label>
						</div>
					)}
					<div className="flex gap-3">
						<button
							onClick={onCancel}
							className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
						>
							Cancel
						</button>
						<button
							onClick={handleSave}
							disabled={!front.trim() || !back.trim()}
							className="flex-1 px-6 py-3 bg-linear-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
						>
							{cardId ? 'Update Card' : 'Create Card'}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
