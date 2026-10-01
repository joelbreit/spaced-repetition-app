import { useState, useRef, useEffect } from 'react';
import {
	CONTAINER_ICON_GROUPS,
	normalizeContainerIcon,
} from '../config/containerIcons';
import {
	CONTAINER_COLORS,
	getContainerColor,
	normalizeContainerColor,
} from '../config/containerColors';
import ContainerIcon from './ContainerIcon';

// Pass `color` + `onColorChange` to also show a color row
export default function IconPicker({
	value,
	onChange,
	isFolder = false,
	color,
	onColorChange,
}) {
	const [isOpen, setIsOpen] = useState(false);
	const containerRef = useRef(null);
	const selected = normalizeContainerIcon(value, isFolder);
	const showColors = Boolean(onColorChange);
	const selectedColor = normalizeContainerColor(color);
	const tileClasses = getContainerColor(color).tile;

	useEffect(() => {
		if (!isOpen) return;
		const handlePointerDown = (e) => {
			if (!containerRef.current?.contains(e.target)) setIsOpen(false);
		};
		const handleKeyDown = (e) => {
			if (e.key === 'Escape') {
				e.stopPropagation();
				setIsOpen(false);
			}
		};
		document.addEventListener('pointerdown', handlePointerDown);
		document.addEventListener('keydown', handleKeyDown, true);
		return () => {
			document.removeEventListener('pointerdown', handlePointerDown);
			document.removeEventListener('keydown', handleKeyDown, true);
		};
	}, [isOpen]);

	return (
		<div ref={containerRef} className="relative shrink-0">
			<button
				type="button"
				onClick={(e) => {
					e.stopPropagation();
					setIsOpen((open) => !open);
				}}
				className={`flex h-full min-h-[3.25rem] w-16 items-center justify-center border border-gray-200 dark:border-slate-700 rounded-xl hover:brightness-95 dark:hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200 ${
					showColors
						? tileClasses
						: 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400'
				}`}
				title={
					showColors ? 'Choose an icon and color' : 'Choose an icon'
				}
				aria-label={
					showColors ? 'Choose an icon and color' : 'Choose an icon'
				}
				aria-haspopup="true"
				aria-expanded={isOpen}
			>
				<ContainerIcon
					name={selected}
					isFolder={isFolder}
					className="h-6 w-6"
				/>
			</button>
			{isOpen && (
				<div
					className="absolute left-0 top-full z-20 mt-2 w-72 max-h-80 overflow-y-auto rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 shadow-xl animate-fade-in"
					onClick={(e) => e.stopPropagation()}
				>
					{showColors && (
						<div className="pb-2 mb-1 border-b border-gray-100 dark:border-slate-700">
							<div className="px-1 pt-1 pb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
								Color
							</div>
							<div
								className="grid grid-cols-10 justify-items-center px-1 pb-1"
								role="radiogroup"
								aria-label="Color"
							>
								{Object.entries(CONTAINER_COLORS).map(
									([key, { label, swatch }]) => {
										const isSelected =
											key === selectedColor;
										return (
											<button
												key={key}
												type="button"
												role="radio"
												aria-checked={isSelected}
												aria-label={label}
												title={label}
												onClick={() =>
													onColorChange(key)
												}
												className={`h-5 w-5 rounded-full ${swatch} transition-transform duration-150 hover:scale-110 focus:outline-none ${
													isSelected
														? 'ring-2 ring-offset-2 ring-gray-900 dark:ring-white ring-offset-white dark:ring-offset-slate-800'
														: ''
												}`}
											/>
										);
									}
								)}
							</div>
						</div>
					)}
					<div role="listbox" aria-label="Icons">
						{CONTAINER_ICON_GROUPS.map((group) => (
							<div
								key={group.label}
								role="group"
								aria-label={group.label}
							>
								<div className="px-1 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
									{group.label}
								</div>
								<div className="grid grid-cols-6 gap-1">
									{Object.keys(group.icons).map((name) => {
										const isSelected = name === selected;
										const label = name.replace(/-/g, ' ');
										return (
											<button
												key={name}
												type="button"
												role="option"
												aria-selected={isSelected}
												aria-label={label}
												title={label}
												onClick={() => {
													onChange(name);
													setIsOpen(false);
												}}
												className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
													isSelected
														? showColors
															? tileClasses
															: 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300'
														: 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
												}`}
											>
												<ContainerIcon
													name={name}
													className="h-5 w-5"
												/>
											</button>
										);
									})}
								</div>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
