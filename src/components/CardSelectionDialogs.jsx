import { useEffect, useMemo, useState } from 'react';
import {
	X,
	Plus,
	Search,
	Link2,
	FolderInput,
	Trash2,
	AlertTriangle,
	Check,
} from 'lucide-react';
import ContainerIcon from './ContainerIcon';
import { getContainerColor } from '../config/containerColors';

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

function useEscape(onClose) {
	useEffect(() => {
		const handleKeyDown = (e) => {
			if (e.key === 'Escape') {
				e.preventDefault();
				onClose();
			}
		};
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [onClose]);
}

function DialogShell({ title, icon, onClose, children, footer }) {
	useEscape(onClose);
	return (
		<div
			className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
			onClick={(e) => e.target === e.currentTarget && onClose()}
		>
			<div
				role="dialog"
				aria-modal="true"
				className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full flex flex-col max-h-[90vh] animate-scale-in border border-gray-200 dark:border-slate-700"
			>
				<div className="flex items-center justify-between px-6 pt-6 pb-4">
					<h3 className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-slate-100">
						{icon}
						{title}
					</h3>
					<button
						onClick={onClose}
						className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
						aria-label="Close"
					>
						<X className="h-5 w-5" />
					</button>
				</div>
				<div className="px-6 overflow-y-auto min-h-0">{children}</div>
				<div className="px-6 pb-6 pt-4">{footer}</div>
			</div>
		</div>
	);
}

function PartnerOption({ count, checked, onChange, verb }) {
	if (count === 0) return null;
	return (
		<label className="flex items-start gap-3 p-3 mb-4 rounded-lg bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 cursor-pointer">
			<input
				type="checkbox"
				checked={checked}
				onChange={(e) => onChange(e.target.checked)}
				className="mt-0.5 h-4 w-4 accent-teal-500 cursor-pointer"
			/>
			<span className="text-sm">
				<span className="flex items-center gap-1.5 font-medium text-gray-900 dark:text-slate-100">
					<Link2 className="h-4 w-4 text-gray-500 dark:text-slate-400" />
					Also {verb} {plural(count, 'partner card')}
				</span>
				<span className="block text-gray-500 dark:text-slate-400 mt-0.5">
					{count === 1
						? 'One selected card has'
						: 'Some selected cards have'}{' '}
					a reversed partner that isn&apos;t selected.
				</span>
			</span>
		</label>
	);
}

/**
 * Pick an existing deck (or name a new one) to move the selected cards into.
 * unselectedPartners: [{ cardId, deckId }] partners of selected cards that
 * aren't themselves selected.
 */
export function MoveCardsDialog({
	decks,
	folders,
	currentDeckId,
	selectedCount,
	unselectedPartners,
	onMove,
	onClose,
}) {
	const [search, setSearch] = useState('');
	const [targetDeckId, setTargetDeckId] = useState(null);
	const [creatingNew, setCreatingNew] = useState(false);
	const [newDeckName, setNewDeckName] = useState('');
	const [includePartners, setIncludePartners] = useState(true);

	const folderNames = useMemo(
		() => new Map((folders || []).map((f) => [f.folderId, f.folderName])),
		[folders]
	);

	const candidateDecks = useMemo(() => {
		const term = search.trim().toLowerCase();
		return (decks || [])
			.filter((d) => d.deckId !== currentDeckId)
			.filter((d) => !term || d.deckName.toLowerCase().includes(term))
			.sort(
				(a, b) =>
					(a.isArchived ? 1 : 0) - (b.isArchived ? 1 : 0) ||
					a.deckName.localeCompare(b.deckName)
			);
	}, [decks, currentDeckId, search]);

	// Partners already sitting in the chosen deck don't need moving
	const partnersToMove = unselectedPartners.filter(
		(p) => creatingNew || p.deckId !== targetDeckId
	);

	const canMove = creatingNew ? newDeckName.trim() !== '' : !!targetDeckId;

	const handleMove = () => {
		if (!canMove) return;
		onMove({
			target: creatingNew
				? { newDeck: { deckName: newDeckName.trim() } }
				: { deckId: targetDeckId },
			partnerIds: includePartners
				? partnersToMove.map((p) => p.cardId)
				: [],
		});
	};

	const totalCount =
		selectedCount + (includePartners ? partnersToMove.length : 0);

	return (
		<DialogShell
			title="Move Cards"
			icon={<FolderInput className="h-5 w-5 text-teal-500" />}
			onClose={onClose}
			footer={
				<>
					<PartnerOption
						count={partnersToMove.length}
						checked={includePartners}
						onChange={setIncludePartners}
						verb="move"
					/>
					<div className="flex gap-3">
						<button
							onClick={onClose}
							className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 font-medium rounded-lg transition-colors duration-200"
						>
							Cancel
						</button>
						<button
							onClick={handleMove}
							disabled={!canMove}
							className="flex-1 px-4 py-2 bg-linear-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-medium rounded-lg shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							Move {plural(totalCount, 'card')}
						</button>
					</div>
				</>
			}
		>
			<p className="text-sm text-gray-600 dark:text-slate-400 mb-3">
				Choose a deck for {plural(selectedCount, 'selected card')}:
			</p>

			{creatingNew ? (
				<form
					onSubmit={(e) => {
						e.preventDefault();
						handleMove();
					}}
					className="mb-3 flex gap-2"
				>
					<input
						type="text"
						autoFocus
						placeholder="New deck name..."
						value={newDeckName}
						onChange={(e) => setNewDeckName(e.target.value)}
						className="flex-1 px-3 py-2 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
					/>
					<button
						type="button"
						onClick={() => {
							setCreatingNew(false);
							setNewDeckName('');
						}}
						className="px-3 py-2 text-sm text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
					>
						Back
					</button>
				</form>
			) : (
				<>
					<button
						onClick={() => {
							setCreatingNew(true);
							setTargetDeckId(null);
						}}
						className="w-full mb-3 flex items-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:border-teal-400 hover:text-teal-700 dark:hover:border-teal-500 dark:hover:text-teal-400 transition-colors text-sm font-medium"
					>
						<Plus className="h-4 w-4" />
						New deck (in this folder)
					</button>

					{(decks || []).length > 6 && (
						<div className="relative mb-3">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-slate-500" />
							<input
								type="text"
								placeholder="Search decks..."
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
							/>
						</div>
					)}

					<div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-slate-700 rounded-lg">
						{candidateDecks.length === 0 ? (
							<div className="px-4 py-3 text-sm text-gray-500 dark:text-slate-400 text-center">
								{search
									? 'No decks match your search'
									: 'No other decks yet'}
							</div>
						) : (
							candidateDecks.map((deck) => {
								const isSelected = deck.deckId === targetDeckId;
								const folderName = deck.parentFolderId
									? folderNames.get(deck.parentFolderId)
									: null;
								return (
									<button
										key={deck.deckId}
										onClick={() =>
											setTargetDeckId(deck.deckId)
										}
										className={`w-full text-left px-4 py-3 flex items-center gap-3 border-b border-gray-100 dark:border-slate-700 last:border-b-0 transition-colors ${
											isSelected
												? 'bg-teal-50 dark:bg-teal-900/20'
												: 'hover:bg-gray-100 dark:hover:bg-slate-700'
										}`}
									>
										<ContainerIcon
											name={deck.deckSymbol}
											className={`h-4 w-4 shrink-0 ${getContainerColor(deck.deckColor).icon}`}
										/>
										<span className="min-w-0 flex-1">
											<span className="block truncate text-gray-900 dark:text-slate-100 font-medium">
												{deck.deckName}
											</span>
											<span className="block truncate text-xs text-gray-500 dark:text-slate-400">
												{folderName ?? 'Root'} ·{' '}
												{plural(
													deck.cards.length,
													'card'
												)}
												{deck.isArchived &&
													' · Archived'}
											</span>
										</span>
										{isSelected && (
											<Check className="h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" />
										)}
									</button>
								);
							})
						)}
					</div>
				</>
			)}
		</DialogShell>
	);
}

export function DeleteCardsDialog({
	selectedCount,
	unselectedPartners,
	onDelete,
	onClose,
}) {
	const [includePartners, setIncludePartners] = useState(true);
	const total =
		selectedCount + (includePartners ? unselectedPartners.length : 0);

	return (
		<DialogShell
			title="Delete Cards"
			icon={<AlertTriangle className="h-5 w-5 text-red-500" />}
			onClose={onClose}
			footer={
				<>
					<PartnerOption
						count={unselectedPartners.length}
						checked={includePartners}
						onChange={setIncludePartners}
						verb="delete"
					/>
					<div className="flex gap-3">
						<button
							onClick={onClose}
							className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 font-medium rounded-lg transition-colors duration-200"
						>
							Cancel
						</button>
						<button
							autoFocus
							onClick={() =>
								onDelete({
									partnerIds: includePartners
										? unselectedPartners.map(
												(p) => p.cardId
											)
										: [],
								})
							}
							className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors duration-200"
						>
							<Trash2 className="h-4 w-4" />
							Delete {plural(total, 'card')}
						</button>
					</div>
				</>
			}
		>
			<p className="text-sm text-gray-600 dark:text-slate-400">
				Permanently delete {plural(selectedCount, 'selected card')} and
				their review history? This can&apos;t be undone.
			</p>
		</DialogShell>
	);
}
