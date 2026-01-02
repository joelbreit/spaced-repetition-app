import { useState, useEffect } from "react";
import { X, Cloud } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export default function DemoBanner() {
	const { isAuthenticated } = useAuth();
	const [isDismissed, setIsDismissed] = useState(false);

	// Load dismiss state from localStorage
	useEffect(() => {
		const dismissed = localStorage.getItem("demoBannerDismissed");
		if (dismissed === "true") {
			setIsDismissed(true);
		}
	}, []);

	// Don't show if authenticated or dismissed
	if (isAuthenticated || isDismissed) {
		return null;
	}

	const handleDismiss = () => {
		setIsDismissed(true);
		localStorage.setItem("demoBannerDismissed", "true");
	};

	return (
		<div className="bg-teal-50 dark:bg-teal-900/20 border-b border-teal-200 dark:border-teal-800 px-4 py-3">
			<div className="mx-auto max-w-7xl flex items-center justify-between gap-4">
				<div className="flex items-center gap-3 flex-1">
					<Cloud className="h-5 w-5 text-teal-600 dark:text-teal-400 shrink-0" />
					<p className="text-sm text-teal-800 dark:text-teal-200">
						Your changes are stored locally and can be saved by signing up, but are not guaranteed to be retained otherwise.
					</p>
				</div>
				<button
					onClick={handleDismiss}
					className="text-teal-600 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-200 transition-colors shrink-0"
					aria-label="Dismiss banner"
				>
					<X className="h-5 w-5" />
				</button>
			</div>
		</div>
	);
}

