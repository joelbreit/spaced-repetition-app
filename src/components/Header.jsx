import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
	User as UserIcon,
	ChevronDown,
	Cloud,
	CloudOff,
	Flame,
	BookOpen,
	LogIn,
	Sun,
	Moon,
	Monitor,
} from 'lucide-react';
import { useAppData } from '../contexts/AppDataContext';
import { useAuth } from '../contexts/AuthContext';
import { loadFromAPI } from '../services/apiStorage';
import { useNotification } from '../hooks/useNotification';
import { calculateStreakStats } from '../services/streak';
import { useTheme } from '../contexts/ThemeContext';

const THEME_OPTIONS = {
	system: { Icon: Monitor, label: 'System theme' },
	light: { Icon: Sun, label: 'Light theme' },
	dark: { Icon: Moon, label: 'Dark theme' },
};

function Header({ user, isSaving, isOnline, onSignInClick }) {
	const { isAuthenticated, authToken, refreshToken } = useAuth();
	const [showUserMenu, setShowUserMenu] = useState(false);
	const [isSyncing, setIsSyncing] = useState(false);
	const navigate = useNavigate();
	const { appData, setAppData } = useAppData();
	const { showSuccess, showError } = useNotification();
	const { preference: themePreference, toggleTheme } = useTheme();
	const { Icon: ThemeIcon, label: themeLabel } =
		THEME_OPTIONS[themePreference];

	const { streak, reviewsToday } = useMemo(
		() => calculateStreakStats(appData?.decks),
		[appData]
	);

	const handleSync = async () => {
		if (!isAuthenticated || !authToken) {
			return;
		}

		setIsSyncing(true);
		try {
			// Refresh the auth token first
			const newToken = await refreshToken();
			const tokenToUse = newToken || authToken;

			// Load data from API
			const cloudData = await loadFromAPI(tokenToUse, refreshToken);

			if (cloudData) {
				// Update appData with the loaded data
				setAppData(cloudData);
				showSuccess('Data synced from cloud successfully');
			}
		} catch (error) {
			console.error('Failed to sync from API:', error);
			showError('Failed to sync from cloud. Please try again.');
		} finally {
			setIsSyncing(false);
		}
	};

	const getSyncTitle = () => {
		if (!isAuthenticated) return 'Local storage';
		if (isSyncing || isSaving) return 'Syncing...';
		return 'Click to sync';
	};

	const isStreakActive = reviewsToday > 0;
	const streakClasses = isStreakActive
		? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
		: 'bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-600';
	const flameIconClasses = isStreakActive
		? 'text-orange-500'
		: 'text-gray-400 dark:text-slate-500';
	const streakTextClasses = isStreakActive
		? 'text-orange-700 dark:text-orange-300'
		: 'text-gray-500 dark:text-slate-400';

	return (
		<header className="relative z-30 bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg border-b border-gray-100 dark:border-slate-700 shadow-sm">
			<div className="mx-auto max-w-7xl px-4 sm:px-6">
				<div className="flex h-14 sm:h-16 items-center justify-between">
					{/* Title - shorter on mobile */}
					<div className="flex items-center min-w-0 flex-1">
						<h1
							onClick={() => navigate('/')}
							className="text-lg sm:text-2xl font-bold bg-linear-to-r from-teal-500 to-cyan-500 bg-clip-text text-transparent truncate cursor-pointer hover:opacity-80 transition-opacity"
						>
							<span className="hidden lg:inline">
								Spaced Repetition Flashcards
							</span>
							<span className="lg:hidden">Flashcards</span>
						</h1>
					</div>

					{/* Stats and Actions - Responsive */}
					<div className="flex items-center gap-1 sm:gap-3 shrink-0 sm:mr-0 mr-2">
						{/* Streak */}
						<div
							className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 rounded-full border ${streakClasses}`}
						>
							<Flame className={`h-4 w-4 ${flameIconClasses}`} />
							<span
								className={`text-xs font-medium ${streakTextClasses}`}
							>
								<span className="sm:hidden">{streak}</span>
								<span className="hidden sm:inline">
									{streak} {streak === 1 ? 'day' : 'days'}
								</span>
							</span>
						</div>

						{/* Reviews Today */}
						<div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800">
							<BookOpen className="h-4 w-4 text-teal-500" />
							<span className="text-xs font-medium text-teal-700 dark:text-teal-300">
								<span className="sm:hidden">
									{reviewsToday}
								</span>
								<span className="hidden sm:inline">
									{reviewsToday}{' '}
									{reviewsToday === 1 ? 'review' : 'reviews'}
								</span>
							</span>
						</div>

						{/* Sync Status Indicator */}
						<button
							onClick={handleSync}
							disabled={!isAuthenticated || isSyncing || isSaving}
							className="flex items-center justify-center sm:justify-start gap-0 sm:gap-2 w-7 h-7 sm:w-auto sm:h-auto px-0 sm:px-3 py-0 sm:py-1 rounded-full bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							title={getSyncTitle()}
						>
							{!isAuthenticated ? (
								<>
									<Cloud className="h-3 w-3 text-gray-500" />
									<span className="hidden sm:inline text-xs text-gray-600 dark:text-slate-400">
										Local
									</span>
								</>
							) : isSyncing || isSaving ? (
								<>
									<div className="animate-spin h-3 w-3 border-2 border-teal-500 border-t-transparent rounded-full" />
									<span className="hidden sm:inline text-xs text-gray-600 dark:text-slate-400">
										Syncing...
									</span>
								</>
							) : isOnline ? (
								<>
									<Cloud className="h-3 w-3 text-green-500" />
									<span className="hidden sm:inline text-xs text-gray-600 dark:text-slate-400">
										Synced
									</span>
								</>
							) : (
								<>
									<CloudOff className="h-3 w-3 text-orange-500" />
									<span className="hidden sm:inline text-xs text-gray-600 dark:text-slate-400">
										Offline
									</span>
								</>
							)}
						</button>

						{/* Theme - Desktop only (mobile has it in the menu) */}
						<button
							onClick={toggleTheme}
							className="hidden sm:flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-600 dark:text-slate-300 transition-colors"
							title={`${themeLabel} (click to change)`}
							aria-label={`${themeLabel}. Click to change.`}
						>
							<ThemeIcon className="h-4 w-4" />
						</button>

						{/* Profile or Sign In Button - Desktop only */}
						{isAuthenticated ? (
							<button
								onClick={() => navigate('/profile')}
								className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 font-medium rounded-xl transition-colors duration-200"
								title="View Profile"
							>
								<UserIcon className="h-4 w-4" />
								Profile
							</button>
						) : (
							<button
								onClick={onSignInClick}
								className="hidden sm:flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-xl transition-colors duration-200"
								title="Sign In"
							>
								<LogIn className="h-4 w-4" />
								Sign In
							</button>
						)}
					</div>

					{/* Mobile: Dropdown menu */}
					<div className="sm:hidden relative shrink-0">
						<button
							onClick={() => setShowUserMenu(!showUserMenu)}
							className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg transition-colors duration-200"
						>
							<UserIcon className="h-4 w-4 text-gray-600 dark:text-slate-400" />
							<ChevronDown
								className={`h-4 w-4 text-gray-600 dark:text-slate-400 transition-transform ${
									showUserMenu ? 'rotate-180' : ''
								}`}
							/>
						</button>

						{/* Dropdown Menu */}
						{showUserMenu && (
							<>
								{/* Backdrop */}
								<div
									className="fixed inset-0 z-40"
									onClick={() => setShowUserMenu(false)}
								/>
								{/* Menu */}
								<div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 z-50 py-2">
									{/* User Email */}
									<div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700">
										<div className="flex items-center gap-2">
											<UserIcon className="h-4 w-4 text-gray-600 dark:text-slate-400" />
											<span className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">
												{user?.signInDetails?.loginId ||
													'User'}
											</span>
										</div>
									</div>

									{/* Profile or Sign In */}
									{isAuthenticated ? (
										<button
											onClick={() => {
												setShowUserMenu(false);
												navigate('/profile');
											}}
											className="w-full flex items-center gap-2 px-4 py-3 text-left text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors duration-200"
										>
											<UserIcon className="h-4 w-4" />
											View Profile
										</button>
									) : (
										<button
											onClick={() => {
												setShowUserMenu(false);
												if (onSignInClick)
													onSignInClick();
											}}
											className="w-full flex items-center gap-2 px-4 py-3 text-left text-sm text-teal-600 dark:text-teal-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors duration-200"
										>
											<LogIn className="h-4 w-4" />
											Sign In
										</button>
									)}

									<button
										onClick={toggleTheme}
										className="w-full flex items-center gap-2 px-4 py-3 text-left text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors duration-200"
									>
										<ThemeIcon className="h-4 w-4" />
										{themeLabel}
									</button>
								</div>
							</>
						)}
					</div>
				</div>
			</div>
		</header>
	);
}

export default Header;
