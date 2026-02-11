import {
	createContext,
	useContext,
	useState,
	useEffect,
	useRef,
	useCallback,
} from 'react';
import {
	signIn,
	signOut,
	signUp,
	confirmSignUp,
	getCurrentUser,
	fetchAuthSession,
	updatePassword,
} from 'aws-amplify/auth';

const AuthContext = createContext();

export function AuthProvider({ children }) {
	const [user, setUser] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const [authToken, setAuthToken] = useState(null);
	const refreshIntervalRef = useRef(null);

	// Check if user is already logged in
	useEffect(() => {
		checkUser();
	}, []);

	const refreshToken = useCallback(async () => {
		try {
			// fetchAuthSession automatically refreshes the token if it's expired
			// and a valid refresh token is available
			const session = await fetchAuthSession({ forceRefresh: true });
			const token = session.tokens?.accessToken?.toString();
			if (token) {
				setAuthToken(token);
				return token;
			}
			return null;
		} catch (error) {
			console.error('Failed to refresh token:', error);
			// If refresh fails, user might need to log in again
			setUser(null);
			setAuthToken(null);
			return null;
		}
	}, []);

	async function checkUser() {
		try {
			const currentUser = await getCurrentUser();
			setUser(currentUser);

			// Get auth token
			const session = await fetchAuthSession();
			const token = session.tokens?.accessToken?.toString();
			setAuthToken(token);
		} catch (error) {
			console.log('No user logged in', error);
			setUser(null);
			setAuthToken(null);
		} finally {
			setIsLoading(false);
		}
	}

	// Set up periodic token refresh (every 45 minutes to refresh before 1 hour expiration)
	useEffect(() => {
		if (!user) {
			// Clear interval if user logs out
			if (refreshIntervalRef.current) {
				clearInterval(refreshIntervalRef.current);
				refreshIntervalRef.current = null;
			}
			return;
		}

		// Refresh token every 45 minutes (2700000 ms)
		// This ensures we refresh before the 1-hour expiration
		refreshIntervalRef.current = setInterval(
			() => {
				refreshToken();
			},
			45 * 60 * 1000
		);

		return () => {
			if (refreshIntervalRef.current) {
				clearInterval(refreshIntervalRef.current);
				refreshIntervalRef.current = null;
			}
		};
	}, [user, refreshToken]);

	async function login(email, password) {
		try {
			const { isSignedIn, nextStep } = await signIn({
				username: email,
				password: password,
			});

			if (isSignedIn) {
				await checkUser();
				return { success: true };
			}

			return { success: false, error: 'Login incomplete', nextStep };
		} catch (error) {
			console.error('Login error:', error);
			return { success: false, error: error.message };
		}
	}

	async function register(email, password) {
		try {
			const { isSignUpComplete, userId, nextStep } = await signUp({
				username: email,
				password: password,
				options: {
					userAttributes: {
						email: email,
					},
					autoSignIn: true,
				},
			});

			return {
				success: true,
				isSignUpComplete,
				userId,
				nextStep,
			};
		} catch (error) {
			console.error('Registration error:', error);
			return { success: false, error: error.message };
		}
	}

	async function confirmRegistration(email, code) {
		try {
			const { isSignUpComplete, nextStep } = await confirmSignUp({
				username: email,
				confirmationCode: code,
			});

			return { success: true, isSignUpComplete, nextStep };
		} catch (error) {
			console.error('Confirmation error:', error);
			return { success: false, error: error.message };
		}
	}

	async function logout() {
		try {
			await signOut();
			setUser(null);
			setAuthToken(null);
			return { success: true };
		} catch (error) {
			console.error('Logout error:', error);
			return { success: false, error: error.message };
		}
	}

	async function changePassword(oldPassword, newPassword) {
		try {
			await updatePassword({
				oldPassword,
				newPassword,
			});
			return { success: true };
		} catch (error) {
			console.error('Password change error:', error);
			return { success: false, error: error.message };
		}
	}

	const value = {
		user,
		authToken,
		isLoading,
		isAuthenticated: !!user,
		login,
		logout,
		register,
		confirmRegistration,
		checkUser,
		changePassword,
		refreshToken,
	};

	return (
		<AuthContext.Provider value={value}>{children}</AuthContext.Provider>
	);
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error('useAuth must be used within an AuthProvider');
	}
	return context;
}
