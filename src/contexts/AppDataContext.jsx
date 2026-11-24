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
	syncToAPI,
	checkAPIHealth,
	loadReviewsFromAPI,
	saveReviewsToAPI,
} from '../services/apiStorage';
import { migrateGrades } from '../services/grades';
import { migrateReschedules } from '../services/catchUp';
import {
	attachReviews,
	stripReviews,
	collectReviews,
	diffReviews,
	reviewKey,
} from '../services/reviewLog';
import { resolveNotes, stripNoteFields } from '../services/notes';
import {
	computeChangeset,
	applyRemoteChanges,
	hasRemoteChanges,
	changedSince,
} from '../services/sync';

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

const MIN_SAVE_INTERVAL = 10 * 1000;
// Pulling: not within 30s of the last sync; every 5 min while visible
const PULL_MIN_GAP = 30 * 1000;
const PULL_INTERVAL = 5 * 60 * 1000;

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
	// The server's rev as of the last sync: changes after it are pulled
	const revRef = useRef(0);
	const syncInFlightRef = useRef(false);
	const syncAgainRef = useRef(false);
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
				revRef.current = 0;
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

				// Keep folders even when there are no decks yet. The sync
				// bookkeeping (rev, deletion records, order stamps) stays on
				// the server.
				const {
					rev = 0,
					graves: _graves,
					orderAt: _orderAt,
					orderUsn: _orderUsn,
					...content
				} = cloudData || {};
				const loadedData = {
					...content,
					folders: content.folders || [],
					decks: content.decks || [],
				};
				revRef.current = rev;

				// Reviews come back onto their cards. Data saved before the
				// review log existed still has them nested in data.json; the
				// last-saved snapshots below record only what's stored where
				// it now belongs, so the next auto-save moves those reviews
				// into the log and saves data.json without them. Grades saved
				// under the old Again/Hard/Good/Easy names are renamed here and
				// written back the same way. Cards saved before notes existed
				// get notes here (resolveNotes) and are saved that way next.
				// Catch-ups saved as a `card.reschedule` chain become review-log
				// entries the same way.
				setAppData(
					migrateReschedules(
						migrateGrades(attachReviews(loadedData, logReviews))
					)
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

	/**
	 * Sync with the cloud: send local changes (reviews first, then the rest
	 * as a changeset the server merges object by object) and take in what
	 * other devices changed since the last sync.
	 * @param {{ pull?: boolean }} options - pull: sync even with no local
	 *   changes, to fetch other devices' changes
	 */
	const performSync = useCallback(
		async ({ pull = false } = {}) => {
			if (syncInFlightRef.current) {
				syncAgainRef.current = true;
				return;
			}
			const snapshot = appDataRef.current;

			// Guest mode: data lives in React state only — nothing to persist
			if (!isAuthenticated || !authToken) {
				lastSavedStateRef.current = JSON.parse(
					JSON.stringify(toStored(snapshot))
				);
				lastSaveTime.current = Date.now();
				return;
			}

			// Don't save until we've successfully loaded cloud data at least once.
			// Guards against the race where auth resolves after the guest branch
			// runs but before the authenticated load completes, which would cause
			// the initial demoData state to be written to the cloud.
			if (!hasLoadedFromCloudRef.current) return;

			const currentReviews = collectReviews(snapshot);
			const reviewChanges = diffReviews(
				currentReviews,
				savedReviewsRef.current
			);
			const hasReviewChanges =
				reviewChanges.add.length > 0 || reviewChanges.remove.length > 0;
			// data.json holds everything but the reviews, and cards without
			// the text their notes hold
			const storedSnapshot = toStored(snapshot);
			const changes = computeChangeset(
				storedSnapshot,
				lastSavedStateRef.current
			);
			if (!changes && !hasReviewChanges && !pull) return;

			syncInFlightRef.current = true;
			setIsSaving(true);
			try {
				// Reviews go first: data.json saved without nested reviews
				// must never reach the cloud before those reviews are in the
				// log. If this fails, nothing else is saved.
				if (hasReviewChanges) {
					await saveReviewsToAPI(
						reviewChanges,
						authToken,
						refreshToken
					);
					savedReviewsRef.current = currentReviews;
				}

				const response = await syncToAPI(
					{ since: revRef.current, changes },
					authToken,
					refreshToken
				);
				revRef.current = response.rev;
				const remote = response.changes;

				// What the server now has, as far as this device knows
				lastSavedStateRef.current = JSON.parse(
					JSON.stringify(applyRemoteChanges(storedSnapshot, remote))
				);

				// Other devices' changes, and any of ours that lost to newer
				// ones. Anything edited here since the snapshot is left alone:
				// the next sync sends it.
				if (hasRemoteChanges(remote)) {
					setAppDataRaw((prev) => {
						const skip = changedSince(
							storedSnapshot,
							toStored(prev)
						);
						return resolveNotes(
							applyRemoteChanges(prev, remote, {
								skip,
								withReviews: true,
							})
						);
					});
				}
				setIsOnline(true);
			} catch (error) {
				console.error('Failed to sync with API:', error);
				showError('Failed to save to cloud.');
				setIsOnline(false);
			} finally {
				lastSaveTime.current = Date.now();
				syncInFlightRef.current = false;
				setIsSaving(false);
				// Edits made while this sync was in flight
				if (syncAgainRef.current || appDataRef.current !== snapshot) {
					syncAgainRef.current = false;
					setTimeout(
						() => performSyncRef.current?.(),
						MIN_SAVE_INTERVAL
					);
				}
			}
		},
		[isAuthenticated, authToken, refreshToken, showError]
	);
	const performSyncRef = useRef(performSync);
	useEffect(() => {
		performSyncRef.current = performSync;
	}, [performSync]);

	// Auto-save: sync at most every 10 seconds after a change
	useEffect(() => {
		if (isLoading) return;

		if (saveTimeoutRef.current) {
			return;
		}

		const now = Date.now();
		const timeSinceLastSave = lastSaveTime.current
			? now - lastSaveTime.current
			: Infinity;
		const delay = Math.max(0, MIN_SAVE_INTERVAL - timeSinceLastSave);
		saveTimeoutRef.current = setTimeout(() => {
			saveTimeoutRef.current = null;
			performSync();
		}, delay);

		return () => {
			if (saveTimeoutRef.current) {
				clearTimeout(saveTimeoutRef.current);
				saveTimeoutRef.current = null;
			}
		};
	}, [appData, isLoading, performSync]);

	// Pull other devices' changes when the app comes back into view, and
	// every few minutes while it's open
	useEffect(() => {
		if (!isAuthenticated || isLoading) return;
		const pull = () => {
			if (document.visibilityState !== 'visible') return;
			if (Date.now() - (lastSaveTime.current || 0) < PULL_MIN_GAP) return;
			performSync({ pull: true });
		};
		document.addEventListener('visibilitychange', pull);
		window.addEventListener('focus', pull);
		const interval = setInterval(pull, PULL_INTERVAL);
		return () => {
			document.removeEventListener('visibilitychange', pull);
			window.removeEventListener('focus', pull);
			clearInterval(interval);
		};
	}, [isAuthenticated, isLoading, performSync]);

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
