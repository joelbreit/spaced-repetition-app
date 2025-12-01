import { X, AlertTriangle } from "lucide-react";

const ConfirmationDialog = ({
	isOpen,
	onClose,
	onConfirm,
	title,
	message,
	confirmText = "Confirm",
	cancelText = "Cancel",
	type = "warning",
}) => {
	if (!isOpen) return null;

	const handleBackdropClick = (e) => {
		if (e.target === e.currentTarget) {
			onClose();
		}
	};

	const getIcon = () => {
		switch (type) {
			case "danger":
				return <AlertTriangle className="w-6 h-6 text-red-500" />;
			case "warning":
			default:
				return <AlertTriangle className="w-6 h-6 text-yellow-500" />;
		}
	};

	const getConfirmButtonStyle = () => {
		switch (type) {
			case "danger":
				return "bg-red-600 hover:bg-red-700 focus:ring-red-500";
			case "warning":
			default:
				return "bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500";
		}
	};

	return (
		<div
			className="fixed inset-0 bg-black/20 flex items-center justify-center z-50"
			onClick={handleBackdropClick}
		>
			<div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full mx-4 animate-scale-in border border-gray-200 dark:border-slate-700">
				<div className="flex items-start p-6">
					<div className="shrink-0">{getIcon()}</div>
					<div className="ml-3 w-0 flex-1">
						<h3 className="text-lg font-medium text-gray-900 dark:text-slate-100">
							{title}
						</h3>
						<div className="mt-2">
							<p className="text-sm text-gray-500 dark:text-slate-400">
								{message}
							</p>
						</div>
					</div>
					<div className="ml-4 shrink-0 flex">
						<button
							className="bg-white dark:bg-slate-800 rounded-md text-gray-400 hover:text-gray-500 dark:hover:text-slate-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
							onClick={onClose}
						>
							<span className="sr-only">Close</span>
							<X className="h-6 w-6" />
						</button>
					</div>
				</div>
				<div className="bg-gray-50 dark:bg-slate-700 px-6 py-3 flex justify-end space-x-3 rounded-b-xl">
					<button
						type="button"
						className="bg-white dark:bg-slate-800 py-2 px-4 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
						onClick={onClose}
					>
						{cancelText}
					</button>
					<button
						type="button"
						className={`py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${getConfirmButtonStyle()}`}
						onClick={() => {
							onConfirm();
							onClose();
						}}
					>
						{confirmText}
					</button>
				</div>
			</div>
		</div>
	);
};

export default ConfirmationDialog;
