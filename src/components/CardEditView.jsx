import { useState, useEffect } from "react";

export default function CardEditView({
	appData,
	deckId,
	cardId,
	onSave,
	onCancel,
}) {
	const [front, setFront] = useState("");
	const [back, setBack] = useState("");

	useEffect(() => {
		if (cardId && deckId) {
			const deck = appData.decks.find((d) => d.deckId === deckId);
			if (deck) {
				const card = deck.cards.find((c) => c.cardId === cardId);
				if (card) {
					setFront(card.front);
					setBack(card.back);
				}
			}
		}
	}, [cardId, deckId, appData]);

	const handleSave = () => {
		if (front.trim() && back.trim()) {
			onSave(deckId, cardId, front.trim(), back.trim());
		}
	};

	return (
		<div className="mx-auto max-w-2xl">
			<div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 p-8 hover:shadow-xl transition-shadow duration-300">
				<h2 className="mb-8 text-3xl font-bold text-gray-900 dark:text-slate-100">
					{cardId ? "Edit Card" : "Create New Card"}
				</h2>

				<div className="space-y-6">
					<div>
						<label className="mb-3 block text-sm font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wide">
							Front
						</label>
						<input
							type="text"
							value={front}
							onChange={(e) => setFront(e.target.value)}
							placeholder="Enter the front of the card"
							className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200"
						/>
					</div>

					<div>
						<label className="mb-3 block text-sm font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wide">
							Back
						</label>
						<textarea
							value={back}
							onChange={(e) => setBack(e.target.value)}
							placeholder="Enter the back of the card"
							rows={5}
							className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none transition-all duration-200"
						/>
					</div>

					<div className="flex gap-4 pt-6">
						<button
							onClick={handleSave}
							disabled={!front.trim() || !back.trim()}
							className="flex-1 px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
						>
							{cardId ? "Update Card" : "Create Card"}
						</button>
						<button
							onClick={onCancel}
							className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 font-medium rounded-xl transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
						>
							Cancel
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
