import { useState } from "react";
import { Plus, Edit, Trash2, Play, ArrowLeft, Search } from "lucide-react";

export default function DeckView({
	appData,
	selectedDeckId,
	onSelectDeck,
	onAddDeck,
	onUpdateDeck,
	onDeleteDeck,
	onAddCard,
	onUpdateCard,
	onDeleteCard,
	onEditCard,
	onStartReview,
}) {
	const [newDeckName, setNewDeckName] = useState("");
	const [editingDeckId, setEditingDeckId] = useState(null);
	const [editingDeckName, setEditingDeckName] = useState("");
	const [showNewDeckForm, setShowNewDeckForm] = useState(false);
	const [newCardFront, setNewCardFront] = useState("");
	const [newCardBack, setNewCardBack] = useState("");
	const [showNewCardForm, setShowNewCardForm] = useState(false);
	const [searchTerm, setSearchTerm] = useState("");

	const selectedDeck = selectedDeckId
		? appData.decks.find((d) => d.deckId === selectedDeckId)
		: null;

	const filteredDecks = appData.decks.filter((deck) =>
		deck.deckName.toLowerCase().includes(searchTerm.toLowerCase())
	);

	const handleAddDeck = () => {
		if (newDeckName.trim()) {
			onAddDeck(newDeckName.trim());
			setNewDeckName("");
			setShowNewDeckForm(false);
		}
	};

	const handleUpdateDeck = () => {
		if (editingDeckName.trim()) {
			onUpdateDeck(editingDeckId, editingDeckName.trim());
			setEditingDeckId(null);
			setEditingDeckName("");
		}
	};

	const handleDeleteDeck = (deckId) => {
		if (
			window.confirm(
				"Are you sure you want to delete this deck and all its cards?"
			)
		) {
			onDeleteDeck(deckId);
		}
	};

	const handleAddCard = () => {
		if (newCardFront.trim() && newCardBack.trim()) {
			onAddCard(selectedDeckId, newCardFront.trim(), newCardBack.trim());
			setNewCardFront("");
			setNewCardBack("");
			setShowNewCardForm(false);
		}
	};

	const handleDeleteCard = (cardId) => {
		if (window.confirm("Are you sure you want to delete this card?")) {
			onDeleteCard(selectedDeckId, cardId);
		}
	};

	return (
		<div>
			{selectedDeckId && selectedDeck ? (
				// Show cards in selected deck
				<div>
					<div className="mb-4 flex items-center justify-between">
						<button
							onClick={() => onSelectDeck(null)}
							className="flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
						>
							<ArrowLeft className="h-5 w-5" />
							Back to Decks
						</button>
					</div>

					<div className="rounded-lg bg-white p-6 shadow dark:bg-slate-800">
						<div className="mb-4 flex items-center justify-between">
							<h2 className="text-2xl font-bold">
								{selectedDeck.deckName}
							</h2>
							<button
								onClick={() => onStartReview(selectedDeckId)}
								className="flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
							>
								<Play className="h-5 w-5" />
								Start Review
							</button>
						</div>

						<div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
							{selectedDeck.cards.length} card(s)
						</div>

						{/* Add Card Form */}
						{showNewCardForm ? (
							<div className="mb-4 rounded-lg border-2 border-dashed border-gray-300 p-4 dark:border-gray-600">
								<h3 className="mb-3 font-semibold">
									Add New Card
								</h3>
								<div className="space-y-3">
									<input
										type="text"
										placeholder="Front"
										value={newCardFront}
										onChange={(e) =>
											setNewCardFront(e.target.value)
										}
										className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-slate-700"
									/>
									<textarea
										placeholder="Back"
										value={newCardBack}
										onChange={(e) =>
											setNewCardBack(e.target.value)
										}
										rows={3}
										className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-slate-700"
									/>
									<div className="flex gap-2">
										<button
											onClick={handleAddCard}
											className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
										>
											Add Card
										</button>
										<button
											onClick={() => {
												setShowNewCardForm(false);
												setNewCardFront("");
												setNewCardBack("");
											}}
											className="rounded-md bg-gray-300 px-4 py-2 hover:bg-gray-400 dark:bg-slate-600 dark:hover:bg-slate-500"
										>
											Cancel
										</button>
									</div>
								</div>
							</div>
						) : (
							<button
								onClick={() => setShowNewCardForm(true)}
								className="mb-4 flex items-center gap-2 rounded-md border-2 border-dashed border-gray-400 px-4 py-2 text-gray-600 hover:border-blue-600 hover:text-blue-600 dark:border-gray-600 dark:text-gray-400 dark:hover:border-blue-500 dark:hover:text-blue-400"
							>
								<Plus className="h-5 w-5" />
								Add New Card
							</button>
						)}

						{/* Cards List */}
						<div className="space-y-3">
							{selectedDeck.cards.length === 0 ? (
								<div className="py-8 text-center text-gray-500 dark:text-gray-400">
									No cards yet. Add your first card!
								</div>
							) : (
								selectedDeck.cards.map((card) => (
									<div
										key={card.cardId}
										className="flex items-center justify-between rounded-lg border border-gray-200 p-4 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-slate-700"
									>
										<div className="flex-1">
											<div className="font-medium">
												<span className="text-gray-600 dark:text-gray-400">
													Front:{" "}
												</span>
												{card.front}
											</div>
											<div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
												<span className="text-gray-600 dark:text-gray-400">
													Back:{" "}
												</span>
												{card.back}
											</div>
											<div className="mt-2 text-xs text-gray-500 dark:text-gray-500">
												{card.reviews.length} review(s)
											</div>
										</div>
										<div className="flex gap-2">
											<button
												onClick={() =>
													onEditCard(
														selectedDeckId,
														card.cardId
													)
												}
												className="rounded-md bg-blue-600 p-2 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
											>
												<Edit className="h-4 w-4" />
											</button>
											<button
												onClick={() =>
													handleDeleteCard(
														card.cardId
													)
												}
												className="rounded-md bg-red-600 p-2 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
											>
												<Trash2 className="h-4 w-4" />
											</button>
										</div>
									</div>
								))
							)}
						</div>
					</div>
				</div>
			) : (
				// Show list of decks
				<div>
					<h2 className="mb-4 text-2xl font-bold">Your Decks</h2>

					{/* Search */}
					<div className="mb-4 flex items-center gap-2">
						<Search className="h-5 w-5 text-gray-400" />
						<input
							type="text"
							placeholder="Search decks..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="flex-1 rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-slate-700"
						/>
					</div>

					{/* Add Deck Form */}
					{showNewDeckForm ? (
						<div className="mb-4 rounded-lg border-2 border-dashed border-gray-300 p-4 dark:border-gray-600">
							<h3 className="mb-3 font-semibold">
								Create New Deck
							</h3>
							<div className="flex gap-2">
								<input
									type="text"
									placeholder="Deck name"
									value={newDeckName}
									onChange={(e) =>
										setNewDeckName(e.target.value)
									}
									className="flex-1 rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-slate-700"
								/>
								<button
									onClick={handleAddDeck}
									className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
								>
									Create
								</button>
								<button
									onClick={() => {
										setShowNewDeckForm(false);
										setNewDeckName("");
									}}
									className="rounded-md bg-gray-300 px-4 py-2 hover:bg-gray-400 dark:bg-slate-600 dark:hover:bg-slate-500"
								>
									Cancel
								</button>
							</div>
						</div>
					) : (
						<button
							onClick={() => setShowNewDeckForm(true)}
							className="mb-4 flex items-center gap-2 rounded-md border-2 border-dashed border-gray-400 px-4 py-2 text-gray-600 hover:border-blue-600 hover:text-blue-600 dark:border-gray-600 dark:text-gray-400 dark:hover:border-blue-500 dark:hover:text-blue-400"
						>
							<Plus className="h-5 w-5" />
							Create New Deck
						</button>
					)}

					{/* Decks Grid */}
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
						{filteredDecks.length === 0 ? (
							<div className="col-span-full py-8 text-center text-gray-500 dark:text-gray-400">
								{searchTerm
									? "No decks found matching your search."
									: "No decks yet. Create your first deck!"}
							</div>
						) : (
							filteredDecks.map((deck) => (
								<div
									key={deck.deckId}
									className="rounded-lg bg-white p-6 shadow transition hover:shadow-md dark:bg-slate-800"
								>
									{editingDeckId === deck.deckId ? (
										<div>
											<input
												type="text"
												value={editingDeckName}
												onChange={(e) =>
													setEditingDeckName(
														e.target.value
													)
												}
												className="mb-2 w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-slate-700"
											/>
											<div className="flex gap-2">
												<button
													onClick={handleUpdateDeck}
													className="flex-1 rounded-md bg-green-600 px-3 py-1 text-white hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
												>
													Save
												</button>
												<button
													onClick={() => {
														setEditingDeckId(null);
														setEditingDeckName("");
													}}
													className="flex-1 rounded-md bg-gray-300 px-3 py-1 hover:bg-gray-400 dark:bg-slate-600 dark:hover:bg-slate-500"
												>
													Cancel
												</button>
											</div>
										</div>
									) : (
										<>
											<h3
												className="mb-2 cursor-pointer text-xl font-semibold hover:text-blue-600 dark:hover:text-blue-400"
												onClick={() =>
													onSelectDeck(deck.deckId)
												}
											>
												{deck.deckName}
											</h3>
											<p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
												{deck.cards.length} card(s)
											</p>
											<div className="flex gap-2">
												<button
													onClick={() =>
														onSelectDeck(
															deck.deckId
														)
													}
													className="flex-1 rounded-md bg-blue-600 px-3 py-2 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
												>
													View
												</button>
												<button
													onClick={() =>
														onStartReview(
															deck.deckId
														)
													}
													className="flex-1 rounded-md bg-green-600 px-3 py-2 text-white hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
												>
													Review
												</button>
												<button
													onClick={() => {
														setEditingDeckId(
															deck.deckId
														);
														setEditingDeckName(
															deck.deckName
														);
													}}
													className="rounded-md bg-gray-600 p-2 text-white hover:bg-gray-700 dark:bg-gray-500 dark:hover:bg-gray-600"
												>
													<Edit className="h-4 w-4" />
												</button>
												<button
													onClick={() =>
														handleDeleteDeck(
															deck.deckId
														)
													}
													className="rounded-md bg-red-600 p-2 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
												>
													<Trash2 className="h-4 w-4" />
												</button>
											</div>
										</>
									)}
								</div>
							))
						)}
					</div>
				</div>
			)}
		</div>
	);
}
