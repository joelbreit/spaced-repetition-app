import { createContext, useContext, useState, useEffect, useRef } from "react";
import { useAuth } from "./AuthContext";
import { useNotification } from "../hooks/useNotification";
import { loadFromAPI, saveToAPI, checkAPIHealth } from "../services/apiStorage";

const AppDataContext = createContext();

// Initial sample data (used only if API has no data)
const initialData = {
	decks: [
		{
			deckId: "1",
			deckName: "Spanish Vocabulary",
			cards: [
				{
					cardId: "1",
					front: "Hello",
					back: "Hola",
					reviews: [],
					whenDue: Date.now(),
				},
				{
					cardId: "2",
					front: "Goodbye",
					back: "Adiós",
					reviews: [],
					whenDue: Date.now(),
				},
			],
		},
		{
			deckId: "2",
			deckName: "Math Facts",
			cards: [
				{
					cardId: "3",
					front: "2 + 2",
					back: "4",
					reviews: [],
					whenDue: Date.now(),
				},
			],
		},
	],
};

export function AppDataProvider({ children }) {
	const { authToken, isAuthenticated } = useAuth();
	const { showSuccess, showError, showWarning } = useNotification();

	const [appData, setAppData] = useState(initialData);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [isOnline, setIsOnline] = useState(true);

	const saveTimeoutRef = useRef(null);
	const lastSaveTime = useRef(null);
	const appDataRef = useRef(appData);
	const healthCheckInProgress = useRef(false);

	// Check API health on mount
	useEffect(() => {
		async function checkHealth() {
			if (healthCheckInProgress.current) {
				return;
			}

			healthCheckInProgress.current = true;
			try {
				const healthy = await checkAPIHealth();
				setIsOnline(healthy);
			} finally {
				healthCheckInProgress.current = false;
			}
		}
		checkHealth();
	}, []);

	// Load from API on mount
	useEffect(() => {
		async function loadData() {
			if (!isAuthenticated || !authToken) return;

			setIsLoading(true);
			try {
				const cloudData = await loadFromAPI(authToken);

				if (
					!cloudData ||
					!cloudData.decks ||
					cloudData.decks.length === 0
				) {
					const localData = localStorage.getItem("spacedRepData");
					if (localData) {
						const parsed = JSON.parse(localData);
						setAppData(parsed);
						await saveToAPI(parsed, authToken);
						lastSaveTime.current = Date.now();
						showSuccess("Local data synced to cloud");
					} else {
						setAppData(initialData);
					}
				} else {
					setAppData(cloudData);
					localStorage.setItem(
						"spacedRepData",
						JSON.stringify(cloudData)
					);
				}

				setIsOnline(true);
			} catch (error) {
				console.error("Failed to load from API:", error);
				showError(
					"Failed to load data from cloud. Using local backup."
				);
				setIsOnline(false);

				const localData = localStorage.getItem("spacedRepData");
				if (localData) {
					setAppData(JSON.parse(localData));
				} else {
					setAppData(initialData);
				}
			} finally {
				setIsLoading(false);
			}
		}
		loadData();
	}, [isAuthenticated, authToken, showError, showSuccess]);

	// Keep appDataRef in sync with appData
	useEffect(() => {
		appDataRef.current = appData;
	}, [appData]);

	// Auto-save data to cloud with minimum 10-second interval
	useEffect(() => {
		if (isLoading || !isAuthenticated || !authToken) return;

		const currentAuthToken = authToken;

		if (saveTimeoutRef.current) {
			return;
		}

		const performSave = async () => {
			setIsSaving(true);
			const dataToSave = appDataRef.current;
			const tokenToUse = currentAuthToken;
			try {
				await saveToAPI(dataToSave, tokenToUse);
				localStorage.setItem(
					"spacedRepData",
					JSON.stringify(dataToSave)
				);
				setIsOnline(true);
				lastSaveTime.current = Date.now();
			} catch (error) {
				console.error("Failed to save to API:", error);
				showError("Failed to save to cloud. Data saved locally.");
				setIsOnline(false);
				localStorage.setItem(
					"spacedRepData",
					JSON.stringify(dataToSave)
				);
				lastSaveTime.current = Date.now();
			} finally {
				setIsSaving(false);
				saveTimeoutRef.current = null;
			}
		};

		const now = Date.now();
		const timeSinceLastSave = lastSaveTime.current
			? now - lastSaveTime.current
			: Infinity;
		const MIN_SAVE_INTERVAL = 10000; // 10 seconds

		const delay = Math.max(0, MIN_SAVE_INTERVAL - timeSinceLastSave);
		saveTimeoutRef.current = setTimeout(performSave, delay);

		return () => {
			if (saveTimeoutRef.current) {
				clearTimeout(saveTimeoutRef.current);
				saveTimeoutRef.current = null;
			}
		};
	}, [appData, isLoading, isAuthenticated, authToken, showError]);

	const value = {
		appData,
		setAppData,
		isLoading,
		isSaving,
		isOnline,
	};

	return (
		<AppDataContext.Provider value={value}>
			{children}
		</AppDataContext.Provider>
	);
}

export function useAppData() {
	const context = useContext(AppDataContext);
	if (context === undefined) {
		throw new Error("useAppData must be used within an AppDataProvider");
	}
	return context;
}

