import { useEffect } from "react";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";

const Notification = ({ notification, onClose }) => {
	const { id, type, title, message, duration = 5000 } = notification;

	useEffect(() => {
		if (duration > 0) {
			const timer = setTimeout(() => {
				onClose(id);
			}, duration);
			return () => clearTimeout(timer);
		}
	}, [id, duration, onClose]);

	const getIcon = () => {
		switch (type) {
			case "success":
				return (
					<CheckCircle className="w-5 h-5 text-green-500 dark:text-green-400" />
				);
			case "error":
				return (
					<AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400" />
				);
			case "warning":
				return (
					<AlertTriangle className="w-5 h-5 text-yellow-500 dark:text-yellow-400" />
				);
			case "info":
			default:
				return (
					<Info className="w-5 h-5 text-blue-500 dark:text-blue-400" />
				);
		}
	};

	const getBackgroundColor = () => {
		switch (type) {
			case "success":
				return "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700";
			case "error":
				return "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-700";
			case "warning":
				return "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-700";
			case "info":
			default:
				return "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700";
		}
	};

	return (
		<div
			className={`min-w-80 max-w-md w-full shadow-lg rounded-xl border p-4 ${getBackgroundColor()} animate-slide-up`}
		>
			<div className="flex items-start">
				<div className="flex-shrink-0">{getIcon()}</div>
				<div className="ml-3 w-0 flex-1">
					{title && (
						<p className="text-sm font-medium text-gray-900 dark:text-slate-100">
							{title}
						</p>
					)}
					{message && (
						<p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
							{message}
						</p>
					)}
				</div>
				<div className="ml-4 flex-shrink-0 flex">
					<button
						className="bg-white dark:bg-slate-800 rounded-md inline-flex text-gray-400 hover:text-gray-500 dark:hover:text-slate-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
						onClick={() => onClose(id)}
					>
						<span className="sr-only">Close</span>
						<X className="h-5 w-5" />
					</button>
				</div>
			</div>
		</div>
	);
};

export default Notification;
