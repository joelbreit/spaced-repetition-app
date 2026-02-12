import { forwardRef } from 'react';
import { Star, Flag, BookOpen } from 'lucide-react';
import AnimationOverlay from './AnimationOverlay';

const CardSide = forwardRef(function CardSide(
	{
		side,
		text,
		animationResult,
		nextDueDate,
		animationColor,
		isStarred,
		isFlagged,
		onToggleStar,
		onToggleFlag,
		cardId,
		transform,
		deckName,
		deckSymbol,
		stats,
	},
	ref
) {
	return (
		<div
			ref={ref}
			className={`backdrop-blur-lg bg-white/80 dark:bg-slate-800/80 border border-white/20 dark:border-slate-700/50 rounded-2xl shadow-2xl min-h-[100px] relative overflow-hidden transition-all flex flex-col ${
				animationResult ? animationColor : ''
			}`}
			style={{
				backfaceVisibility: 'hidden',
				WebkitBackfaceVisibility: 'hidden',
				transform: transform,
				gridArea: '1 / 1',
				transitionDuration: '0.6s',
			}}
		>
			<AnimationOverlay nextDueDate={nextDueDate} />

			{/* Header */}
			<div className="flex items-center justify-between px-4 py-3 border-b border-gray-200/50 dark:border-slate-700/50 bg-gray-50/50 dark:bg-slate-900/30">
				{/* Deck Name */}
				<div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 min-w-0 flex-1">
					{deckSymbol ? (
						<span className="text-base shrink-0">{deckSymbol}</span>
					) : (
						<BookOpen className="h-4 w-4 text-teal-500 shrink-0" />
					)}
					<span className="truncate font-medium">
						{deckName || 'Deck'}
					</span>
				</div>

				{/* Side Label */}
				<div className="px-3 py-1 bg-teal-100 dark:bg-teal-900/40 rounded-full">
					<span className="text-xs font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300">
						{side}
					</span>
				</div>

				{/* Star & Flag Buttons */}
				<div className="flex items-center gap-1 ml-4">
					<button
						onClick={(e) => {
							e.stopPropagation();
							if (onToggleStar) {
								onToggleStar(cardId);
							}
						}}
						className={`p-1.5 rounded-lg transition-all duration-200 ${
							isStarred
								? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-900/50'
								: 'text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-yellow-500 dark:hover:text-yellow-400'
						}`}
						title={isStarred ? 'Unstar card' : 'Star card'}
					>
						<Star
							className={`h-4 w-4 ${isStarred ? 'fill-current' : ''}`}
						/>
					</button>
					<button
						onClick={(e) => {
							e.stopPropagation();
							if (onToggleFlag) {
								onToggleFlag(cardId);
							}
						}}
						className={`p-1.5 rounded-lg transition-all duration-200 ${
							isFlagged
								? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-900/50'
								: 'text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-orange-500 dark:hover:text-orange-400'
						}`}
						title={isFlagged ? 'Unflag card' : 'Flag card'}
					>
						<Flag
							className={`h-4 w-4 ${isFlagged ? 'fill-current' : ''}`}
						/>
					</button>
				</div>
			</div>

			{/* Content */}
			<div className="flex-1 flex items-center justify-center p-6 min-h-[180px]">
				<div className="text-2xl font-medium text-gray-900 dark:text-white leading-relaxed text-center">
					{text}
				</div>
			</div>

			{/* Footer - Stats */}
			{stats && (
				<div className="px-4 py-2.5 border-t border-gray-200/50 dark:border-slate-700/50 bg-gray-50/50 dark:bg-slate-900/30">
					<div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs">
						{stats.map((stat, index) => (
							<div
								key={index}
								className="flex items-center gap-1.5"
							>
								{stat.icon}
								<span
									className={`font-medium ${stat.valueColor || 'text-gray-600 dark:text-gray-400'}`}
								>
									{stat.value}
								</span>
								{stat.label && (
									<span className="text-gray-500 dark:text-gray-500">
										{stat.label}
									</span>
								)}
							</div>
						))}
					</div>
				</div>
			)}

			{/* Click to flip hint */}
			<div className="absolute bottom-12 left-4 text-xs text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
				Click to flip
			</div>
		</div>
	);
});

export default CardSide;
