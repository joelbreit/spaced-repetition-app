import { useState, useEffect } from 'react';

/**
 * Segmented Progress Bar for spaced repetition review sessions
 * Shows up to 3 progress bars (Due, New, Learned) with the active one expanded
 */
export default function SegmentedProgressBar({
	sections,
	currentCardIndex,
	totalCards,
}) {
	// Filter out empty sections
	const activeSections = sections.filter((section) => section.total > 0);

	// Calculate which section is currently active based on card index
	const getCurrentSection = () => {
		let cumulative = 0;
		for (let i = 0; i < activeSections.length; i++) {
			cumulative += activeSections[i].total;
			if (currentCardIndex < cumulative) {
				return i;
			}
		}
		return activeSections.length - 1;
	};

	const activeSectionIndex = getCurrentSection();

	// Calculate progress within the current section
	const getProgressInSection = () => {
		let cumulative = 0;
		for (let i = 0; i < activeSectionIndex; i++) {
			cumulative += activeSections[i].total;
		}
		const indexInSection = currentCardIndex - cumulative;
		const section = activeSections[activeSectionIndex];
		return {
			current: indexInSection + 1,
			total: section?.total || 0,
			percentage: section
				? Math.round(((indexInSection + 1) / section.total) * 100)
				: 0,
		};
	};

	const progress = getProgressInSection();

	// Check if all sections are complete
	const isComplete = currentCardIndex >= totalCards;

	if (activeSections.length === 0) {
		return null;
	}

	const getSectionColor = (type, isActive) => {
		const colors = {
			due: {
				bg: isActive
					? 'bg-gradient-to-r from-orange-500 to-amber-500'
					: 'bg-orange-400/60',
				track: isActive
					? 'bg-orange-200 dark:bg-orange-900/40'
					: 'bg-orange-200/50 dark:bg-orange-900/30',
				text: 'text-orange-600 dark:text-orange-400',
				label: 'text-orange-700 dark:text-orange-300',
			},
			new: {
				bg: isActive
					? 'bg-gradient-to-r from-teal-500 to-cyan-500'
					: 'bg-teal-400/60',
				track: isActive
					? 'bg-teal-200 dark:bg-teal-900/40'
					: 'bg-teal-200/50 dark:bg-teal-900/30',
				text: 'text-teal-600 dark:text-teal-400',
				label: 'text-teal-700 dark:text-teal-300',
			},
			learned: {
				bg: isActive
					? 'bg-gradient-to-r from-green-500 to-emerald-500'
					: 'bg-green-400/60',
				track: isActive
					? 'bg-green-200 dark:bg-green-900/40'
					: 'bg-green-200/50 dark:bg-green-900/30',
				text: 'text-green-600 dark:text-green-400',
				label: 'text-green-700 dark:text-green-300',
			},
		};
		return colors[type] || colors.new;
	};

	// Calculate cumulative start index for each section
	const getCumulativeStart = (sectionIndex) => {
		let start = 0;
		for (let i = 0; i < sectionIndex; i++) {
			start += activeSections[i].total;
		}
		return start;
	};

	return (
		<div className="mb-8">
			{/* Progress bars container */}
			<div className="flex gap-2 items-end">
				{activeSections.map((section, index) => {
					const isActive = index === activeSectionIndex;
					const isCompleted = index < activeSectionIndex;
					const colors = getSectionColor(section.type, isActive);

					// Calculate section-specific progress
					const cumulativeStart = getCumulativeStart(index);
					const cardsCompletedInSection = isCompleted
						? section.total
						: isActive
							? currentCardIndex - cumulativeStart + 1
							: 0;
					const sectionProgress = isCompleted
						? 100
						: isActive
							? Math.round(
									(cardsCompletedInSection / section.total) *
										100
								)
							: 0;

					return (
						<div
							key={section.type}
							className={`transition-all duration-500 ease-out ${
								isActive ? 'flex-[3]' : 'flex-1'
							}`}
						>
							{/* Label */}
							<div
								className={`mb-2 flex items-center justify-between text-sm transition-all duration-300 ${
									isActive ? 'opacity-100' : 'opacity-70'
								}`}
							>
								{isActive ? (
									<>
										<span
											className={`font-semibold ${colors.label}`}
										>
											{section.label}:{' '}
											{cardsCompletedInSection} of{' '}
											{section.total}
										</span>
										<span
											className={`font-medium ${colors.text}`}
										>
											{sectionProgress}%
										</span>
									</>
								) : (
									<span
										className={`font-medium ${colors.text} text-xs w-full text-center`}
									>
										{isCompleted ? '✓ ' : ''}
										{section.total} {section.label}
									</span>
								)}
							</div>

							{/* Progress bar */}
							<div
								className={`${colors.track} rounded-full overflow-hidden transition-all duration-300 ${
									isActive ? 'h-3' : 'h-2'
								}`}
							>
								<div
									className={`h-full ${colors.bg} rounded-full transition-all duration-500 ease-out relative overflow-hidden`}
									style={{ width: `${sectionProgress}%` }}
								>
									{/* Shimmer effect for active section */}
									{isActive && !isComplete && (
										<div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
									)}
								</div>
							</div>
						</div>
					);
				})}
			</div>

			{/* Overall progress indicator */}
			<div className="mt-3 text-center text-xs text-gray-500 dark:text-gray-400">
				Card {Math.min(currentCardIndex + 1, totalCards)} of{' '}
				{totalCards} overall
			</div>
		</div>
	);
}
