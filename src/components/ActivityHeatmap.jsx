import { useState } from "react";

/**
 * ActivityHeatmap Component
 *
 * A GitHub-style calendar heatmap showing study activity from the first review date.
 * Each cell represents a day, with color intensity indicating activity level.
 */
export default function ActivityHeatmap({ appData }) {
	const [hoveredDay, setHoveredDay] = useState(null);
	const [hoveredPosition, setHoveredPosition] = useState({ x: 0, y: 0 });

	// Calculate activity data from appData
	const getActivityData = () => {
		const activityMap = new Map();

		// Go through all cards and count reviews by date
		appData.decks.forEach((deck) => {
			deck.cards.forEach((card) => {
				card.reviews.forEach((review) => {
					const date = new Date(review.timestamp);
					const dateStr = date.toISOString().split("T")[0];

					if (!activityMap.has(dateStr)) {
						activityMap.set(dateStr, 0);
					}
					activityMap.set(dateStr, activityMap.get(dateStr) + 1);
				});
			});
		});

		return activityMap;
	};

	// Generate array of weeks from the first review date
	const generateWeeks = (firstReviewDate) => {
		const weeks = [];
		const today = new Date();

		// If no reviews, return empty array
		if (!firstReviewDate) {
			return weeks;
		}

		// Start from the Sunday before the first review date
		const startDate = new Date(firstReviewDate);
		startDate.setDate(startDate.getDate() - startDate.getDay());

		let currentDate = new Date(startDate);
		let currentWeek = [];

		while (currentDate <= today) {
			currentWeek.push(new Date(currentDate));

			// If we've completed a week (Sunday), start a new week
			if (currentDate.getDay() === 6) {
				weeks.push(currentWeek);
				currentWeek = [];
			}

			currentDate.setDate(currentDate.getDate() + 1);
		}

		// Add the final incomplete week if it exists
		if (currentWeek.length > 0) {
			weeks.push(currentWeek);
		}

		return weeks;
	};

	// Calculate percentiles from non-zero review counts
	const calculatePercentiles = (activityMap) => {
		// Get all non-zero counts
		const counts = Array.from(activityMap.values()).filter(
			(count) => count > 0
		);

		if (counts.length === 0) {
			return { p20: 0, p40: 0, p60: 0, p80: 0 };
		}

		// Sort counts in ascending order
		const sortedCounts = [...counts].sort((a, b) => a - b);

		// Calculate percentile indices
		const getPercentileValue = (percentile) => {
			const index = Math.ceil(
				((sortedCounts.length - 1) * percentile) / 100
			);
			return sortedCounts[index] || 0;
		};

		return {
			p20: getPercentileValue(20),
			p40: getPercentileValue(40),
			p60: getPercentileValue(60),
			p80: getPercentileValue(80),
		};
	};

	// Get activity level for a specific date (0-4)
	const getActivityLevel = (date, activityMap, percentiles) => {
		const dateStr = date.toISOString().split("T")[0];
		const count = activityMap.get(dateStr) || 0;

		if (count === 0) return 0;
		if (count <= percentiles.p20) return 1;
		if (count <= percentiles.p40) return 2;
		if (count <= percentiles.p60) return 3;
		if (count <= percentiles.p80) return 4;
		return 4; // Above 80th percentile (highest level)
	};

	// Get color class based on activity level
	const getColorClass = (level) => {
		const colors = {
			0: "bg-gray-100 dark:bg-slate-800",
			1: "bg-teal-200 dark:bg-teal-900/30",
			2: "bg-teal-400 dark:bg-teal-700/50",
			3: "bg-teal-600 dark:bg-teal-600/70",
			4: "bg-teal-800 dark:bg-teal-500",
		};
		return colors[level];
	};

	// Format date for tooltip
	const formatDate = (date) => {
		const options = {
			weekday: "short",
			year: "numeric",
			month: "short",
			day: "numeric",
		};
		return date.toLocaleDateString("en-US", options);
	};

	// Get month labels
	const getMonthLabels = (weeks) => {
		const labels = [];
		let lastMonth = -1;

		weeks.forEach((week, weekIndex) => {
			const firstDay = week[0];
			const month = firstDay.getMonth();

			if (month !== lastMonth && weekIndex > 0) {
				labels.push({
					month: firstDay.toLocaleDateString("en-US", {
						month: "short",
					}),
					weekIndex,
				});
				lastMonth = month;
			}
		});

		return labels;
	};

	const activityMap = getActivityData();
	const percentiles = calculatePercentiles(activityMap);

	// Find the earliest review date
	const getFirstReviewDate = () => {
		if (activityMap.size === 0) {
			return null;
		}
		const dates = Array.from(activityMap.keys()).sort();
		return new Date(dates[0]);
	};

	const firstReviewDate = getFirstReviewDate();
	const weeks = generateWeeks(firstReviewDate);
	const monthLabels = getMonthLabels(weeks);

	// Calculate statistics
	const totalReviews = Array.from(activityMap.values()).reduce(
		(sum, count) => sum + count,
		0
	);
	const activeDays = activityMap.size;
	const currentStreak = (() => {
		let streak = 0;
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		for (let i = 0; i < 365; i++) {
			const date = new Date(today);
			date.setDate(date.getDate() - i);
			const dateStr = date.toISOString().split("T")[0];

			if (activityMap.has(dateStr)) {
				streak++;
			} else if (i > 0) {
				// Only break streak if it's not today (allow for no activity yet today)
				break;
			}
		}

		return streak;
	})();

	return (
		<div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
			<div className="mb-4">
				<h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-2">
					Study Activity
				</h2>
				<div className="flex flex-wrap gap-4 text-sm">
					<div>
						<span className="text-gray-600 dark:text-slate-400">
							Total reviews:{" "}
						</span>
						<span className="font-semibold text-gray-900 dark:text-slate-100">
							{totalReviews}
						</span>
					</div>
					<div>
						<span className="text-gray-600 dark:text-slate-400">
							Active days:{" "}
						</span>
						<span className="font-semibold text-gray-900 dark:text-slate-100">
							{activeDays}
						</span>
					</div>
					<div>
						<span className="text-gray-600 dark:text-slate-400">
							Current streak:{" "}
						</span>
						<span className="font-semibold text-gray-900 dark:text-slate-100">
							{currentStreak}{" "}
							{currentStreak === 1 ? "day" : "days"}
						</span>
					</div>
				</div>
			</div>

			{/* Calendar Grid */}
			<div className="overflow-x-auto">
				<div className="inline-block min-w-full">
					{/* Month Labels */}
					<div
						className="flex mb-1 relative"
						style={{ paddingLeft: "28px" }}
					>
						{monthLabels.map((label, index) => (
							<div
								key={index}
								className="text-xs text-gray-500 dark:text-slate-500"
								style={{
									position: "absolute",
									left: `${28 + label.weekIndex * 14}px`,
								}}
							>
								{label.month}
							</div>
						))}
					</div>

					{/* Day Labels and Grid */}
					<div className="flex gap-1">
						{/* Day of week labels */}
						<div className="flex flex-col gap-1 justify-start pt-4">
							<div className="text-xs text-gray-500 dark:text-slate-500 h-3 flex items-center">
								Mon
							</div>
							<div className="h-3" /> {/* Tuesday - no label */}
							<div className="text-xs text-gray-500 dark:text-slate-500 h-3 flex items-center">
								Wed
							</div>
							<div className="h-3" /> {/* Thursday - no label */}
							<div className="text-xs text-gray-500 dark:text-slate-500 h-3 flex items-center">
								Fri
							</div>
							<div className="h-3" /> {/* Saturday - no label */}
							<div className="h-3" /> {/* Sunday - no label */}
						</div>

						{/* Heatmap Grid */}
						<div className="flex gap-1 flex-1">
							{weeks.map((week, weekIndex) => (
								<div
									key={weekIndex}
									className="flex flex-col gap-1"
								>
									{[0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => {
										const day = week.find(
											(d) => d.getDay() === dayOfWeek
										);
										if (!day) {
											return (
												<div
													key={dayOfWeek}
													className="w-3 h-3"
												/>
											);
										}

										const level = getActivityLevel(
											day,
											activityMap,
											percentiles
										);
										const dateStr = day
											.toISOString()
											.split("T")[0];
										const count =
											activityMap.get(dateStr) || 0;

										return (
											<div
												key={dayOfWeek}
												className={`w-3 h-3 rounded-sm ${getColorClass(
													level
												)} hover:ring-2 hover:ring-gray-400 dark:hover:ring-slate-500 transition-all duration-200 cursor-pointer`}
												onMouseEnter={(e) => {
													setHoveredDay({
														date: day,
														count,
													});
													const rect =
														e.target.getBoundingClientRect();
													setHoveredPosition({
														x:
															rect.left +
															rect.width / 2,
														y: rect.top,
													});
												}}
												onMouseLeave={() =>
													setHoveredDay(null)
												}
												title={`${formatDate(
													day
												)}: ${count} reviews`}
											/>
										);
									})}
								</div>
							))}
						</div>
					</div>

					{/* Legend */}
					<div className="flex items-center gap-2 mt-4">
						<span className="text-xs text-gray-500 dark:text-slate-500">
							Less
						</span>
						<div className="flex gap-1">
							{[0, 1, 2, 3, 4].map((level) => (
								<div
									key={level}
									className={`w-3 h-3 rounded-sm ${getColorClass(
										level
									)}`}
								/>
							))}
						</div>
						<span className="text-xs text-gray-500 dark:text-slate-500">
							More
						</span>
					</div>
				</div>
			</div>

			{/* Tooltip */}
			{hoveredDay && (
				<div
					className="fixed z-50 px-3 py-2 bg-gray-900 dark:bg-slate-700 text-white text-sm rounded-lg shadow-lg pointer-events-none"
					style={{
						left: `${hoveredPosition.x}px`,
						top: `${hoveredPosition.y - 40}px`,
						transform: "translateX(-50%)",
					}}
				>
					<div className="font-semibold">
						{hoveredDay.count} reviews
					</div>
					<div className="text-xs text-gray-300 dark:text-slate-400">
						{formatDate(hoveredDay.date)}
					</div>
				</div>
			)}
		</div>
	);
}
