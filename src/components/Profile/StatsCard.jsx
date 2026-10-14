/**
 * Shared building blocks for the profile stats sections.
 */
export default function StatsCard({ title, icon: Icon, action, children }) {
	return (
		<section className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 min-w-0">
			<div className="flex items-center justify-between gap-3 mb-4">
				<div className="flex items-center gap-3 min-w-0">
					{Icon && (
						<div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg shrink-0">
							<Icon className="h-5 w-5 text-teal-600 dark:text-teal-400" />
						</div>
					)}
					<h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 truncate">
						{title}
					</h2>
				</div>
				{action}
			</div>
			{children}
		</section>
	);
}

export function StatTile({ label, value, detail }) {
	return (
		<div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl min-w-0">
			<div className="text-sm text-gray-600 dark:text-slate-400">
				{label}
			</div>
			<div className="text-2xl font-semibold text-gray-900 dark:text-slate-100 mt-1 tabular-nums">
				{value}
			</div>
			{detail && (
				<div className="text-xs text-gray-500 dark:text-slate-500 mt-1 truncate">
					{detail}
				</div>
			)}
		</div>
	);
}

export function EmptyState({ children }) {
	return (
		<div className="flex items-center justify-center h-40 text-center text-gray-500 dark:text-slate-400">
			{children}
		</div>
	);
}

// Recharts tooltip. `rows` turns the hovered payload into [label, value, color].
export function ChartTooltip({ active, payload, label, title, rows }) {
	if (!active || !payload || payload.length === 0) return null;
	const items = rows
		? rows(payload[0].payload)
		: payload.map((entry) => [entry.name, entry.value, entry.color]);

	return (
		<div className="px-3 py-2 rounded-lg shadow-lg border bg-white border-gray-200 dark:bg-slate-800 dark:border-slate-700">
			<p className="font-semibold mb-1 text-gray-700 dark:text-slate-200">
				{title ? title(payload[0].payload) : label}
			</p>
			{items.map(([name, value, color]) => (
				<p
					key={name}
					className="text-sm text-gray-600 dark:text-slate-300 flex items-center gap-2"
				>
					{color && (
						<span
							className="inline-block w-2.5 h-2.5 rounded-sm"
							style={{ backgroundColor: color }}
						/>
					)}
					{name}:{' '}
					<span className="font-semibold text-gray-900 dark:text-slate-100 tabular-nums">
						{value}
					</span>
				</p>
			))}
		</div>
	);
}

// Small pill toggle used for chart ranges and sort orders
export function SegmentedControl({ options, value, onChange, label }) {
	return (
		<div
			role="radiogroup"
			aria-label={label}
			className="inline-flex p-1 bg-gray-100 dark:bg-slate-700 rounded-lg shrink-0"
		>
			{options.map((option) => (
				<button
					key={option.value}
					role="radio"
					aria-checked={value === option.value}
					onClick={() => onChange(option.value)}
					className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
						value === option.value
							? 'bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 shadow-sm'
							: 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
					}`}
				>
					{option.label}
				</button>
			))}
		</div>
	);
}
