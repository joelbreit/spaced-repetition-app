import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { useAppData } from '../contexts/AppDataContext';

export default function Breadcrumbs({ folderId, deckId, deckName }) {
	const { appData } = useAppData();

	// Build breadcrumb path from folder hierarchy
	const buildPath = () => {
		const path = [{ name: 'Home', url: '/', id: null }];

		if (deckId && deckName) {
			// If we're viewing a deck, include it in the path
			const deck = appData.decks?.find((d) => d.deckId === deckId);
			if (deck && deck.parentFolderId) {
				// Build folder path first
				const folderPath = getFolderPath(deck.parentFolderId);
				path.push(...folderPath);
			}
			path.push({ name: deckName, url: `/deck/${deckId}`, id: deckId });
		} else if (folderId) {
			// If we're viewing a folder, build its path
			const folderPath = getFolderPath(folderId);
			path.push(...folderPath);
		}

		return path;
	};

	const getFolderPath = (folderId) => {
		if (!appData.folders || !folderId) return [];

		const path = [];
		const visited = new Set(); // Prevent infinite loops

		let currentId = folderId;
		while (currentId && !visited.has(currentId)) {
			visited.add(currentId);
			const folder = appData.folders.find(
				(f) => f.folderId === currentId
			);
			if (!folder) break;

			path.unshift({
				name: folder.folderName,
				url: `/folder/${folder.folderId}`,
				id: folder.folderId,
			});

			currentId = folder.parentFolderId;
		}

		return path;
	};

	const path = buildPath();
	const isLast = (index) => index === path.length - 1;

	return (
		<nav className="flex items-center gap-2 text-sm mb-6">
			{path.map((item, index) => (
				<div
					key={item.id || 'home'}
					className="flex items-center gap-2"
				>
					{index === 0 ? (
						<Link
							to={item.url}
							className="flex items-center gap-1 text-gray-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors duration-200"
						>
							<Home className="h-4 w-4" />
							<span className="hidden sm:inline">
								{item.name}
							</span>
						</Link>
					) : isLast(index) ? (
						<span className="text-gray-900 dark:text-slate-100 font-medium">
							{item.name}
						</span>
					) : (
						<Link
							to={item.url}
							className="text-gray-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors duration-200"
						>
							{item.name}
						</Link>
					)}
					{!isLast(index) && (
						<ChevronRight className="h-4 w-4 text-gray-400 dark:text-slate-500" />
					)}
				</div>
			))}
		</nav>
	);
}
