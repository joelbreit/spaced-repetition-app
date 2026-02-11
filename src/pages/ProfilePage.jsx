import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../hooks/useNotification';
import { useAppData } from '../contexts/AppDataContext';
import Header from '../components/Header';
import Footer from '../components/Footer';
import NotificationContainer from '../components/NotificationContainer';
import ActivityHeatmap from '../components/Profile/ActivityHeatmap';
import ProgressChart from '../components/Profile/ProgressChart';
import AdditionalStats from '../components/Profile/AdditionalStats';
import {
	ArrowLeft,
	Download,
	LogOut,
	User as UserIcon,
	Lock,
	ChevronDown,
	ChevronUp,
} from 'lucide-react';

function ProfilePage() {
	const navigate = useNavigate();
	const { user, logout, changePassword } = useAuth();
	const { showSuccess, showError } = useNotification();
	const { appData, isSaving, isOnline } = useAppData();

	// Password change form state
	const [showPasswordChange, setShowPasswordChange] = useState(false);
	const [currentPassword, setCurrentPassword] = useState('');
	const [newPassword, setNewPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [isChangingPassword, setIsChangingPassword] = useState(false);
	const [passwordError, setPasswordError] = useState('');

	// Handle logout
	const handleLogout = async () => {
		const result = await logout();
		if (result.success) {
			showSuccess('Logged out successfully');
			navigate('/');
		}
	};

	// Handle export data
	const handleExportData = () => {
		try {
			const dataStr = JSON.stringify(appData, null, 2);
			const dataBlob = new Blob([dataStr], { type: 'application/json' });
			const url = URL.createObjectURL(dataBlob);
			const link = document.createElement('a');
			link.href = url;
			link.download = `flashcards-export-${
				new Date().toISOString().split('T')[0]
			}.json`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);
			showSuccess('Data exported successfully!');
		} catch (error) {
			console.error('Failed to export data:', error);
			showError('Failed to export data');
		}
	};

	// Handle password change
	const handlePasswordChange = async (e) => {
		e.preventDefault();
		setPasswordError('');

		// Validation
		if (!currentPassword || !newPassword || !confirmPassword) {
			setPasswordError('All fields are required');
			return;
		}

		if (newPassword.length < 8) {
			setPasswordError('New password must be at least 8 characters');
			return;
		}

		if (newPassword !== confirmPassword) {
			setPasswordError('New passwords do not match');
			return;
		}

		if (currentPassword === newPassword) {
			setPasswordError(
				'New password must be different from current password'
			);
			return;
		}

		setIsChangingPassword(true);

		try {
			const result = await changePassword(currentPassword, newPassword);
			if (result.success) {
				showSuccess('Password changed successfully!');
				setCurrentPassword('');
				setNewPassword('');
				setConfirmPassword('');
				setShowPasswordChange(false);
				setPasswordError('');
			} else {
				setPasswordError(result.error || 'Failed to change password');
				showError(result.error || 'Failed to change password');
			}
		} catch (error) {
			console.error('Password change error:', error);
			setPasswordError(error.message || 'An unexpected error occurred');
			showError(error.message || 'Failed to change password');
		} finally {
			setIsChangingPassword(false);
		}
	};

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col">
			<NotificationContainer />
			<Header user={user} isSaving={isSaving} isOnline={isOnline} />

			<main className="flex-1 mx-auto max-w-7xl px-6 py-8 w-full">
				{/* Profile Header */}
				<div className="mb-8">
					<h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-slate-100 mb-2">
						Profile
					</h1>
					<p className="text-gray-600 dark:text-slate-400">
						Manage your account and settings
					</p>
				</div>

				{/* Profile Content */}
				<div className="grid grid-cols-1 gap-6">
					{/* Left Column - User Info and Actions */}
					<div className="lg:col-span-1 space-y-6">
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
											'Not available'}
									</p>
								</div>
							</div>
						</div>
						<ActivityHeatmap appData={appData} />
					</div>

					{/* Right Column */}
					<div className="lg:col-span-1 space-y-6">
						{/* Progress Chart */}
						<ProgressChart appData={appData} />
						{/* Additional Statistics */}
						<AdditionalStats appData={appData} />
						{/* Change Password Card */}
						<div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
							<button
								onClick={() => {
									setShowPasswordChange(!showPasswordChange);
									setPasswordError('');
									if (showPasswordChange) {
										setCurrentPassword('');
										setNewPassword('');
										setConfirmPassword('');
									}
								}}
								className={`w-full flex items-center justify-between${
									showPasswordChange ? ' mb-4' : ''
								}`}
							>
								<div className="flex items-center gap-3">
									<div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
										<Lock className="h-5 w-5 text-teal-600 dark:text-teal-400" />
									</div>
									<h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
										Change Password
									</h2>
								</div>
								{showPasswordChange ? (
									<ChevronUp className="h-5 w-5 text-gray-400" />
								) : (
									<ChevronDown className="h-5 w-5 text-gray-400" />
								)}
							</button>

							{showPasswordChange && (
								<form
									onSubmit={handlePasswordChange}
									className="space-y-4"
								>
									{/* Current Password */}
									<div>
										<label className="block text-sm font-semibold text-gray-600 dark:text-slate-400 mb-2">
											Current Password
										</label>
										<div className="relative">
											<Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
											<input
												type="password"
												value={currentPassword}
												onChange={(e) =>
													setCurrentPassword(
														e.target.value
													)
												}
												placeholder="Enter current password"
												className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
												required
												disabled={isChangingPassword}
											/>
										</div>
									</div>

									{/* New Password */}
									<div>
										<label className="block text-sm font-semibold text-gray-600 dark:text-slate-400 mb-2">
											New Password
										</label>
										<div className="relative">
											<Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
											<input
												type="password"
												value={newPassword}
												onChange={(e) =>
													setNewPassword(
														e.target.value
													)
												}
												placeholder="Enter new password"
												className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
												required
												minLength={8}
												disabled={isChangingPassword}
											/>
										</div>
										<p className="mt-1 text-xs text-gray-500 dark:text-slate-500">
											At least 8 characters with a number
										</p>
									</div>

									{/* Confirm New Password */}
									<div>
										<label className="block text-sm font-semibold text-gray-600 dark:text-slate-400 mb-2">
											Confirm New Password
										</label>
										<div className="relative">
											<Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
											<input
												type="password"
												value={confirmPassword}
												onChange={(e) =>
													setConfirmPassword(
														e.target.value
													)
												}
												placeholder="Confirm new password"
												className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
												required
												minLength={8}
												disabled={isChangingPassword}
											/>
										</div>
									</div>

									{/* Error Message */}
									{passwordError && (
										<div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400 text-sm">
											{passwordError}
										</div>
									)}

									{/* Submit Button */}
									<button
										type="submit"
										disabled={isChangingPassword}
										className="w-full px-6 py-3 bg-linear-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
									>
										{isChangingPassword
											? 'Changing Password...'
											: 'Change Password'}
									</button>
								</form>
							)}
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
										<div className="font-medium">
											Logout
										</div>
										<div className="text-sm text-red-500 dark:text-red-400/70">
											Sign out of your account
										</div>
									</div>
								</button>
							</div>
						</div>
					</div>
				</div>
			</main>

			<Footer />
		</div>
	);
}

export default ProfilePage;
