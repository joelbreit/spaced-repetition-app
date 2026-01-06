import { useState } from "react";
import { useParams } from "react-router-dom";
import { Plus, Search, FolderOpen, Play } from "lucide-react";
import {
	DndContext,
	closestCenter,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	SortableContext,
	sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { useNotification } from "../hooks/useNotification";
import { useAppData } from "../contexts/AppDataContext";
import { useDeckOperations } from "../hooks/useDeckOperations";
import StudyStatistics from "./StudyStatistics";
import SortableContainerItem from "./SortableContainerItem";
import Breadcrumbs from "./Breadcrumbs";

export default function FolderBrowserView({
	onStartReview,
	onStartFolderReview,
}) {
	const { folderId } = useParams();
	const { appData } = useAppData();
	const {
		addDeck,
		updateDeck,
		deleteDeck,
		addFolder,
		updateFolder,
		deleteFolder,
		reorderContainers,
	} = useDeckOperations();
	const { showConfirmation } = useNotification();

	const [newDeckName, setNewDeckName] = useState("");
	const [newDeckSymbol, setNewDeckSymbol] = useState("📚");
	const [newFolderName, setNewFolderName] = useState("");
	const [newFolderSymbol, setNewFolderSymbol] = useState("📁");
	const [editingId, setEditingId] = useState(null);
	const [editingName, setEditingName] = useState("");
	const [editingSymbol, setEditingSymbol] = useState("");
	const [showNewDeckForm, setShowNewDeckForm] = useState(false);
	const [showNewFolderForm, setShowNewFolderForm] = useState(false);
	const [searchTerm, setSearchTerm] = useState("");

	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		})
	);

	// Get folders and decks in current folder
	const folders = (appData.folders || []).filter(
		(f) =>
			(f.parentFolderId === null && !folderId) ||
			f.parentFolderId === folderId
	);

	const decks = (appData.decks || []).filter(
		(d) =>
			(d.parentFolderId === null && !folderId) ||
			d.parentFolderId === folderId
	);

	// Combine into items array for sorting/filtering
	const allItems = [
		...folders.map((f) => ({
			id: f.folderId,
			name: f.folderName,
			symbol: f.folderSymbol,
			type: "folder",
			...f,
		})),
		...decks.map((d) => ({
			id: d.deckId,
			name: d.deckName,
			symbol: d.deckSymbol,
			type: "deck",
			cards: d.cards,
			...d,
		})),
	];

	// Filter items by search
	const filteredItems = searchTerm
		? allItems.filter((item) => {
				const searchLower = searchTerm.toLowerCase();
				if (item.name.toLowerCase().includes(searchLower)) return true;
				if (item.type === "deck" && item.cards) {
					return item.cards.some(
						(card) =>
							card.front.toLowerCase().includes(searchLower) ||
							card.back.toLowerCase().includes(searchLower)
					);
				}
				return false;
		  })
		: allItems;

	const handleAddDeck = () => {
		if (newDeckName.trim()) {
			addDeck(
				newDeckName.trim(),
				newDeckSymbol || "📚",
				folderId || null
			);
			setNewDeckName("");
			setNewDeckSymbol("📚");
			setShowNewDeckForm(false);
		}
	};

	const handleAddFolder = () => {
		if (newFolderName.trim()) {
			addFolder(
				newFolderName.trim(),
				newFolderSymbol || "📁",
				folderId || null
			);
			setNewFolderName("");
			setNewFolderSymbol("📁");
			setShowNewFolderForm(false);
		}
	};

	const handleUpdate = () => {
		if (!editingName.trim()) return;

		const item = allItems.find((i) => i.id === editingId);
		if (!item) return;

		if (item.type === "folder") {
			updateFolder(editingId, editingName.trim(), editingSymbol || "📁");
		} else {
			updateDeck(editingId, editingName.trim(), editingSymbol || "📚");
		}

		setEditingId(null);
		setEditingName("");
		setEditingSymbol("");
	};

	const handleDelete = async (id, type) => {
		const item = allItems.find((i) => i.id === id);
		if (!item) return;

		const confirmed = await showConfirmation({
			title: `Delete ${type === "folder" ? "Folder" : "Deck"}`,
			message: `Are you sure you want to delete this ${
				type === "folder" ? "folder" : "deck"
			}${type === "deck" ? " and all its cards" : ""}?`,
			confirmText: "Delete",
			cancelText: "Cancel",
			type: "danger",
		});

		if (confirmed) {
			if (type === "folder") {
				deleteFolder(id);
			} else {
				deleteDeck(id);
			}
		}
	};

	const handleDragEnd = (event) => {
		const { active, over } = event;

		if (!over || active.id === over.id) {
			return;
		}

		// Only allow reordering when there's no search filter
		if (searchTerm) {
			return;
		}

		const activeIndex = filteredItems.findIndex(
			(item) => item.id === active.id
		);
		const overIndex = filteredItems.findIndex(
			(item) => item.id === over.id
		);

		if (activeIndex !== -1 && overIndex !== -1) {
			reorderContainers(activeIndex, overIndex, filteredItems);
		}
	};

	const isRoot = !folderId;

	return (
		<div>
			{/* Breadcrumbs */}
			<Breadcrumbs folderId={folderId} />

			{/* Statistics */}
			<StudyStatistics appData={appData} folderId={folderId || null} />

			{/* Search and Study All */}
			<div className="mb-6 flex items-center gap-3">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-slate-500" />
					<input
						type="text"
						placeholder="Search folders, decks and cards..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200"
					/>
				</div>
				{onStartFolderReview && decks.length > 0 && (
					<button
						onClick={() => onStartFolderReview(folderId || null)}
						className="flex items-center gap-2 px-6 py-3 bg-linear-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 whitespace-nowrap"
					>
						<Play className="h-5 w-5" />
						Study All
					</button>
				)}
			</div>

			{/* Create Forms */}
			<div className="mb-6 flex gap-3 flex-wrap">
				{showNewFolderForm ? (
					<div className="flex-1 min-w-[300px] rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-700 p-6 bg-gray-50 dark:bg-slate-700/50">
						<h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-slate-100">
							Create New Folder
						</h3>
						<div className="flex gap-3">
							<input
								type="text"
								placeholder="📁"
								value={newFolderSymbol}
								onChange={(e) => {
									const value = e.target.value;
									const firstChar = [...value][0] || "";
									setNewFolderSymbol(firstChar);
								}}
								className="w-16 px-3 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-slate-100 text-center text-2xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200"
								title="Enter an emoji or single character"
							/>
							<input
								type="text"
								placeholder="Folder name..."
								value={newFolderName}
								onChange={(e) =>
									setNewFolderName(e.target.value)
								}
								className="flex-1 px-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200"
							/>
							<button
								onClick={handleAddFolder}
								className="px-6 py-3 bg-linear-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
							>
								Create
							</button>
							<button
								onClick={() => {
									setShowNewFolderForm(false);
									setNewFolderName("");
									setNewFolderSymbol("📁");
								}}
								className="px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 font-medium rounded-xl transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
							>
								Cancel
							</button>
						</div>
					</div>
				) : (
					<button
						onClick={() => setShowNewFolderForm(true)}
						className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors duration-200"
					>
						<FolderOpen className="h-5 w-5" />
						Create Folder
					</button>
				)}

				{showNewDeckForm ? (
					<div className="flex-1 min-w-[300px] rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-700 p-6 bg-gray-50 dark:bg-slate-700/50">
						<h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-slate-100">
							Create New Deck
						</h3>
						<div className="flex gap-3">
							<input
								type="text"
								placeholder="📚"
								value={newDeckSymbol}
								onChange={(e) => {
									const value = e.target.value;
									const firstChar = [...value][0] || "";
									setNewDeckSymbol(firstChar);
								}}
								className="w-16 px-3 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-slate-100 text-center text-2xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200"
								title="Enter an emoji or single character"
							/>
							<input
								type="text"
								placeholder="Deck name..."
								value={newDeckName}
								onChange={(e) => setNewDeckName(e.target.value)}
								className="flex-1 px-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200"
							/>
							<button
								onClick={handleAddDeck}
								className="px-6 py-3 bg-linear-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
							>
								Create
							</button>
							<button
								onClick={() => {
									setShowNewDeckForm(false);
									setNewDeckName("");
									setNewDeckSymbol("📚");
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
						className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors duration-200"
					>
						<Plus className="h-5 w-5" />
						Create Deck
					</button>
				)}
			</div>

			{/* Items Grid */}
			{filteredItems.length === 0 ? (
				<div className="col-span-full py-12 text-center animate-fade-in">
					<div className="text-6xl mb-4">
						{searchTerm ? "🔍" : isRoot ? "📚" : "📁"}
					</div>
					<p className="text-lg text-gray-500 dark:text-gray-400 mb-2">
						{searchTerm
							? "No folders or decks found matching your search."
							: isRoot
							? "No folders or decks yet. Create your first one!"
							: "This folder is empty."}
					</p>
					{!searchTerm && (
						<p className="text-sm text-gray-400 dark:text-gray-500">
							Start building your knowledge base!
						</p>
					)}
				</div>
			) : (
				<DndContext
					sensors={sensors}
					collisionDetection={closestCenter}
					onDragEnd={handleDragEnd}
				>
					<SortableContext
						items={filteredItems.map((item) => item.id)}
					>
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
							{filteredItems.map((item) => (
								<SortableContainerItem
									key={item.id}
									item={item}
									type={item.type}
									editingId={editingId}
									editingName={editingName}
									editingSymbol={editingSymbol}
									setEditingId={setEditingId}
									setEditingName={setEditingName}
									setEditingSymbol={setEditingSymbol}
									handleUpdate={handleUpdate}
									handleDelete={(id) =>
										handleDelete(id, item.type)
									}
									onStartReview={onStartReview}
									onStartFolderReview={onStartFolderReview}
									isDraggable={!searchTerm}
									appData={appData}
								/>
							))}
						</div>
					</SortableContext>
				</DndContext>
			)}
		</div>
	);
}
