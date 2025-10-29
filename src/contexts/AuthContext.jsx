import { createContext, useContext, useState, useEffect } from "react";
import {
	signIn,
	signOut,
	signUp,
	confirmSignUp,
	getCurrentUser,
	fetchAuthSession,
} from "aws-amplify/auth";

const AuthContext = createContext();

export function AuthProvider({ children }) {
	const [user, setUser] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const [authToken, setAuthToken] = useState(null);

	// Check if user is already logged in
	useEffect(() => {
		checkUser();
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
			console.log("No user logged in");
			setUser(null);
			setAuthToken(null);
		} finally {
			setIsLoading(false);
		}
	}

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

			return { success: false, error: "Login incomplete", nextStep };
		} catch (error) {
			console.error("Login error:", error);
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
			console.error("Registration error:", error);
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
			console.error("Confirmation error:", error);
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
			console.error("Logout error:", error);
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
	};

	return (
		<AuthContext.Provider value={value}>{children}</AuthContext.Provider>
	);
}

export function useAuth() {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return context;
}
