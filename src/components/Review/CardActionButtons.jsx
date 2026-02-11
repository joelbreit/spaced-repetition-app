import { Star, Flag } from 'lucide-react';

export default function CardActionButtons({
	isStarred,
	isFlagged,
	onToggleStar,
	onToggleFlag,
	cardId,
}) {
	return (
		<>
			{/* Star Button */}
			<button
				onClick={(e) => {
					e.stopPropagation();
					if (onToggleStar) {
						onToggleStar(cardId);
					}
				}}
				className={`absolute top-4 right-16 p-2 rounded-lg transition-all duration-200 z-10 ${
					isStarred
						? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-900/50'
						: 'bg-white/50 dark:bg-slate-700/50 text-gray-400 dark:text-slate-500 hover:bg-white/70 dark:hover:bg-slate-700/70 hover:text-yellow-500 dark:hover:text-yellow-400 border border-gray-200 dark:border-slate-600'
				}`}
				title={isStarred ? 'Unstar card' : 'Star card'}
			>
				<Star
					className={`h-5 w-5 ${isStarred ? 'fill-current' : ''}`}
				/>
			</button>
			{/* Flag Button */}
			<button
				onClick={(e) => {
					e.stopPropagation();
					if (onToggleFlag) {
						onToggleFlag(cardId);
					}
				}}
				className={`absolute top-4 right-4 p-2 rounded-lg transition-all duration-200 z-10 ${
					isFlagged
						? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-900/50'
						: 'bg-white/50 dark:bg-slate-700/50 text-gray-400 dark:text-slate-500 hover:bg-white/70 dark:hover:bg-slate-700/70 hover:text-orange-500 dark:hover:text-orange-400 border border-gray-200 dark:border-slate-600'
				}`}
				title={isFlagged ? 'Unflag card' : 'Flag card'}
			>
				<Flag
					className={`h-5 w-5 ${isFlagged ? 'fill-current' : ''}`}
				/>
			</button>
		</>
	);
}
