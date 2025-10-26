import { useState } from "react";
import {
	Plus,
	Edit,
	Trash2,
	Play,
	ArrowLeft,
	Search,
	BookOpen,
} from "lucide-react";

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
					<div className="mb-6 flex items-center justify-between">
						<button
							onClick={() => onSelectDeck(null)}
							className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors duration-200"
						>
							<ArrowLeft className="h-5 w-5" />
							Back to Decks
						</button>
					</div>

					<div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 p-6 hover:shadow-xl transition-shadow duration-300">
						<div className="mb-6 flex items-center justify-between">
							<div className="flex items-center gap-3">
								<span className="text-4xl">📚</span>
								<div>
									<h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
										{selectedDeck.deckName}
									</h2>
									<p className="text-sm text-gray-600 dark:text-slate-400">
										{selectedDeck.cards.length} card(s)
									</p>
								</div>
							</div>
							<button
								onClick={() => onStartReview(selectedDeckId)}
								className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
							>
								<Play className="h-5 w-5" />
								Study Now
							</button>
						</div>

						{/* Add Card Form */}
						{showNewCardForm ? (
							<div className="mb-6 rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-700 p-6 bg-gray-50 dark:bg-slate-700/50">
								<h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-slate-100">
									Add New Card
								</h3>
								<div className="space-y-4">
									<input
										type="text"
										placeholder="Front of card..."
										value={newCardFront}
										onChange={(e) =>
											setNewCardFront(e.target.value)
										}
										className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200"
									/>
									<textarea
										placeholder="Back of card..."
										value={newCardBack}
										onChange={(e) =>
											setNewCardBack(e.target.value)
										}
										rows={4}
										className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none transition-all duration-200"
									/>
									<div className="flex gap-3">
										<button
											onClick={handleAddCard}
											className="px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
										>
											Add Card
										</button>
										<button
											onClick={() => {
												setShowNewCardForm(false);
												setNewCardFront("");
												setNewCardBack("");
											}}
											className="px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 font-medium rounded-xl transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
										>
											Cancel
										</button>
									</div>
								</div>
							</div>
						) : (
							<button
								onClick={() => setShowNewCardForm(true)}
								className="mb-6 flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors duration-200"
							>
								<Plus className="h-5 w-5" />
								Add New Card
							</button>
						)}

						{/* Cards List */}
						<div className="space-y-4">
							{selectedDeck.cards.length === 0 ? (
								<div className="py-12 text-center">
									<div className="text-6xl mb-4">📝</div>
									<p className="text-lg text-gray-500 dark:text-gray-400 mb-2">
										No cards yet
									</p>
									<p className="text-sm text-gray-400 dark:text-gray-500">
										Add your first card to get started!
									</p>
								</div>
							) : (
								selectedDeck.cards.map((card) => (
									<div
										key={card.cardId}
										className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-4 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer group"
									>
										<div className="flex items-start justify-between">
											<div className="flex-1">
												<div className="mb-2">
													<h4 className="text-sm font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wide mb-1">
														Front
													</h4>
													<p className="text-base text-gray-900 dark:text-slate-100 font-medium">
														{card.front}
													</p>
												</div>
												<div className="mb-3">
													<h4 className="text-sm font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wide mb-1">
														Back
													</h4>
													<p className="text-base text-gray-700 dark:text-slate-300">
														{card.back}
													</p>
												</div>
												<div className="flex items-center gap-2">
													<span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 text-xs font-medium rounded-md">
														<BookOpen className="h-3 w-3" />
														{card.reviews.length}{" "}
														reviews
													</span>
												</div>
											</div>
											<div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
												<button
													onClick={() =>
														onEditCard(
															selectedDeckId,
															card.cardId
														)
													}
													className="p-2 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors duration-200"
												>
													<Edit className="h-4 w-4" />
												</button>
												<button
													onClick={() =>
														handleDeleteCard(
															card.cardId
														)
													}
													className="p-2 text-gray-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors duration-200"
												>
													<Trash2 className="h-4 w-4" />
												</button>
											</div>
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
					{/* Hero Section */}
					<div className="mb-8 bg-gradient-to-br from-teal-500 via-teal-600 to-cyan-600 rounded-2xl p-8 text-white shadow-2xl animate-fade-in">
						<h2 className="text-3xl font-bold mb-2">
							Welcome back! 👋
						</h2>
						<p className="text-teal-100 text-lg">
							You have{" "}
							{appData.decks.reduce(
								(total, deck) => total + deck.cards.length,
								0
							)}{" "}
							cards across {appData.decks.length} decks
						</p>
					</div>

					{/* Search */}
					<div className="mb-6 flex items-center gap-3">
						<div className="relative flex-1">
							<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
							<input
								type="text"
								placeholder="Search decks..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200"
							/>
						</div>
					</div>

					{/* Add Deck Form */}
					{showNewDeckForm ? (
						<div className="mb-6 rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-700 p-6 bg-gray-50 dark:bg-slate-700/50">
							<h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-slate-100">
								Create New Deck
							</h3>
							<div className="flex gap-3">
								<input
									type="text"
									placeholder="Deck name..."
									value={newDeckName}
									onChange={(e) =>
										setNewDeckName(e.target.value)
									}
									className="flex-1 px-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200"
								/>
								<button
									onClick={handleAddDeck}
									className="px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
								>
									Create
								</button>
								<button
									onClick={() => {
										setShowNewDeckForm(false);
										setNewDeckName("");
									}}
									className="px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 font-medium rounded-xl transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
								>
									Cancel
								</button>
							</div>
						</div>
					) : (
						<button
							onClick={() => setShowNewDeckForm(true)}
							className="mb-6 flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors duration-200"
						>
							<Plus className="h-5 w-5" />
							Create New Deck
						</button>
					)}

					{/* Decks Grid */}
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{filteredDecks.length === 0 ? (
							<div className="col-span-full py-12 text-center animate-fade-in">
								<div className="text-6xl mb-4">📚</div>
								<p className="text-lg text-gray-500 dark:text-gray-400 mb-2">
									{searchTerm
										? "No decks found matching your search."
										: "No decks yet. Create your first deck!"}
								</p>
								{!searchTerm && (
									<p className="text-sm text-gray-400 dark:text-gray-500">
										Start building your knowledge base!
									</p>
								)}
							</div>
						) : (
							filteredDecks.map((deck, index) => (
								<div
									key={deck.deckId}
									className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg hover:shadow-2xl border border-gray-100 dark:border-slate-700 p-6 transform hover:-translate-y-1 transition-all duration-300 cursor-pointer group animate-slide-up"
									style={{
										animationDelay: `${index * 100}ms`,
									}}
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
												className="mb-4 w-full px-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200"
											/>
											<div className="flex gap-3">
												<button
													onClick={handleUpdateDeck}
													className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
												>
													Save
												</button>
												<button
													onClick={() => {
														setEditingDeckId(null);
														setEditingDeckName("");
													}}
													className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 font-medium rounded-xl transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
												>
													Cancel
												</button>
											</div>
										</div>
									) : (
										<>
											{/* Header */}
											<div className="flex items-start justify-between mb-4">
												<div className="flex items-center gap-3">
													<span className="text-4xl">
														📚
													</span>
													<div>
														<h3
															className="text-xl font-bold text-gray-900 dark:text-slate-100 cursor-pointer hover:text-teal-600 dark:hover:text-teal-400 transition-colors duration-200"
															onClick={() =>
																onSelectDeck(
																	deck.deckId
																)
															}
														>
															{deck.deckName}
														</h3>
														<p className="text-sm text-gray-600 dark:text-slate-400">
															{deck.cards.length}{" "}
															card(s)
														</p>
													</div>
												</div>
											</div>

											{/* Stats */}
											<div className="grid grid-cols-3 gap-3 mb-4">
												<div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-3">
													<div className="text-2xl font-bold text-red-600">
														{
															deck.cards.filter(
																(card) =>
																	card.whenDue <=
																	Date.now()
															).length
														}
													</div>
													<div className="text-xs text-gray-600 dark:text-slate-400">
														Due
													</div>
												</div>
												<div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-3">
													<div className="text-2xl font-bold text-teal-600">
														{
															deck.cards.filter(
																(card) =>
																	card.reviews
																		.length ===
																	0
															).length
														}
													</div>
													<div className="text-xs text-gray-600 dark:text-slate-400">
														New
													</div>
												</div>
												<div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-3">
													<div className="text-2xl font-bold text-green-600">
														{
															deck.cards.filter(
																(card) =>
																	card.reviews
																		.length >
																	0
															).length
														}
													</div>
													<div className="text-xs text-gray-600 dark:text-slate-400">
														Studied
													</div>
												</div>
											</div>

											{/* Progress */}
											<div className="h-2 bg-gray-200 dark:bg-slate-700 rounded-full mb-4 overflow-hidden">
												<div
													className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-500"
													style={{
														width: `${
															deck.cards.length >
															0
																? (deck.cards.filter(
																		(
																			card
																		) =>
																			card
																				.reviews
																				.length >
																			0
																  ).length /
																		deck
																			.cards
																			.length) *
																  100
																: 0
														}%`,
													}}
												/>
											</div>

											{/* Actions */}
											<div className="flex gap-2">
												<button
													onClick={() =>
														onSelectDeck(
															deck.deckId
														)
													}
													className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 font-medium rounded-lg transition-colors duration-200"
												>
													View
												</button>
												<button
													onClick={() =>
														onStartReview(
															deck.deckId
														)
													}
													className="flex-1 px-3 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
												>
													Study
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
													className="p-2 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors duration-200 opacity-0 group-hover:opacity-100"
												>
													<Edit className="h-4 w-4" />
												</button>
												<button
													onClick={() =>
														handleDeleteDeck(
															deck.deckId
														)
													}
													className="p-2 text-gray-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors duration-200 opacity-0 group-hover:opacity-100"
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
