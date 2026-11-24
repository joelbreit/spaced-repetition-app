import { useState, useEffect } from 'react';
import {
	Star,
	Flag,
	X,
	BookOpen,
	ChevronDown,
	ChevronUp,
	Link2,
} from 'lucide-react';
import ClozeFields from './ClozeFields';
import { clozeOrds } from '../services/cloze';

export default function CardEditView({
	appData,
	deckId,
	cardId,
	onSave,
	onCancel,
	onToggleStar,
	onToggleFlag,
}) {
	const [front, setFront] = useState('');
	const [back, setBack] = useState('');
	const [isStarred, setIsStarred] = useState(false);
	const [isFlagged, setIsFlagged] = useState(false);
	const [partnerCardId, setPartnerCardId] = useState(null);
	const [reviews, setReviews] = useState([]);
	const [showReviews, setShowReviews] = useState(false);
	// For a cloze card: its number, and its note's numbers as saved. Its
	// note's text is edited in `front`, the extra in `back`.
	const [clozeOrd, setClozeOrd] = useState(null);
	const [savedOrds, setSavedOrds] = useState([]);
	const [noteId, setNoteId] = useState(null);

	useEffect(() => {
		if (cardId && deckId) {
			const deck = appData.decks.find((d) => d.deckId === deckId);
			if (deck) {
				const card = deck.cards.find((c) => c.cardId === cardId);
				if (card) {
					const isCloze = card.template === 'cloze';
					setFront(isCloze ? card.clozeText : card.front);
					setBack(isCloze ? card.clozeExtra || '' : card.back);
					setClozeOrd(isCloze ? card.ord : null);
					setSavedOrds(isCloze ? clozeOrds(card.clozeText) : []);
					setNoteId(card.noteId || null);
					setIsStarred(card.isStarred || false);
					setIsFlagged(card.isFlagged || false);
					setPartnerCardId(card.partnerCardId || null);
					setReviews(card.reviews || []);
				}
			}
		} else {
			// Reset for new card
			setFront('');
			setBack('');
			setIsStarred(false);
			setIsFlagged(false);
			setPartnerCardId(null);
			setReviews([]);
			setClozeOrd(null);
			setSavedOrds([]);
			setNoteId(null);
		}
	}, [cardId, deckId, appData]);

	const handleSave = () => {
		if (clozeOrd) {
			// Saves the note: all its cloze cards change, and numbers added
			// or removed add or delete cards
			if (clozeOrds(front).length === 0) return;
			onSave(deckId, cardId, front.trim(), back.trim());
			return;
		}
		if (front.trim() && back.trim()) {
			const trimmedFront = front.trim();
			const trimmedBack = back.trim();

			// Saves the card's note, so a reversed partner updates with it
			onSave(deckId, cardId, trimmedFront, trimmedBack);
		}
	};

	// Escape cancels, Ctrl/Cmd+Enter saves, from anywhere in the editor.
	// Re-subscribed each render so it always sees the latest text.
	useEffect(() => {
		const handleKeyDown = (event) => {
			if (event.key === 'Escape') {
				event.preventDefault();
				onCancel();
			} else if (
				event.key === 'Enter' &&
				(event.ctrlKey || event.metaKey)
			) {
				event.preventDefault();
				handleSave();
			}
		};
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	});

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
			forgot: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20',
			sooner: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20',
			right: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20',
			later: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20',
		};
		return (
			colors[result] ||
			'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20'
		);
	};

	// Other cloze cards of the same note, in any deck
	const siblingCount = noteId
		? appData.decks
				.flatMap((d) => d.cards || [])
				.filter((c) => c.noteId === noteId && c.cardId !== cardId)
				.length
		: 0;

	// Partners share a note, so they can be in different decks
	const partnerCard = partnerCardId
		? appData.decks
				.flatMap((d) => d.cards || [])
				.find((c) => c.cardId === partnerCardId)
		: null;

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
						{clozeOrd ? (
							<div className="space-y-2 pt-2">
								<label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide">
									Cloze text{' '}
									<span className="normal-case font-normal text-gray-500 dark:text-slate-400">
										(this card hides c{clozeOrd})
									</span>
								</label>
								<ClozeFields
									text={front}
									onTextChange={setFront}
									extra={back}
									onExtraChange={setBack}
									savedOrds={savedOrds}
									rows={6}
								/>
							</div>
						) : (
							<div className="space-y-6 pt-2">
								{/* Front Input */}
								<div className="space-y-2">
									<label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide">
										Front
									</label>
									<textarea
										value={front}
										onChange={(e) =>
											setFront(e.target.value)
										}
										autoFocus={!cardId}
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
										onChange={(e) =>
											setBack(e.target.value)
										}
										placeholder="Enter the back of the card"
										rows={6}
										className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-y transition-all duration-200 min-h-[140px] font-medium"
									/>
								</div>
							</div>
						)}
					</div>
				</div>

				{/* Footer with Buttons */}
				<div className="px-6 py-5 border-t border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/50 space-y-4">
					{clozeOrd && siblingCount > 0 && (
						<p className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
							<Link2 className="h-4 w-4 shrink-0" />
							This note's other{' '}
							{siblingCount === 1
								? 'cloze card shares this text and updates'
								: `${siblingCount} cloze cards share this text and update`}{' '}
							with it.
						</p>
					)}
					{cardId && partnerCard && (
						<p className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
							<Link2 className="h-4 w-4 shrink-0" />
							Its partner card shares this text, front and back
							reversed, and updates with it.
						</p>
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
							disabled={
								clozeOrd
									? clozeOrds(front).length === 0
									: !front.trim() || !back.trim()
							}
							className="flex-1 px-6 py-3 bg-linear-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
						>
							{cardId ? 'Update Card' : 'Create Card'}
						</button>
					</div>
					<p className="hidden pointer-fine:block text-center text-xs text-gray-400 dark:text-slate-500">
						Ctrl/⌘ + Enter to save · Esc to cancel
					</p>
				</div>
			</div>
		</div>
	);
}
