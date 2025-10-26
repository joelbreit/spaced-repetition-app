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
			<div className="rounded-lg bg-white p-6 shadow dark:bg-slate-800">
				<h2 className="mb-6 text-2xl font-bold">
					{cardId ? "Edit Card" : "Create New Card"}
				</h2>

				<div className="space-y-4">
					<div>
						<label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
							Front
						</label>
						<input
							type="text"
							value={front}
							onChange={(e) => setFront(e.target.value)}
							placeholder="Enter the front of the card"
							className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-600 dark:bg-slate-700 dark:text-white dark:focus:border-blue-400 dark:focus:ring-blue-800"
						/>
					</div>

					<div>
						<label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
							Back
						</label>
						<textarea
							value={back}
							onChange={(e) => setBack(e.target.value)}
							placeholder="Enter the back of the card"
							rows={5}
							className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-600 dark:bg-slate-700 dark:text-white dark:focus:border-blue-400 dark:focus:ring-blue-800"
						/>
					</div>

					<div className="flex gap-3 pt-4">
						<button
							onClick={handleSave}
							disabled={!front.trim() || !back.trim()}
							className="flex-1 rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
						>
							{cardId ? "Update Card" : "Create Card"}
						</button>
						<button
							onClick={onCancel}
							className="flex-1 rounded-md bg-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-400 dark:bg-slate-600 dark:text-gray-200 dark:hover:bg-slate-500"
						>
							Cancel
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
