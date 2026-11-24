import { useRef, useState } from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';
import { useNotification } from '../hooks/useNotification';
import { ACCEPTED_TYPES, addImage, imageMarkdown } from '../services/media';

/**
 * A textarea for card text that takes images: paste one, drop one on it, or
 * pick files with its Image button. Each is stored (services/media.js) and
 * inserted at the cursor as ![alt](media:...).
 * @param {Function} onChange - (newText)
 * @param {Object} [textareaRef] - ref to the textarea, if the caller needs it
 * Other props go to the textarea.
 */
export default function MarkdownTextarea({
	value,
	onChange,
	textareaRef,
	className = '',
	children, // extra controls for the row under the field
	...props
}) {
	const ownRef = useRef(null);
	const ref = textareaRef || ownRef;
	const fileInputRef = useRef(null);
	const valueRef = useRef(value);
	valueRef.current = value;
	const [dragging, setDragging] = useState(false);
	const [working, setWorking] = useState(0);
	const { showError } = useNotification();

	const insertFiles = async (files) => {
		const images = [...files].filter((f) => f.type.startsWith('image/'));
		if (images.length === 0) return;
		setWorking((n) => n + 1);
		const pieces = [];
		for (const file of images) {
			try {
				const { name, uploaded } = await addImage(file);
				pieces.push(imageMarkdown(name, file.name));
				uploaded.catch((error) =>
					showError(
						`${error.message}. The image is kept on this device and will be uploaded next time.`,
						'Image Not Uploaded'
					)
				);
			} catch (error) {
				showError(error.message, 'Image Not Added');
			}
		}
		setWorking((n) => n - 1);
		if (pieces.length === 0) return;

		const el = ref.current;
		const text = valueRef.current;
		const start = el ? el.selectionStart : text.length;
		const end = el ? el.selectionEnd : text.length;
		const inserted = pieces.join('\n');
		onChange(text.slice(0, start) + inserted + text.slice(end));
		requestAnimationFrame(() => {
			if (!el) return;
			el.focus();
			el.setSelectionRange(
				start + inserted.length,
				start + inserted.length
			);
		});
	};

	const handlePaste = (e) => {
		const files = e.clipboardData?.files;
		// Text copied with an image (e.g. from a document) pastes as text
		if (files?.length && !e.clipboardData.getData('text/plain')) {
			e.preventDefault();
			insertFiles(files);
		}
	};

	const hasFiles = (e) =>
		[...(e.dataTransfer?.types || [])].includes('Files');
	const handleDragOver = (e) => {
		if (!hasFiles(e)) return;
		e.preventDefault();
		setDragging(true);
	};
	const handleDrop = (e) => {
		if (!hasFiles(e)) return;
		e.preventDefault();
		setDragging(false);
		insertFiles(e.dataTransfer.files);
	};

	return (
		<div className="space-y-1.5">
			<textarea
				ref={ref}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				onPaste={handlePaste}
				onDragOver={handleDragOver}
				onDragLeave={() => setDragging(false)}
				onDrop={handleDrop}
				className={`${className} ${
					dragging ? 'ring-2 ring-teal-500 border-transparent' : ''
				}`}
				{...props}
			/>
			<div className="flex flex-wrap items-center gap-3">
				<button
					type="button"
					onMouseDown={(e) => e.preventDefault()}
					onClick={() => fileInputRef.current?.click()}
					className="inline-flex items-center gap-1.5 px-2.5 py-1 text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors duration-200"
				>
					<ImagePlus className="h-4 w-4" />
					Image
				</button>
				{!children && (
					<span className="hidden pointer-fine:inline text-xs text-gray-400 dark:text-slate-500">
						or paste / drop one in
					</span>
				)}
				{working > 0 && (
					<span className="inline-flex items-center gap-1 text-xs text-teal-700 dark:text-teal-300">
						<Loader2 className="h-3.5 w-3.5 animate-spin" />
						Adding image…
					</span>
				)}
				{children}
				<input
					ref={fileInputRef}
					type="file"
					accept={ACCEPTED_TYPES.join(',')}
					multiple
					className="hidden"
					onChange={(e) => {
						insertFiles(e.target.files);
						e.target.value = '';
					}}
				/>
			</div>
		</div>
	);
}
