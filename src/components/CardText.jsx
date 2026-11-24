import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { clozeParts } from '../services/cloze';
import { clozeMarkdown, hastText, rehypeCloze } from '../services/markdown';

const MermaidDiagram = lazy(() => import('./MermaidDiagram'));

const REMARK = [remarkGfm, remarkBreaks];

// Code highlighting loads the first time a card has a fenced code block with
// a language, so cards without code don't pay for it
const FENCE_WITH_LANGUAGE = /^\s{0,3}(```|~~~)\s*(?!mermaid\b)\w/m;
let highlighter = null;
let highlighterPromise = null;
function useHighlighter(needed) {
	const [plugin, setPlugin] = useState(() => highlighter);
	useEffect(() => {
		if (!needed || plugin) return;
		let cancelled = false;
		highlighterPromise ??= import('rehype-highlight').then((m) => {
			highlighter = m.default;
			return highlighter;
		});
		highlighterPromise.then((loaded) => {
			if (!cancelled) setPlugin(() => loaded);
		});
		return () => {
			cancelled = true;
		};
	}, [needed, plugin]);
	return needed ? plugin : null;
}
const NO_PARTS = [];

// Links open in a new tab, so a review isn't lost
// eslint-disable-next-line no-unused-vars
const Link = ({ node, ...props }) => (
	<a {...props} target="_blank" rel="noopener noreferrer" />
);

// Inline Markdown only, for a cloze answer: no paragraph around it
const inlineComponents = {
	p: ({ children }) => <>{children}</>,
	a: Link,
};

const CLOZE_CLASSES = {
	blank: 'rounded-md bg-teal-100 px-1.5 font-semibold text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
	answer: 'rounded-md bg-cyan-100 px-1 font-semibold text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200',
};

function Markdown({ source, parts }) {
	const rehypeHighlight = useHighlighter(FENCE_WITH_LANGUAGE.test(source));
	const rehype = useMemo(
		() => [
			...(rehypeHighlight
				? [[rehypeHighlight, { plainText: ['mermaid'] }]]
				: []),
			[rehypeCloze, { parts }],
		],
		[parts, rehypeHighlight]
	);
	const components = useMemo(
		() => ({
			a: Link,
			pre: ({ node, children, ...props }) => {
				const code = node?.children?.find((c) => c.tagName === 'code');
				const classes = code?.properties?.className || [];
				if (classes.includes('language-mermaid')) {
					return (
						<Suspense
							fallback={
								<div className="my-2 h-24 animate-pulse rounded-lg bg-gray-100 dark:bg-slate-700/50" />
							}
						>
							<MermaidDiagram
								code={hastText(code).replace(/\n$/, '')}
							/>
						</Suspense>
					);
				}
				return <pre {...props}>{children}</pre>;
			},
			span: ({ node, children, ...props }) => {
				const index = node?.properties?.dataCloze;
				if (index === undefined)
					return <span {...props}>{children}</span>;
				const part = parts[index];
				return (
					<span className={CLOZE_CLASSES[part.type]}>
						{part.type === 'answer' && !node.properties.dataRaw ? (
							<ReactMarkdown
								remarkPlugins={[remarkGfm]}
								components={inlineComponents}
							>
								{part.text}
							</ReactMarkdown>
						) : (
							part.text
						)}
					</span>
				);
			},
		}),
		[parts]
	);
	return (
		<ReactMarkdown
			remarkPlugins={REMARK}
			rehypePlugins={rehype}
			components={components}
		>
			{source}
		</ReactMarkdown>
	);
}

/**
 * Card text rendered as Markdown: GitHub flavored (tables, task lists,
 * strikethrough), line breaks kept, code highlighted, ```mermaid blocks drawn
 * as diagrams. For a cloze card, pass `cloze` ({ text, ord, side, extra }):
 * its deletion shows as a blank on the front and highlighted on the back,
 * and the back ends with the note's extra. Inherits size and alignment from
 * its container.
 */
export default function CardText({ text, cloze }) {
	const parts = useMemo(
		() =>
			cloze ? clozeParts(cloze.text, cloze.ord, cloze.side) : NO_PARTS,
		[cloze?.text, cloze?.ord, cloze?.side] // eslint-disable-line react-hooks/exhaustive-deps
	);
	const source = cloze ? clozeMarkdown(parts) : text || '';
	return (
		<div className="card-md">
			<Markdown source={source} parts={parts} />
			{cloze?.side === 'back' && cloze.extra?.trim() && (
				<div className="mt-4 border-t border-gray-200 pt-3 text-[0.8em] font-normal text-gray-600 dark:border-slate-700 dark:text-slate-400">
					<Markdown source={cloze.extra} parts={NO_PARTS} />
				</div>
			)}
		</div>
	);
}
