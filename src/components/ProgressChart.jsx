import { useMemo } from "react";
import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	Legend,
	ResponsiveContainer,
} from "recharts";
import { useTheme } from "../contexts/ThemeContext";

/**
 * ProgressChart Component
 *
 * Displays study progress over time, showing:
 * - Total cards accumulated over time
 * - Reviews completed per time period
 * - Cards studied (cards with at least one review)
 */
export default function ProgressChart({ appData }) {
	const { isDark } = useTheme();

	// Helper functions - defined before useMemo to avoid temporal dead zone
	const getWeekNumber = (date) => {
		const d = new Date(
			Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
		);
		const dayNum = d.getUTCDay() || 7;
		d.setUTCDate(d.getUTCDate() + 4 - dayNum);
		const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
		return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
	};

	const getPeriodKey = (date, period) => {
		if (period === "day") {
			return date.toISOString().split("T")[0];
		} else if (period === "week") {
			const year = date.getFullYear();
			const week = getWeekNumber(date);
			return `${year}-W${week}`;
		} else if (period === "month") {
			return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
		}
		return date.toISOString().split("T")[0];
	};

	const formatPeriodLabel = (date, period) => {
		if (period === "day") {
			return date.toLocaleDateString("en-US", {
				month: "short",
				day: "numeric",
			});
		} else if (period === "week") {
			return `Week ${getWeekNumber(date)}, ${date.getFullYear()}`;
		} else if (period === "month") {
			return date.toLocaleDateString("en-US", {
				month: "short",
				year: "numeric",
			});
		}
		return date.toLocaleDateString("en-US");
	};

	const chartData = useMemo(() => {
		// Safety check for appData
		if (!appData || !appData.decks || !Array.isArray(appData.decks)) {
			return [];
		}

		// Collect all reviews with timestamps
		const reviewTimestamps = [];
		const cardCreationDates = [];

		appData.decks.forEach((deck) => {
			if (!deck.cards || !Array.isArray(deck.cards)) {
				return;
			}
			deck.cards.forEach((card) => {
				// Track when card was first created (first review or current time if no reviews)
				if (card.reviews && Array.isArray(card.reviews) && card.reviews.length > 0) {
					const firstReview = card.reviews.reduce((earliest, review) =>
						review.timestamp < earliest.timestamp ? review : earliest
					);
					cardCreationDates.push(firstReview.timestamp);
				} else {
					// If no reviews, use a default date (could be improved with card creation date)
					cardCreationDates.push(Date.now());
				}

				// Collect all review timestamps
				if (card.reviews && Array.isArray(card.reviews)) {
					card.reviews.forEach((review) => {
						if (review && review.timestamp) {
							reviewTimestamps.push(review.timestamp);
						}
					});
				}
			});
		});

		if (reviewTimestamps.length === 0 && cardCreationDates.length === 0) {
			return [];
		}

		// Find the earliest date
		const allDates = [
			...reviewTimestamps,
			...cardCreationDates,
		].filter(Boolean);
		if (allDates.length === 0) return [];

		const earliestDate = Math.min(...allDates);
		const startDate = new Date(earliestDate);
		startDate.setHours(0, 0, 0, 0);

		const today = new Date();
		today.setHours(23, 59, 59, 999);

		// Determine time period based on data range
		const daysDiff = Math.ceil(
			(today - startDate) / (1000 * 60 * 60 * 24)
		);
		let period = "day";
		let periodMs = 1000 * 60 * 60 * 24;

		if (daysDiff > 365) {
			period = "month";
			periodMs = 1000 * 60 * 60 * 24 * 30;
		} else if (daysDiff > 90) {
			period = "week";
			periodMs = 1000 * 60 * 60 * 24 * 7;
		}

		// Group data by time period
		const dataMap = new Map();

		// Initialize all periods with zero values
		let currentDate = new Date(startDate);
		while (currentDate <= today) {
			const key = getPeriodKey(currentDate, period);
			if (!dataMap.has(key)) {
				dataMap.set(key, {
					period: formatPeriodLabel(currentDate, period),
					totalCards: 0,
					studiedCards: 0,
					reviews: 0,
					timestamp: currentDate.getTime(),
				});
			}

			// Move to next period
			if (period === "day") {
				currentDate.setDate(currentDate.getDate() + 1);
			} else if (period === "week") {
				currentDate.setDate(currentDate.getDate() + 7);
			} else if (period === "month") {
				currentDate.setMonth(currentDate.getMonth() + 1);
			}
		}

		// Process card creation dates (cumulative total cards)
		cardCreationDates.forEach((timestamp) => {
			const date = new Date(timestamp);
			const key = getPeriodKey(date, period);
			const entry = dataMap.get(key);
			if (entry) {
				entry.totalCards += 1;
			}
		});

		// Process reviews
		reviewTimestamps.forEach((timestamp) => {
			const date = new Date(timestamp);
			const key = getPeriodKey(date, period);
			const entry = dataMap.get(key);
			if (entry) {
				entry.reviews += 1;
			}
		});

		// Process studied cards (cards with at least one review by this period)
		const studiedCardsByPeriod = new Map();
		appData.decks.forEach((deck) => {
			if (!deck.cards || !Array.isArray(deck.cards)) {
				return;
			}
			deck.cards.forEach((card) => {
				if (card.reviews && Array.isArray(card.reviews) && card.reviews.length > 0) {
					const firstReview = card.reviews.reduce((earliest, review) =>
						review.timestamp < earliest.timestamp ? review : earliest
					);
					const date = new Date(firstReview.timestamp);
					const key = getPeriodKey(date, period);
					studiedCardsByPeriod.set(
						key,
						(studiedCardsByPeriod.get(key) || 0) + 1
					);
				}
			});
		});

		// Convert to cumulative values
		const sortedEntries = Array.from(dataMap.entries()).sort(
			(a, b) => a[1].timestamp - b[1].timestamp
		);

		let cumulativeCards = 0;
		let cumulativeStudied = 0;

		const result = sortedEntries.map(([key, entry]) => {
			cumulativeCards += entry.totalCards;
			cumulativeStudied += studiedCardsByPeriod.get(key) || 0;

			return {
				period: entry.period,
				totalCards: cumulativeCards,
				studiedCards: cumulativeStudied,
				reviews: entry.reviews,
			};
		});

		return result;
	}, [appData]);

	const axisColor = isDark ? "rgb(148 163 184)" : "rgb(75 85 99)";

	if (chartData.length === 0) {
		return (
			<div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
				<h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-4">
					Study Progress
				</h2>
				<div className="flex items-center justify-center h-64 text-gray-500 dark:text-slate-400">
					No data available yet. Start studying to see your progress!
				</div>
			</div>
		);
	}

	return (
		<div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
			<h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-4">
				Study Progress
			</h2>
			<div className="h-80 w-full">
				<ResponsiveContainer width="100%" height="100%">
					<LineChart
						data={chartData}
						margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
					>
						<CartesianGrid
							strokeDasharray="3 3"
							className="stroke-gray-200 dark:stroke-slate-700"
						/>
						<XAxis
							dataKey="period"
							tick={{
								fill: axisColor,
								fontSize: 12,
							}}
						/>
						<YAxis
							tick={{
								fill: axisColor,
								fontSize: 12,
							}}
						/>
						<Tooltip
							content={({ active, payload, label }) => {
								if (active && payload && payload.length) {
									return (
										<div
											className={`px-3 py-2 rounded-lg shadow-lg border ${
												isDark
													? "bg-slate-800 border-slate-700 text-slate-100"
													: "bg-white border-gray-200 text-gray-900"
											}`}
										>
											<p
												className={`font-semibold mb-1 ${
													isDark
														? "text-slate-200"
														: "text-gray-700"
												}`}
											>
												{label}
											</p>
											{payload.map((entry, index) => (
												<p
													key={index}
													className="text-sm"
													style={{ color: entry.color }}
												>
													{entry.name}:{" "}
													<span className="font-semibold">
														{entry.value}
													</span>
												</p>
											))}
										</div>
									);
								}
								return null;
							}}
						/>
						<Legend
							wrapperStyle={{
								color: axisColor,
							}}
						/>
						<Line
							type="monotone"
							dataKey="totalCards"
							stroke="#14b8a6"
							strokeWidth={2}
							name="Total Cards"
							dot={{ r: 3 }}
						/>
						<Line
							type="monotone"
							dataKey="studiedCards"
							stroke="#06b6d4"
							strokeWidth={2}
							name="Studied Cards"
							dot={{ r: 3 }}
						/>
						<Line
							type="monotone"
							dataKey="reviews"
							stroke="#f59e0b"
							strokeWidth={2}
							name="Reviews"
							dot={{ r: 3 }}
						/>
					</LineChart>
				</ResponsiveContainer>
			</div>
			<div className="mt-4 text-sm text-gray-600 dark:text-slate-400">
				<p>
					Track your learning journey: total cards created, cards you've
					studied, and reviews completed over time.
				</p>
			</div>
		</div>
	);
}

