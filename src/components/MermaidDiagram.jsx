import { useEffect, useId, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';

// Mermaid is large, so it loads the first time a card shows a diagram
let mermaidPromise = null;
let configuredDark = null;
async function loadMermaid(isDark) {
	mermaidPromise ??= import('mermaid').then((m) => m.default);
	const mermaid = await mermaidPromise;
	if (configuredDark !== isDark) {
		mermaid.initialize({
			startOnLoad: false,
			// Strict: no HTML labels, no click handlers, sanitized text
			securityLevel: 'strict',
			theme: isDark ? 'dark' : 'default',
			fontFamily: 'inherit',
		});
		configuredDark = isDark;
	}
	return mermaid;
}

// Renders run one at a time: Mermaid's config is global
let queue = Promise.resolve();

/** A ```mermaid code block, drawn as a diagram */
export default function MermaidDiagram({ code }) {
	const { isDark } = useTheme();
	const id = `mermaid-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
	const [result, setResult] = useState({ svg: null, error: null });

	useEffect(() => {
		let cancelled = false;
		queue = queue.then(async () => {
			if (cancelled) return;
			try {
				const mermaid = await loadMermaid(isDark);
				const { svg } = await mermaid.render(id, code);
				if (!cancelled) setResult({ svg, error: null });
			} catch (error) {
				// Mermaid leaves an error graphic behind on failure
				document.getElementById(`d${id}`)?.remove();
				if (!cancelled) {
					setResult({
						svg: null,
						error: error?.message || 'Invalid diagram',
					});
				}
			}
		});
		return () => {
			cancelled = true;
		};
	}, [code, isDark, id]);

	if (result.error) {
		return (
			<div className="text-left">
				<pre className="card-md-pre">
					<code>{code}</code>
				</pre>
				<p className="mt-1 text-xs font-normal text-orange-600 dark:text-orange-400">
					Diagram error: {result.error.split('\n')[0]}
				</p>
			</div>
		);
	}
	if (!result.svg) {
		return (
			<div className="my-2 h-24 animate-pulse rounded-lg bg-gray-100 dark:bg-slate-700/50" />
		);
	}
	return (
		<div
			className="card-md-mermaid"
			// Mermaid output, rendered with securityLevel 'strict'
			dangerouslySetInnerHTML={{ __html: result.svg }}
		/>
	);
}
