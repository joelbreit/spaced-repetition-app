import { useEffect, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { getMediaUrl, getMediaUrlNow } from '../services/media';

/** An uploaded card image (a media: link), loaded from cache or S3 */
export default function MediaImage({ name, alt = '', title }) {
	const [state, setState] = useState(() => {
		const url = getMediaUrlNow(name);
		return url ? { name, url } : { name };
	});

	useEffect(() => {
		let cancelled = false;
		getMediaUrl(name).then(
			(url) => !cancelled && setState({ name, url }),
			(error) => !cancelled && setState({ name, error: error.message })
		);
		return () => {
			cancelled = true;
		};
	}, [name]);

	// Text edited to point at another image: ignore the old one's result
	const current = state.name === name ? state : {};

	if (current.url) {
		return <img src={current.url} alt={alt} title={title} />;
	}
	if (current.error) {
		return (
			<span
				className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-2 py-1 text-xs font-normal text-gray-500 dark:border-slate-600 dark:text-slate-400"
				title={current.error}
			>
				<ImageOff className="h-4 w-4" />
				{alt || 'Image'} unavailable
			</span>
		);
	}
	return (
		<span
			className="inline-block h-32 w-48 max-w-full animate-pulse rounded-lg bg-gray-100 align-middle dark:bg-slate-700/50"
			aria-label={alt || 'Loading image'}
		/>
	);
}
