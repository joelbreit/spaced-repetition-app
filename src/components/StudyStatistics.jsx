export default function StudyStatistics({ appData }) {
	const allCards = appData.decks.flatMap((deck) => deck.cards);
	const totalCards = allCards.length;
	const totalDecks = appData.decks.length;
	const cardsDue = allCards.filter(
		(card) => card.whenDue <= Date.now()
	).length;
	const newCards = allCards.filter(
		(card) => card.reviews.length === 0
	).length;
	const studiedCards = allCards.filter(
		(card) => card.reviews.length > 0
	).length;
	const totalReviews = allCards.reduce(
		(sum, card) => sum + card.reviews.length,
		0
	);
	const avgReviewsPerCard =
		totalCards > 0 ? (totalReviews / totalCards).toFixed(1) : 0;
	const masteryPercentage =
		totalCards > 0 ? ((studiedCards / totalCards) * 100).toFixed(0) : 0;

	return (
		<div className="mb-8 bg-linear-to-br from-teal-500 via-teal-600 to-cyan-600 rounded-2xl p-8 text-white shadow-2xl animate-fade-in">
			<h2 className="text-3xl font-bold mb-6">
				Your Study Statistics 📊
			</h2>
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
				<div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
					<div className="text-3xl font-bold mb-1">{totalDecks}</div>
					<div className="text-teal-100 text-sm">Total Decks</div>
				</div>
				<div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
					<div className="text-3xl font-bold mb-1">{totalCards}</div>
					<div className="text-teal-100 text-sm">Total Cards</div>
				</div>
				<div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
					<div className="text-3xl font-bold mb-1 text-orange-200">
						{cardsDue}
					</div>
					<div className="text-teal-100 text-sm">Due Now</div>
				</div>
				<div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
					<div className="text-3xl font-bold mb-1 text-yellow-200">
						{newCards}
					</div>
					<div className="text-teal-100 text-sm">New Cards</div>
				</div>
				<div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
					<div className="text-3xl font-bold mb-1 text-green-200">
						{studiedCards}
					</div>
					<div className="text-teal-100 text-sm">Studied</div>
				</div>
				<div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
					<div className="text-3xl font-bold mb-1">
						{totalReviews}
					</div>
					<div className="text-teal-100 text-sm">Total Reviews</div>
				</div>
				<div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
					<div className="text-3xl font-bold mb-1">
						{avgReviewsPerCard}
					</div>
					<div className="text-teal-100 text-sm">
						Avg Reviews/Card
					</div>
				</div>
				<div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
					<div className="text-3xl font-bold mb-1 text-emerald-200">
						{masteryPercentage}%
					</div>
					<div className="text-teal-100 text-sm">Mastery</div>
				</div>
			</div>
		</div>
	);
}
