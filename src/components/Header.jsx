import { useState } from "react";
import { LogOut, User as UserIcon, ChevronDown, Download, Cloud, CloudOff } from "lucide-react";

function Header({ user, isSaving, isOnline, onExport, onLogout }) {
	const [showUserMenu, setShowUserMenu] = useState(false);

	return (
		<header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg border-b border-gray-100 dark:border-slate-700 shadow-sm">
			<div className="mx-auto max-w-7xl px-4 sm:px-6">
				<div className="flex h-14 sm:h-16 items-center justify-between">
					{/* Title - shorter on mobile */}
					<div className="flex items-center min-w-0 flex-1">
						<h1 className="text-lg sm:text-2xl font-bold bg-linear-to-r from-teal-500 to-cyan-500 bg-clip-text text-transparent truncate">
							<span className="hidden sm:inline">
								Spaced Repetition Flashcards
							</span>
							<span className="sm:hidden">Flashcards</span>
						</h1>
					</div>

					{/* Desktop: Show all items */}
					<div className="hidden md:flex items-center space-x-3 shrink-0">
						{/* User Info */}
						<div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 dark:bg-slate-700">
							<UserIcon className="h-3 w-3 text-gray-600 dark:text-slate-400" />
							<span className="text-xs text-gray-600 dark:text-slate-400 truncate max-w-[120px]">
								{user?.signInDetails?.loginId || "User"}
							</span>
						</div>

						{/* Sync Status Indicator */}
						<div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 dark:bg-slate-700">
							{isSaving ? (
								<>
									<div className="animate-spin h-3 w-3 border-2 border-teal-500 border-t-transparent rounded-full" />
									<span className="text-xs text-gray-600 dark:text-slate-400">
										Saving...
									</span>
								</>
							) : isOnline ? (
								<>
									<Cloud className="h-3 w-3 text-green-500" />
									<span className="text-xs text-gray-600 dark:text-slate-400">
										Synced
									</span>
								</>
							) : (
								<>
									<CloudOff className="h-3 w-3 text-orange-500" />
									<span className="text-xs text-gray-600 dark:text-slate-400">
										Offline
									</span>
								</>
							)}
						</div>

						{/* Export Button */}
						<button
							onClick={onExport}
							className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 font-medium rounded-xl transition-colors duration-200"
							title="Export data"
						>
							<Download className="h-4 w-4" />
							Export
						</button>

						{/* Logout Button */}
						<button
							onClick={onLogout}
							className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 font-medium rounded-xl transition-colors duration-200"
						>
							<LogOut className="h-4 w-4" />
							Logout
						</button>
					</div>

					{/* Mobile: Dropdown menu */}
					<div className="md:hidden relative shrink-0">
						<button
							onClick={() => setShowUserMenu(!showUserMenu)}
							className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg transition-colors duration-200"
						>
							<UserIcon className="h-4 w-4 text-gray-600 dark:text-slate-400" />
							<ChevronDown
								className={`h-4 w-4 text-gray-600 dark:text-slate-400 transition-transform ${
									showUserMenu ? "rotate-180" : ""
								}`}
							/>
						</button>

						{/* Dropdown Menu */}
						{showUserMenu && (
							<>
								{/* Backdrop */}
								<div
									className="fixed inset-0 z-10"
									onClick={() => setShowUserMenu(false)}
								/>
								{/* Menu */}
								<div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 z-20 py-2">
									{/* User Email */}
									<div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700">
										<div className="flex items-center gap-2">
											<UserIcon className="h-4 w-4 text-gray-600 dark:text-slate-400" />
											<span className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">
												{user?.signInDetails?.loginId || "User"}
											</span>
										</div>
									</div>

									{/* Sync Status */}
									<div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700">
										<div className="flex items-center gap-2">
											{isSaving ? (
												<>
													<div className="animate-spin h-4 w-4 border-2 border-teal-500 border-t-transparent rounded-full" />
													<span className="text-sm text-gray-600 dark:text-slate-400">
														Saving...
													</span>
												</>
											) : isOnline ? (
												<>
													<Cloud className="h-4 w-4 text-green-500" />
													<span className="text-sm text-gray-600 dark:text-slate-400">
														Synced
													</span>
												</>
											) : (
												<>
													<CloudOff className="h-4 w-4 text-orange-500" />
													<span className="text-sm text-gray-600 dark:text-slate-400">
														Offline
													</span>
												</>
											)}
										</div>
									</div>

									{/* Export */}
									<button
										onClick={() => {
											setShowUserMenu(false);
											onExport();
										}}
										className="w-full flex items-center gap-2 px-4 py-3 text-left text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors duration-200"
									>
										<Download className="h-4 w-4" />
										Export Data
									</button>

									{/* Logout */}
									<button
										onClick={() => {
											setShowUserMenu(false);
											onLogout();
										}}
										className="w-full flex items-center gap-2 px-4 py-3 text-left text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors duration-200"
									>
										<LogOut className="h-4 w-4" />
										Logout
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

