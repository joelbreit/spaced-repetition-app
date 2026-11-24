import {
	createContext,
	useContext,
	useState,
	useEffect,
	useRef,
	useCallback,
} from 'react';
import { useAuth } from './AuthContext';
import { useNotification } from '../hooks/useNotification';
import { DEFAULT_DECK_ICON } from '../config/containerIcons';
import {
	loadFromAPI,
	saveToAPI,
	patchToAPI,
	checkAPIHealth,
	loadReviewsFromAPI,
	saveReviewsToAPI,
} from '../services/apiStorage';
import { migrateGrades } from '../services/grades';
import {
	attachReviews,
	stripReviews,
	collectReviews,
	diffReviews,
	reviewKey,
} from '../services/reviewLog';
import { resolveNotes, stripNoteFields } from '../services/notes';
import { computePatchData } from '../services/savePatch';

const AppDataContext = createContext();

// Demo data for guest users - tutorial cards explaining how to use the app
const demoData = {
	folders: [],
	decks: [
		{
			deckId: 'demo-getting-started',
			deckName: 'Getting Started',
			deckSymbol: DEFAULT_DECK_ICON,
			cards: [
				{
					cardId: 'demo-1',
					front: 'What is spaced repetition?',
					back: 'Spaced repetition is a learning technique that reviews cards at increasing intervals. Cards you struggle with appear more often, while cards you know well appear less frequently. This helps you learn more efficiently!',
					reviews: [],
					whenDue: Date.now(),
				},
				{
					cardId: 'demo-2',
					front: 'Why are there 4 result buttons?',
					back: "Each button decides when you'll see the card next: start it over (Unfamiliar), shorten the interval (Too Difficult), keep it (Effortful), or lengthen it (Too Easy). The time under each button shows when the card would come back.",
					reviews: [],
					whenDue: Date.now(),
				},
				{
					cardId: 'demo-3',
					front: "What does 'Unfamiliar' mean?",
					back: "Unfamiliar means you didn't know the answer. It starts the card over at the minimum interval, e.g. 10 minutes.",
					reviews: [],
					whenDue: Date.now(),
				},
				{
					cardId: 'demo-4',
					front: "What does 'Too Difficult' mean?",
					back: "Too Difficult means you remembered, but it was harder than you'd like. It halves the review interval so you'll see the card sooner next time.",
					reviews: [],
					whenDue: Date.now(),
				},
				{
					cardId: 'demo-5',
					front: "What does 'Effortful' mean?",
					back: 'Effortful means the interval was about right: remembering took some effort, but not too much. It keeps the same interval as last time.',
					reviews: [],
					whenDue: Date.now(),
				},
				{
					cardId: 'demo-6',
					front: "What does 'Too Easy' mean?",
					back: "Too Easy means it could have waited longer. It doubles the review interval so you'll see the card later next time.",
					reviews: [],
					whenDue: Date.now(),
				},
			],
		},
	],
};

// Demo cards are written with their text; resolveNotes gives them notes
const demoState = resolveNotes(demoData);

// The app data as data.json stores it: no reviews (they're in the review
// log) and no card text (it's in the notes)
const toStored = (data) => stripNoteFields(stripReviews(data));

export function AppDataProvider({ children }) {
	const { authToken, isAuthenticated, refreshToken } = useAuth();
	const { showError } = useNotification();

	const [appData, setAppDataRaw] = useState(demoState);

	// Every update is brought in line with its notes, so cards always show
	// their note's text and partner, and unused notes are dropped
	const setAppData = useCallback(
		(updater) =>
			setAppDataRaw((prev) =>
				resolveNotes(
					typeof updater === 'function' ? updater(prev) : updater
				)
			),
		[]
	);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [isOnline, setIsOnline] = useState(true);
	const [hasGuestEdits, setHasGuestEdits] = useState(false);

	const saveTimeoutRef = useRef(null);
	const lastSaveTime = useRef(null);
	const appDataRef = useRef(appData);
	// data.json as last saved: the app data without reviews
	const lastSavedStateRef = useRef(null);
	// The reviews the review log holds, keyed by cardId and reviewId
	const savedReviewsRef = useRef(new Map());
	const hasLoadedFromCloudRef = useRef(false);
	const healthCheckInProgress = useRef(false);

	// Wrapped setter that tracks guest edits
	const setAppDataTracked = useCallback(
		(updater) => {
			if (!isAuthenticated) {
				setHasGuestEdits(true);
			}
			setAppData(updater);
		},
		[isAuthenticated, setAppData]
	);

	// Check API health on mount (only for authenticated users)
	useEffect(() => {
		if (!isAuthenticated) {
			setIsOnline(false); // Guests are always "offline" (local only)
			return;
		}

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
	}, [isAuthenticated]);

	// Load data - from API if authenticated, in-memory demo data if guest
	useEffect(() => {
		async function loadData() {
			setIsLoading(true);

			// Guest mode: always start from demo data (in-memory only, no persistence)
			if (!isAuthenticated || !authToken) {
				hasLoadedFromCloudRef.current = false;
				savedReviewsRef.current = new Map();
				setAppData(demoState);
				lastSavedStateRef.current = JSON.parse(
					JSON.stringify(toStored(demoState))
				);
				setIsOnline(false);
				setIsLoading(false);
				return;
			}

			// Authenticated mode: load from API
			try {
				const [cloudData, logReviews] = await Promise.all([
					loadFromAPI(authToken, refreshToken),
					loadReviewsFromAPI(authToken, refreshToken),
				]);

				// Keep folders even when there are no decks yet
				const loadedData = {
					...cloudData,
					folders: cloudData?.folders || [],
					decks: cloudData?.decks || [],
				};

				// Reviews come back onto their cards. Data saved before the
				// review log existed still has them nested in data.json; the
				// last-saved snapshots below record only what's stored where
				// it now belongs, so the next auto-save moves those reviews
				// into the log and saves data.json without them. Grades saved
				// under the old Again/Hard/Good/Easy names are renamed here and
				// written back the same way. Cards saved before notes existed
				// get notes here (resolveNotes) and are saved that way next.
				setAppData(
					migrateGrades(attachReviews(loadedData, logReviews))
				);
				savedReviewsRef.current = new Map(
					logReviews.map((review) => [
						reviewKey(review.cardId, review.reviewId),
						review,
					])
				);
				lastSavedStateRef.current = JSON.parse(
					JSON.stringify(toStored(loadedData))
				);
				hasLoadedFromCloudRef.current = true;
				setIsOnline(true);
			} catch (error) {
				console.error('Failed to load from API:', error);
				showError('Failed to load data from cloud.');
				setIsOnline(false);
				const emptyData = { folders: [], decks: [] };
				savedReviewsRef.current = new Map();
				setAppData(emptyData);
				lastSavedStateRef.current = JSON.parse(
					JSON.stringify(emptyData)
				);
			} finally {
				setIsLoading(false);
			}
		}
		loadData();
	}, [isAuthenticated, authToken, refreshToken, showError, setAppData]);

	// Keep appDataRef in sync with appData
	useEffect(() => {
		appDataRef.current = appData;
	}, [appData]);

	// Auto-save data - to cloud if authenticated, no-op if guest
	useEffect(() => {
		if (isLoading) return;

		if (saveTimeoutRef.current) {
			return;
		}

		const performSave = async () => {
			setIsSaving(true);
			const dataToSave = appDataRef.current;

			// Guest mode: data lives in React state only — nothing to persist
			if (!isAuthenticated || !authToken) {
				lastSavedStateRef.current = JSON.parse(
					JSON.stringify(toStored(dataToSave))
				);
				lastSaveTime.current = Date.now();
				setIsSaving(false);
				saveTimeoutRef.current = null;
				return;
			}

			// Don't save until we've successfully loaded cloud data at least once.
			// Guards against the race where auth resolves after the guest branch
			// runs but before the authenticated load completes, which would cause
			// the initial demoData state to be written to the cloud.
			if (!hasLoadedFromCloudRef.current) {
				setIsSaving(false);
				saveTimeoutRef.current = null;
				return;
			}

			// Authenticated mode: save to cloud
			const currentAuthToken = authToken;
			try {
				const currentReviews = collectReviews(dataToSave);
				const reviewChanges = diffReviews(
					currentReviews,
					savedReviewsRef.current
				);
				const hasReviewChanges =
					reviewChanges.add.length > 0 ||
					reviewChanges.remove.length > 0;

				// data.json holds everything but the reviews, and cards
				// without the text their notes hold
				const storedData = toStored(dataToSave);
				const patchData = computePatchData(
					storedData,
					lastSavedStateRef.current
				);

				if (patchData === false && !hasReviewChanges) {
					// No changes — nothing to save
					setIsSaving(false);
					saveTimeoutRef.current = null;
					return;
				}

				// Reviews go first: data.json saved without nested reviews
				// must never reach the cloud before those reviews are in the
				// log. If this fails, nothing else is saved.
				if (hasReviewChanges) {
					await saveReviewsToAPI(
						reviewChanges,
						currentAuthToken,
						refreshToken
					);
					savedReviewsRef.current = currentReviews;
				}

				if (patchData) {
					// Use PATCH for incremental update
					await patchToAPI(patchData, currentAuthToken, refreshToken);
				} else if (patchData === null) {
					// null = fall back to POST for full save
					await saveToAPI(storedData, currentAuthToken, refreshToken);
				}

				// Update last saved state
				lastSavedStateRef.current = JSON.parse(
					JSON.stringify(storedData)
				);
				setIsOnline(true);
				lastSaveTime.current = Date.now();
			} catch (error) {
				console.error('Failed to save to API:', error);
				showError('Failed to save to cloud.');
				setIsOnline(false);
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
	}, [
		appData,
		isLoading,
		isAuthenticated,
		authToken,
		refreshToken,
		showError,
	]);

	const value = {
		appData,
		setAppData: setAppDataTracked,
		isLoading,
		isSaving,
		isOnline,
		hasGuestEdits,
	};

	// if there are decks, but no folders in appData, log an issue
	useEffect(() => {
		// Example data has 2 decks and no folders, so we'll use that as the threshold
		if (
			appData.decks.length > 2 &&
			(!appData.folders || appData.folders.length === 0)
		) {
			console.error('No folders in appData, but there are decks');
		}
	}, [appData]);

	return (
		<AppDataContext.Provider value={value}>
			{children}
		</AppDataContext.Provider>
	);
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAppData() {
	const context = useContext(AppDataContext);
	if (context === undefined) {
		throw new Error('useAppData must be used within an AppDataProvider');
	}
	return context;
}
