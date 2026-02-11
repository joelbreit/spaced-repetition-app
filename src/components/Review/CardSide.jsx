import { forwardRef } from 'react';
import ReadAloudButton from './ReadAloudButton';
import CardActionButtons from './CardActionButtons';
import AnimationOverlay from './AnimationOverlay';

const CardSide = forwardRef(function CardSide(
	{
		side,
		text,
		animationResult,
		nextDueDate,
		animationColor,
		playbackSpeed,
		onSpeedChange,
		voiceId,
		engine,
		isStarred,
		isFlagged,
		onToggleStar,
		onToggleFlag,
		cardId,
		transform,
	},
	ref
) {
	return (
		<div
			className={`backdrop-blur-lg bg-white/80 dark:bg-slate-800/80 border border-white/20 dark:border-slate-700/50 rounded-2xl shadow-2xl min-h-[100px] relative overflow-hidden transition-all ${
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

			<ReadAloudButton
				ref={ref}
				text={text}
				playbackSpeed={playbackSpeed}
				onSpeedChange={onSpeedChange}
				voiceId={voiceId}
				engine={engine}
			/>

			<CardActionButtons
				isStarred={isStarred}
				isFlagged={isFlagged}
				onToggleStar={onToggleStar}
				onToggleFlag={onToggleFlag}
				cardId={cardId}
			/>

			<div className="flex h-full flex-col justify-center p-6 min-h-[200px]">
				<div className="text-center">
					<div className="mb-4 text-sm font-semibold uppercase tracking-wide text-teal-600 dark:text-teal-400">
						{side}
					</div>
					<div className="text-2xl font-medium text-gray-900 dark:text-white leading-relaxed">
						{text}
					</div>
				</div>
			</div>
			<div className="absolute bottom-4 left-4 text-sm text-gray-500 dark:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
				Click to flip
			</div>
		</div>
	);
});

export default CardSide;
