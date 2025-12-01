import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useNotification } from "../hooks/useNotification";
import { useAppData } from "../contexts/AppDataContext";
import Header from "../components/Header";
import Footer from "../components/Footer";
import NotificationContainer from "../components/NotificationContainer";
import {
	ArrowLeft,
	Download,
	LogOut,
	User as UserIcon,
	Cloud,
	CloudOff,
} from "lucide-react";

function ProfilePage() {
	const navigate = useNavigate();
	const { user, logout } = useAuth();
	const { showSuccess, showError } = useNotification();
	const { appData, isSaving, isOnline } = useAppData();

	// Handle logout
	const handleLogout = async () => {
		const result = await logout();
		if (result.success) {
			showSuccess("Logged out successfully");
			navigate("/");
		}
	};

	// Handle export data
	const handleExportData = () => {
		try {
			const dataStr = JSON.stringify(appData, null, 2);
			const dataBlob = new Blob([dataStr], { type: "application/json" });
			const url = URL.createObjectURL(dataBlob);
			const link = document.createElement("a");
			link.href = url;
			link.download = `flashcards-export-${
				new Date().toISOString().split("T")[0]
			}.json`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);
			showSuccess("Data exported successfully!");
		} catch (error) {
			console.error("Failed to export data:", error);
			showError("Failed to export data");
		}
	};

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col">
			<NotificationContainer />
			<Header user={user} isSaving={isSaving} isOnline={isOnline} />

			<main className="flex-1 mx-auto max-w-7xl px-6 py-8 w-full">
				{/* Back Button */}
				<button
					onClick={() => navigate("/")}
					className="flex items-center gap-2 text-gray-600 dark:text-slate-400 hover:text-teal-500 dark:hover:text-teal-400 mb-6 transition-colors duration-200"
				>
					<ArrowLeft className="h-5 w-5" />
					<span>Back to Overview</span>
				</button>

				{/* Profile Header */}
				<div className="mb-8">
					<h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-slate-100 mb-2">
						Profile
					</h1>
					<p className="text-gray-600 dark:text-slate-400">
						Manage your account and settings
					</p>
				</div>

				{/* Profile Cards */}
				<div className="space-y-6 max-w-2xl">
					{/* User Information Card */}
					<div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
						<div className="flex items-center gap-3 mb-4">
							<div className="p-3 bg-teal-100 dark:bg-teal-900/30 rounded-full">
								<UserIcon className="h-6 w-6 text-teal-600 dark:text-teal-400" />
							</div>
							<h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
								Account Information
							</h2>
						</div>
						<div className="space-y-3">
							<div>
								<label className="text-sm text-gray-500 dark:text-slate-500">
									Email
								</label>
								<p className="text-gray-900 dark:text-slate-100 font-medium">
									{user?.signInDetails?.loginId ||
										"Not available"}
								</p>
							</div>
						</div>
					</div>

					{/* Actions Card */}
					<div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
						<h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-4">
							Actions
						</h2>
						<div className="space-y-3">
							{/* Export Button */}
							<button
								onClick={handleExportData}
								className="w-full flex items-center gap-3 px-4 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-900 dark:text-slate-100 font-medium rounded-xl transition-colors duration-200"
							>
								<Download className="h-5 w-5" />
								<div className="flex-1 text-left">
									<div className="font-medium">
										Export Data
									</div>
									<div className="text-sm text-gray-600 dark:text-slate-400">
										Download your flashcards as JSON
									</div>
								</div>
							</button>

							{/* Logout Button */}
							<button
								onClick={handleLogout}
								className="w-full flex items-center gap-3 px-4 py-3 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 font-medium rounded-xl transition-colors duration-200"
							>
								<LogOut className="h-5 w-5" />
								<div className="flex-1 text-left">
									<div className="font-medium">Logout</div>
									<div className="text-sm text-red-500 dark:text-red-400/70">
										Sign out of your account
									</div>
								</div>
							</button>
						</div>
					</div>
				</div>
			</main>

			<Footer />
		</div>
	);
}

export default ProfilePage;
