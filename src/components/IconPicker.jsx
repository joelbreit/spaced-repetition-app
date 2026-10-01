import { useState, useRef, useEffect } from 'react';
import {
	CONTAINER_ICONS,
	normalizeContainerIcon,
} from '../config/containerIcons';
import ContainerIcon from './ContainerIcon';

export default function IconPicker({ value, onChange, isFolder = false }) {
	const [isOpen, setIsOpen] = useState(false);
	const containerRef = useRef(null);
	const selected = normalizeContainerIcon(value, isFolder);

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
				className="flex h-full min-h-[3.25rem] w-16 items-center justify-center bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-teal-600 dark:text-teal-400 hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200"
				title="Choose an icon"
				aria-label="Choose an icon"
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
					className="absolute left-0 top-full z-20 mt-2 grid w-72 grid-cols-6 gap-1 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 shadow-xl animate-fade-in"
					role="listbox"
					aria-label="Icons"
					onClick={(e) => e.stopPropagation()}
				>
					{Object.keys(CONTAINER_ICONS).map((name) => {
						const isSelected = name === selected;
						return (
							<button
								key={name}
								type="button"
								role="option"
								aria-selected={isSelected}
								aria-label={name.replace(/-/g, ' ')}
								title={name.replace(/-/g, ' ')}
								onClick={() => {
									onChange(name);
									setIsOpen(false);
								}}
								className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
									isSelected
										? 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300'
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
			)}
		</div>
	);
}
