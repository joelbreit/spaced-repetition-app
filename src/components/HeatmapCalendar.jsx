import { useState } from "react";

export default function HeatmapCalendar({ appData }) {
	const [hoveredDay, setHoveredDay] = useState(null);

	// Get all reviews from all cards
	const getAllReviews = () => {
		const allReviews = [];
		appData.decks.forEach((deck) => {
			deck.cards.forEach((card) => {
				if (card.reviews && card.reviews.length > 0) {
					card.reviews.forEach((review) => {
						allReviews.push(review);
					});
				}
			});
		});
		return allReviews;
	};

	// Group reviews by date
	const getReviewsByDate = () => {
		const allReviews = getAllReviews();
		const reviewsByDate = {};

		allReviews.forEach((review) => {
			const date = new Date(review.timestamp);
			const dateKey = `${date.getFullYear()}-${String(
				date.getMonth() + 1
			).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

			if (!reviewsByDate[dateKey]) {
				reviewsByDate[dateKey] = 0;
			}
			reviewsByDate[dateKey]++;
		});

		return reviewsByDate;
	};

	// Generate array of dates for the last year
	const generateLastYearDates = () => {
		const dates = [];
		const today = new Date();
		const oneYearAgo = new Date(today);
		oneYearAgo.setFullYear(today.getFullYear() - 1);

		// Start from the Sunday of the week containing one year ago
		const startDate = new Date(oneYearAgo);
		startDate.setDate(startDate.getDate() - startDate.getDay());

		const currentDate = new Date(startDate);

		while (currentDate <= today) {
			dates.push(new Date(currentDate));
			currentDate.setDate(currentDate.getDate() + 1);
		}

		return dates;
	};

	const reviewsByDate = getReviewsByDate();
	const dates = generateLastYearDates();

	// Calculate max reviews in a day for scaling
	const maxReviews = Math.max(...Object.values(reviewsByDate), 1);

	// Get color intensity based on review count
	const getColorClass = (count) => {
		if (count === 0)
			return "bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700";
		const intensity = count / maxReviews;
		if (intensity >= 0.75)
			return "bg-teal-600 dark:bg-teal-500 border border-teal-700 dark:border-teal-600";
		if (intensity >= 0.5)
			return "bg-teal-500 dark:bg-teal-600 border border-teal-600 dark:border-teal-700";
		if (intensity >= 0.25)
			return "bg-teal-400 dark:bg-teal-700 border border-teal-500 dark:border-teal-800";
		return "bg-teal-300 dark:bg-teal-800 border border-teal-400 dark:border-teal-900";
	};

	const getDateKey = (date) => {
		return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
			2,
			"0"
		)}-${String(date.getDate()).padStart(2, "0")}`;
	};

	const formatDate = (date) => {
		return date.toLocaleDateString("en-US", {
			weekday: "short",
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	};

	// Group dates by week
	const weeks = [];
	let currentWeek = [];
	dates.forEach((date, index) => {
		currentWeek.push(date);
		if (date.getDay() === 6 || index === dates.length - 1) {
			weeks.push(currentWeek);
			currentWeek = [];
		}
	});

	// Get month labels
	const getMonthLabels = () => {
		const labels = [];
		const seenMonths = new Set();

		weeks.forEach((week, weekIndex) => {
			const firstDay = week[0];
			const monthKey = `${firstDay.getFullYear()}-${firstDay.getMonth()}`;

			if (!seenMonths.has(monthKey)) {
				seenMonths.add(monthKey);
				labels.push({
					weekIndex,
					label: firstDay.toLocaleDateString("en-US", {
						month: "short",
					}),
				});
			}
		});

		return labels;
	};

	const monthLabels = getMonthLabels();
	const totalReviews = Object.values(reviewsByDate).reduce(
		(sum, count) => sum + count,
		0
	);
	const activeDays = Object.keys(reviewsByDate).length;

	return (
		<div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
			<div className="mb-6">
				<h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-2">
					Study Activity
				</h2>
				<div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-slate-400">
					<span>
						<span className="font-semibold text-gray-900 dark:text-slate-100">
							{totalReviews}
						</span>{" "}
						reviews in the last year
					</span>
					<span>
						<span className="font-semibold text-gray-900 dark:text-slate-100">
							{activeDays}
						</span>{" "}
						active days
					</span>
				</div>
			</div>

			<div className="relative overflow-x-auto">
				{/* Month labels */}
				<div className="flex mb-2 pl-8">
					{monthLabels.map((month, index) => (
						<div
							key={index}
							className="text-xs text-gray-500 dark:text-slate-500"
							style={{
								position: "absolute",
								left: `${month.weekIndex * 14 + 32}px`,
							}}
						>
							{month.label}
						</div>
					))}
				</div>

				<div className="flex gap-1">
					{/* Day of week labels */}
					<div className="flex flex-col gap-1 pr-2 text-xs text-gray-500 dark:text-slate-500">
						<div className="h-3"></div>
						<div className="h-3">Mon</div>
						<div className="h-3"></div>
						<div className="h-3">Wed</div>
						<div className="h-3"></div>
						<div className="h-3">Fri</div>
						<div className="h-3"></div>
					</div>

					{/* Calendar grid */}
					<div className="flex gap-1">
						{weeks.map((week, weekIndex) => (
							<div key={weekIndex} className="flex flex-col gap-1">
								{[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => {
									const date = week.find(
										(d) => d.getDay() === dayIndex
									);
									if (!date) {
										return (
											<div
												key={dayIndex}
												className="w-3 h-3"
											></div>
										);
									}

									const dateKey = getDateKey(date);
									const count = reviewsByDate[dateKey] || 0;
									const isToday =
										dateKey === getDateKey(new Date());

									return (
										<div
											key={dayIndex}
											className={`w-3 h-3 rounded-sm ${getColorClass(
												count
											)} transition-all duration-200 hover:scale-125 hover:shadow-md cursor-pointer ${
												isToday
													? "ring-2 ring-teal-500 dark:ring-teal-400"
													: ""
											}`}
											onMouseEnter={() =>
												setHoveredDay({
													date,
													count,
												})
											}
											onMouseLeave={() =>
												setHoveredDay(null)
											}
											title={`${formatDate(date)}: ${count} review${
												count !== 1 ? "s" : ""
											}`}
										></div>
									);
								})}
							</div>
						))}
					</div>
				</div>

				{/* Tooltip */}
				{hoveredDay && (
					<div className="mt-4 p-3 bg-gray-50 dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600">
						<div className="text-sm font-medium text-gray-900 dark:text-slate-100">
							{formatDate(hoveredDay.date)}
						</div>
						<div className="text-sm text-gray-600 dark:text-slate-400">
							{hoveredDay.count} review
							{hoveredDay.count !== 1 ? "s" : ""}
						</div>
					</div>
				)}

				{/* Legend */}
				<div className="flex items-center gap-2 mt-4 text-xs text-gray-600 dark:text-slate-400">
					<span>Less</span>
					<div className="flex gap-1">
						<div className="w-3 h-3 rounded-sm bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700"></div>
						<div className="w-3 h-3 rounded-sm bg-teal-300 dark:bg-teal-800 border border-teal-400 dark:border-teal-900"></div>
						<div className="w-3 h-3 rounded-sm bg-teal-400 dark:bg-teal-700 border border-teal-500 dark:border-teal-800"></div>
						<div className="w-3 h-3 rounded-sm bg-teal-500 dark:bg-teal-600 border border-teal-600 dark:border-teal-700"></div>
						<div className="w-3 h-3 rounded-sm bg-teal-600 dark:bg-teal-500 border border-teal-700 dark:border-teal-600"></div>
					</div>
					<span>More</span>
				</div>
			</div>
		</div>
	);
}
