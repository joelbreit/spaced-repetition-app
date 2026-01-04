import { prettyPrintDueDateAsInterval } from "../../services/cardCalculations";

export default function AnimationOverlay({ nextDueDate }) {
	if (!nextDueDate) return null;

	return (
		<div className="absolute inset-0 flex items-center justify-center z-20 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm">
			<div className="text-center px-6">
				<div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
					{prettyPrintDueDateAsInterval(nextDueDate)}
				</div>
				<div className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
					Next Review
				</div>
			</div>
		</div>
	);
}
