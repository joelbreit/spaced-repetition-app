import { useState, useEffect } from 'react';
import { Mail, Lock, X, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAppData } from '../contexts/AppDataContext';

export default function AuthView({ onClose }) {
	const { isAuthenticated, login, register, confirmRegistration } = useAuth();
	const { appData, hasGuestEdits } = useAppData();
	const [isLogin, setIsLogin] = useState(true);
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [confirmationCode, setConfirmationCode] = useState('');
	const [needsConfirmation, setNeedsConfirmation] = useState(false);
	const [error, setError] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [exportOnSignup, setExportOnSignup] = useState(true);

	// Close modal if user becomes authenticated
	useEffect(() => {
		if (isAuthenticated && onClose) {
			onClose();
		}
	}, [isAuthenticated, onClose]);

	const triggerExport = () => {
		const dataToExport = {
			...appData,
			decks: appData.decks.filter(
				(d) => d.deckId !== 'demo-getting-started'
			),
		};
		const dataStr = JSON.stringify(dataToExport, null, 2);
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
	};

	async function handleSubmit(e) {
		e.preventDefault();
		setError('');
		setIsLoading(true);

		try {
			if (needsConfirmation) {
				// Confirm registration
				const result = await confirmRegistration(
					email,
					confirmationCode
				);
				if (result.success) {
					setNeedsConfirmation(false);
					setIsLogin(true);
					setError('');

					// After confirmation, auto-login
					await login(email, password);
				} else {
					setError(result.error || 'Confirmation failed');
				}
			} else if (isLogin) {
				// Login
				const result = await login(email, password);
				if (!result.success) {
					setError(result.error || 'Login failed');
				}
			} else {
				// Register — export data first if requested
				if (hasGuestEdits && exportOnSignup) {
					triggerExport();
				}
				const result = await register(email, password);
				if (result.success) {
					if (result.nextStep?.signUpStep === 'CONFIRM_SIGN_UP') {
						setNeedsConfirmation(true);
						setError('');
					}
				} else {
					setError(result.error || 'Registration failed');
				}
			}
		} catch (err) {
			setError(err.message || 'An error occurred');
		} finally {
			setIsLoading(false);
		}
	}

	const handleBackdropClick = (e) => {
		if (e.target === e.currentTarget && onClose) {
			onClose();
		}
	};

	return (
		<div
			className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6 z-50"
			onClick={handleBackdropClick}
		>
			<div className="w-full max-w-md relative">
				{/* Close button */}
				{onClose && (
					<button
						onClick={onClose}
						className="absolute -top-12 right-0 text-white hover:text-gray-200 transition-colors"
						aria-label="Close"
					>
						<X className="h-6 w-6" />
					</button>
				)}

				{/* Logo/Title */}
				<div className="text-center mb-8">
					<div className="text-6xl mb-4">📚</div>
					<h1 className="text-4xl font-bold text-white mb-2">
						Spaced Repetition
					</h1>
					<p className="text-teal-100">
						Master anything with flashcards
					</p>
				</div>

				{/* Auth Card */}
				<div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8">
					{needsConfirmation ? (
						<>
							<h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2">
								Verify Your Email
							</h2>
							<p className="text-gray-600 dark:text-slate-400 mb-6">
								We sent a verification code to {email}
							</p>

							<form onSubmit={handleSubmit} className="space-y-4">
								<div>
									<label className="block text-sm font-semibold text-gray-600 dark:text-slate-400 mb-2">
										Verification Code
									</label>
									<input
										type="text"
										value={confirmationCode}
										onChange={(e) =>
											setConfirmationCode(e.target.value)
										}
										placeholder="Enter 6-digit code"
										className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
										required
									/>
								</div>

								{error && (
									<div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400 text-sm">
										<AlertCircle className="h-4 w-4" />
										{error}
									</div>
								)}

								<button
									type="submit"
									disabled={isLoading}
									className="w-full px-6 py-3 bg-linear-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									{isLoading
										? 'Verifying...'
										: 'Verify Email'}
								</button>

								<button
									type="button"
									onClick={() => setNeedsConfirmation(false)}
									className="w-full text-gray-600 dark:text-slate-400 text-sm hover:text-gray-900 dark:hover:text-slate-200"
								>
									Back to {isLogin ? 'Login' : 'Sign Up'}
								</button>
							</form>
						</>
					) : (
						<>
							<h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-6">
								{isLogin ? 'Welcome Back' : 'Create Account'}
							</h2>

							<form onSubmit={handleSubmit} className="space-y-4">
								<div>
									<label className="block text-sm font-semibold text-gray-600 dark:text-slate-400 mb-2">
										Email
									</label>
									<div className="relative">
										<Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
										<input
											type="email"
											value={email}
											onChange={(e) =>
												setEmail(e.target.value)
											}
											placeholder="you@example.com"
											className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
											required
										/>
									</div>
								</div>

								<div>
									<label className="block text-sm font-semibold text-gray-600 dark:text-slate-400 mb-2">
										Password
									</label>
									<div className="relative">
										<Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
										<input
											type="password"
											value={password}
											onChange={(e) =>
												setPassword(e.target.value)
											}
											placeholder="••••••••"
											className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
											required
											minLength={8}
										/>
									</div>
									{!isLogin && (
										<p className="mt-1 text-xs text-gray-500 dark:text-slate-500">
											At least 8 characters with a number
										</p>
									)}
								</div>

								{/* Export checkbox — only shown on signup when guest has edits */}
								{!isLogin && hasGuestEdits && (
									<label className="flex items-start gap-3 cursor-pointer">
										<input
											type="checkbox"
											checked={exportOnSignup}
											onChange={(e) =>
												setExportOnSignup(
													e.target.checked
												)
											}
											className="mt-0.5 h-4 w-4 rounded border-gray-300 text-teal-500 focus:ring-teal-500"
										/>
										<div>
											<span className="text-sm font-medium text-gray-700 dark:text-slate-300">
												Download my flashcards before
												signing up
											</span>
											<p className="text-xs text-gray-500 dark:text-slate-500 mt-0.5">
												You can import this data after
												logging in.
											</p>
										</div>
									</label>
								)}

								{error && (
									<div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400 text-sm">
										<AlertCircle className="h-4 w-4" />
										{error}
									</div>
								)}

								<button
									type="submit"
									disabled={isLoading}
									className="w-full px-6 py-3 bg-linear-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									{isLoading
										? 'Please wait...'
										: isLogin
											? 'Sign In'
											: 'Sign Up'}
								</button>
							</form>

							<div className="mt-6 text-center">
								<button
									onClick={() => {
										setIsLogin(!isLogin);
										setError('');
									}}
									className="text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-medium"
								>
									{isLogin
										? "Don't have an account? Sign up"
										: 'Already have an account? Sign in'}
								</button>
							</div>
						</>
					)}
				</div>
			</div>
		</div>
	);
}
