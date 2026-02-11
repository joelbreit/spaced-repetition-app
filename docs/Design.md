# App Design System & Aesthetics Guide

## 🎨 Design Philosophy

**Core Vibe:** **Modern Academic**

- Clean and focused like Notion
- Motivating and energetic like Duolingo
- Professional enough for medical students
- Approachable enough for casual learners
- Data-rich like Linear
- Polished like Superhuman

**Key Principles:**

1. **Focus First** - Nothing distracts from the cards during study
2. **Celebration Over Criticism** - Positive reinforcement, minimal shame
3. **Data is Beautiful** - Make statistics compelling, not overwhelming
4. **Tactile Feedback** - Every interaction feels responsive
5. **Progressive Disclosure** - Advanced features don't clutter simple workflows

---

## 🎨 Color Palette

### Primary Colors (Teal-Cyan Gradient)

Our signature color scheme suggests clarity, focus, and scientific precision - perfect for serious learners.

```javascript
// tailwind.config.js
module.exports = {
	theme: {
		extend: {
			colors: {
				// Primary Brand Colors
				brand: {
					50: '#f0fdfa', // Lightest backgrounds
					100: '#ccfbf1', // Hover states
					200: '#99f6e4', // Borders
					300: '#5eead4', // Disabled text
					400: '#2dd4bf', // Secondary text
					500: '#14b8a6', // Primary buttons (Teal)
					600: '#0d9488', // Primary hover
					700: '#0f766e', // Active states
					800: '#115e59', // Dark mode primary
					900: '#134e4a', // Darkest
				},

				// Accent Color (for highlights)
				accent: {
					50: '#ecfeff',
					100: '#cffafe',
					200: '#a5f3fc',
					300: '#67e8f9',
					400: '#22d3ee',
					500: '#06b6d4', // Cyan accent
					600: '#0891b2',
					700: '#0e7490',
					800: '#155e75',
					900: '#164e63',
				},
			},
		},
	},
};
```

### Semantic Colors

```javascript
// Success (Learning Progress)
success: {
  light: '#d1fae5',  // bg-green-100
  DEFAULT: '#10b981', // bg-green-500
  dark: '#065f46',   // bg-green-900
}

// Warning (Needs Practice)
warning: {
  light: '#fef3c7',  // bg-yellow-100
  DEFAULT: '#f59e0b', // bg-yellow-500
  dark: '#92400e',   // bg-yellow-900
}

// Error (Wrong Answer)
error: {
  light: '#fee2e2',  // bg-red-100
  DEFAULT: '#ef4444', // bg-red-500
  dark: '#991b1b',   // bg-red-900
}

// Streak (Gamification)
streak: {
  flame: '#f97316',  // bg-orange-500
  glow: '#fed7aa',   // bg-orange-200
}
```

### Neutral Grays (For Text & Backgrounds)

```javascript
// Light Mode
background: '#f9fafb',      // bg-gray-50
surface: '#ffffff',         // bg-white
border: '#e5e7eb',          // border-gray-200
text: {
  primary: '#111827',       // text-gray-900
  secondary: '#6b7280',     // text-gray-500
  disabled: '#d1d5db',      // text-gray-300
}

// Dark Mode
dark: {
  background: '#0f172a',    // bg-slate-900
  surface: '#1e293b',       // bg-slate-800
  border: '#334155',        // border-slate-700
  text: {
    primary: '#f1f5f9',     // text-slate-100
    secondary: '#94a3b8',   // text-slate-400
    disabled: '#475569',    // text-slate-600
  }
}
```

---

## 🎭 Component Design Language

### Buttons

**Primary Action (Study, Save, Create)**

```jsx
<button
	className="
  px-6 py-3 
  bg-linear-to-r from-teal-500 to-cyan-500 
  hover:from-teal-600 hover:to-cyan-600 
  text-white font-medium 
  rounded-xl 
  shadow-lg hover:shadow-xl 
  transform hover:-translate-y-0.5 
  transition-all duration-200
  focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2
"
>
	Study Now
</button>
```

**Secondary Action (Cancel, Back)**

```jsx
<button
	className="
  px-6 py-3 
  bg-gray-100 hover:bg-gray-200 
  dark:bg-slate-800 dark:hover:bg-slate-700
  text-gray-700 dark:text-slate-200 
  font-medium 
  rounded-xl 
  transition-colors duration-200
  focus:outline-none focus:ring-2 focus:ring-gray-300
"
>
	Cancel
</button>
```

**Destructive Action (Delete)**

```jsx
<button
	className="
  px-6 py-3 
  bg-red-500 hover:bg-red-600 
  text-white font-medium 
  rounded-xl 
  shadow-lg hover:shadow-xl 
  transition-all duration-200
"
>
	Delete Deck
</button>
```

**Ghost Button (Subtle Actions)**

```jsx
<button
	className="
  px-4 py-2 
  text-gray-600 dark:text-slate-400 
  hover:text-gray-900 dark:hover:text-slate-200
  hover:bg-gray-100 dark:hover:bg-slate-800 
  rounded-lg 
  transition-colors duration-200
"
>
	View More
</button>
```

---

### Cards & Surfaces

**Main Container**

```jsx
<div
	className="
  bg-white dark:bg-slate-800 
  rounded-2xl 
  shadow-lg 
  border border-gray-100 dark:border-slate-700
  p-6
  hover:shadow-xl 
  transition-shadow duration-300
"
>
	{/* Content */}
</div>
```

**Elevated Card (Interactive)**

```jsx
<div
	className="
  bg-white dark:bg-slate-800 
  rounded-2xl 
  shadow-lg hover:shadow-2xl 
  border border-gray-100 dark:border-slate-700
  p-6
  transform hover:-translate-y-1 
  transition-all duration-300
  cursor-pointer
"
>
	{/* Content */}
</div>
```

**Glassmorphism Effect (Hero Sections)**

```jsx
<div
	className="
  backdrop-blur-lg 
  bg-white/80 dark:bg-slate-900/80 
  border border-white/20 dark:border-slate-700/50
  rounded-2xl 
  shadow-2xl
  p-8
"
>
	{/* Content */}
</div>
```

---

### Typography

**Headings**

```jsx
// Page Title
<h1 className="text-4xl font-bold text-gray-900 dark:text-slate-100 mb-2">
  Welcome back! 👋
</h1>

// Section Heading
<h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-4">
  Your Decks
</h2>

// Card Heading
<h3 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-2">
  JavaScript Fundamentals
</h3>

// Label
<h4 className="text-sm font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wide mb-2">
  Study Progress
</h4>
```

**Body Text**

```jsx
// Primary
<p className="text-base text-gray-700 dark:text-slate-300 leading-relaxed">
  You have 12 cards due today
</p>

// Secondary
<p className="text-sm text-gray-600 dark:text-slate-400">
  Last studied 2 hours ago
</p>

// Caption
<p className="text-xs text-gray-500 dark:text-slate-500">
  Created on Oct 26, 2025
</p>
```

**Emphasis**

```jsx
// Bold
<span className="font-bold text-gray-900 dark:text-slate-100">
  Important
</span>

// Semibold (most common)
<span className="font-semibold text-gray-800 dark:text-slate-200">
  Medium emphasis
</span>

// Gradient text (for highlights)
<span className="
  bg-linear-to-r from-teal-500 to-cyan-500
  bg-clip-text text-transparent
  font-bold
">
  Premium Feature
</span>
```

---

### Input Fields

**Text Input**

```jsx
<input
	type="text"
	placeholder="Deck name..."
	className="
    w-full px-4 py-3 
    bg-white dark:bg-slate-800 
    border border-gray-200 dark:border-slate-700 
    rounded-xl 
    text-gray-900 dark:text-slate-100
    placeholder-gray-400 dark:placeholder-slate-500
    focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent
    transition-all duration-200
  "
/>
```

**Textarea**

```jsx
<textarea
	placeholder="Front of card..."
	rows={4}
	className="
    w-full px-4 py-3 
    bg-white dark:bg-slate-800 
    border border-gray-200 dark:border-slate-700 
    rounded-xl 
    text-gray-900 dark:text-slate-100
    placeholder-gray-400 dark:placeholder-slate-500
    focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent
    resize-none
    transition-all duration-200
  "
/>
```

**Select Dropdown**

```jsx
<select
	className="
  px-4 py-3 
  bg-white dark:bg-slate-800 
  border border-gray-200 dark:border-slate-700 
  rounded-xl 
  text-gray-900 dark:text-slate-100
  focus:outline-none focus:ring-2 focus:ring-brand-500
  cursor-pointer
"
>
	<option>Spanish</option>
	<option>French</option>
</select>
```

---

### Badges & Tags

**Status Badge**

```jsx
// Success
<span className="
  inline-flex items-center gap-1
  px-3 py-1
  bg-green-100 dark:bg-green-900/30
  text-green-700 dark:text-green-400
  text-xs font-semibold
  rounded-full
">
  ✓ Mastered
</span>

// Warning
<span className="
  inline-flex items-center gap-1
  px-3 py-1
  bg-yellow-100 dark:bg-yellow-900/30
  text-yellow-700 dark:text-yellow-400
  text-xs font-semibold
  rounded-full
">
  ! Review Soon
</span>

// Info
<span className="
  inline-flex items-center gap-1
  px-3 py-1
  bg-blue-100 dark:bg-blue-900/30
  text-blue-700 dark:text-blue-400
  text-xs font-semibold
  rounded-full
">
  ⚡ New
</span>
```

**Tag**

```jsx
<span
	className="
  inline-flex items-center gap-1 
  px-2 py-1 
  bg-gray-100 dark:bg-slate-700 
  text-gray-700 dark:text-slate-300 
  text-xs font-medium 
  rounded-md
"
>
	#vocabulary
</span>
```

---

### Progress Indicators

**Progress Bar**

```jsx
<div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
	<div
		className="
      h-full 
      bg-linear-to-r from-green-500 to-emerald-500 
      rounded-full 
      transition-all duration-500 ease-out
      relative overflow-hidden
    "
		style={{ width: '67%' }}
	>
		{/* Shimmer effect */}
		<div className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
	</div>
</div>
```

**Circular Progress (Ring)**

```jsx
<div className="relative w-20 h-20">
	<svg className="transform -rotate-90 w-20 h-20">
		<circle
			cx="40"
			cy="40"
			r="32"
			stroke="currentColor"
			strokeWidth="6"
			fill="transparent"
			className="text-gray-200 dark:text-slate-700"
		/>
		<circle
			cx="40"
			cy="40"
			r="32"
			stroke="currentColor"
			strokeWidth="6"
			fill="transparent"
			strokeDasharray={`${2 * Math.PI * 32}`}
			strokeDashoffset={`${2 * Math.PI * 32 * (1 - 0.75)}`}
			className="text-brand-500 transition-all duration-500"
			strokeLinecap="round"
		/>
	</svg>
	<div className="absolute inset-0 flex items-center justify-center">
		<span className="text-sm font-bold text-gray-900 dark:text-slate-100">
			75%
		</span>
	</div>
</div>
```

**Loading Spinner**

```jsx
<div
	className="
  animate-spin 
  h-8 w-8 
  border-4 border-brand-200 
  border-t-brand-500 
  rounded-full
"
/>
```

---

### Icons & Illustrations

**Icon Style**

- Use **Lucide React** icons (consistent, modern, MIT licensed)
- Size: `size={20}` for body text, `size={24}` for headers
- Stroke width: 2 (default)
- Color: Match surrounding text color

```jsx
import { Flame, TrendingUp, CheckCircle } from 'lucide-react';

<Flame className="text-orange-500" size={24} strokeWidth={2} />
<TrendingUp className="text-green-500" size={20} />
<CheckCircle className="text-blue-500" size={18} />
```

**Emoji Usage**

- Deck icons: Large emoji (text-4xl)
- Celebration moments: Medium emoji (text-2xl)
- Inline emphasis: Small emoji (text-base)

```jsx
// Deck icon
<span className="text-4xl">💻</span>

// Celebration
<span className="text-2xl">🎉</span>

// Inline
<p>Keep your streak alive! 🔥</p>
```

---

## 🎨 Signature Design Patterns

### 1. **Gradient Backgrounds (Hero Sections)**

```jsx
<div
	className="
  bg-linear-to-br from-brand-500 via-brand-600 to-purple-700 
  rounded-2xl p-8 
  text-white 
  shadow-2xl
"
>
	<h2 className="text-3xl font-bold mb-2">Welcome back! 👋</h2>
	<p className="text-brand-100">You have 12 cards due today</p>
</div>
```

### 2. **Glassmorphism Cards (Modern Touch)**

```jsx
<div
	className="
  backdrop-blur-md 
  bg-white/70 dark:bg-slate-800/70 
  border border-white/20 dark:border-slate-700/50
  rounded-2xl 
  shadow-xl
  p-6
"
>
	{/* Semi-transparent overlay effect */}
</div>
```

### 3. **Neumorphism (Subtle Depth)**

```jsx
// Light mode only - subtle raised effect
<div
	className="
  bg-gray-50
  shadow-[8px_8px_16px_#d1d5db,-8px_-8px_16px_#ffffff]
  rounded-2xl
  p-6
"
>
	{/* Soft 3D effect */}
</div>
```

### 4. **Hover Lift Effect (Interactive Cards)**

```jsx
<div
	className="
  transition-all duration-300
  hover:-translate-y-2 hover:shadow-2xl
  cursor-pointer
"
>
	{/* Lifts on hover */}
</div>
```

### 5. **Glow Effect (Streak Counter)**

```jsx
<div
	className="
  relative
  bg-linear-to-r from-orange-500 to-red-500
  rounded-xl p-4
  shadow-lg
  before:absolute before:inset-0 
  before:rounded-xl 
  before:bg-linear-to-r before:from-orange-500 before:to-red-500 
  before:blur-xl before:opacity-50 before:-z-10
"
>
	<div className="relative z-10 text-white">🔥 7 Day Streak</div>
</div>
```

---

## 📊 Data Visualization Style

### Chart.js / Recharts Colors

```javascript
// Use consistent color palette
const chartColors = {
	primary: '#8b5cf6', // brand-500
	secondary: '#3b82f6', // accent-500
	success: '#10b981', // green-500
	warning: '#f59e0b', // yellow-500
	error: '#ef4444', // red-500

	// Gradient arrays for multi-series
	gradients: [
		['#8b5cf6', '#a78bfa'], // Purple gradient
		['#3b82f6', '#60a5fa'], // Blue gradient
		['#10b981', '#34d399'], // Green gradient
	],

	// Grid and axis
	grid: '#e5e7eb', // gray-200
	axis: '#6b7280', // gray-500
};
```

### Heatmap Calendar (GitHub-style)

```jsx
// Color scale for activity intensity
const heatmapColors = {
  0: 'bg-gray-100 dark:bg-slate-800',     // No activity
  1: 'bg-green-200 dark:bg-green-900/30', // Light
  2: 'bg-green-400 dark:bg-green-700/50', // Medium
  3: 'bg-green-600 dark:bg-green-600/70', // High
  4: 'bg-green-800 dark:bg-green-500',    // Very high
}

<div className={`
  w-3 h-3
  ${heatmapColors[intensity]}
  rounded-sm
  hover:ring-2 hover:ring-gray-400
  transition-all duration-200
`} />
```

### Bar Chart Example

```jsx
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
} from 'recharts';

<ResponsiveContainer width="100%" height={200}>
	<BarChart data={data}>
		<CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
		<XAxis dataKey="day" stroke="#6b7280" style={{ fontSize: '12px' }} />
		<YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
		<Tooltip
			contentStyle={{
				backgroundColor: '#ffffff',
				border: '1px solid #e5e7eb',
				borderRadius: '8px',
				boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
			}}
		/>
		<Bar dataKey="cards" fill="url(#colorGradient)" radius={[8, 8, 0, 0]} />
		<defs>
			<linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stopColor="#8b5cf6" />
				<stop offset="100%" stopColor="#a78bfa" />
			</linearGradient>
		</defs>
	</BarChart>
</ResponsiveContainer>;
```

---

## 🎬 Animation Guidelines

### Micro-interactions (Use Sparingly)

```javascript
// Add to tailwind.config.js
module.exports = {
	theme: {
		extend: {
			animation: {
				'bounce-subtle': 'bounce-subtle 2s infinite',
				shimmer: 'shimmer 2s infinite',
				'fade-in': 'fade-in 0.3s ease-out',
				'slide-up': 'slide-up 0.4s ease-out',
				'scale-in': 'scale-in 0.2s ease-out',
			},
			keyframes: {
				'bounce-subtle': {
					'0%, 100%': { transform: 'translateY(0)' },
					'50%': { transform: 'translateY(-4px)' },
				},
				shimmer: {
					'0%': { transform: 'translateX(-100%)' },
					'100%': { transform: 'translateX(100%)' },
				},
				'fade-in': {
					'0%': { opacity: '0' },
					'100%': { opacity: '1' },
				},
				'slide-up': {
					'0%': { transform: 'translateY(10px)', opacity: '0' },
					'100%': { transform: 'translateY(0)', opacity: '1' },
				},
				'scale-in': {
					'0%': { transform: 'scale(0.95)', opacity: '0' },
					'100%': { transform: 'scale(1)', opacity: '1' },
				},
			},
		},
	},
};
```

**When to Animate:**

- ✅ Page transitions (fade-in)
- ✅ Card reveals during study (scale-in)
- ✅ Success states (bounce-subtle)
- ✅ Loading states (shimmer)
- ✅ Hover states (transform)

**When NOT to Animate:**

- ❌ During rapid interactions (clicking through cards)
- ❌ Large movements (distracting)
- ❌ Continuous animations (annoying)

---

## 🌓 Dark Mode Strategy

### Toggle Implementation

```jsx
import { Moon, Sun } from 'lucide-react';

const [darkMode, setDarkMode] = useState(false);

useEffect(() => {
	if (darkMode) {
		document.documentElement.classList.add('dark');
	} else {
		document.documentElement.classList.remove('dark');
	}
}, [darkMode]);

<button
	onClick={() => setDarkMode(!darkMode)}
	className="
    p-2 rounded-lg 
    bg-gray-100 dark:bg-slate-800 
    text-gray-600 dark:text-yellow-400
    hover:scale-110 
    transition-transform
  "
>
	{darkMode ? <Sun size={20} /> : <Moon size={20} />}
</button>;
```

### Dark Mode Best Practices

1. **Use `dark:` variant consistently** - Every colored element should have a dark variant
2. **Reduce contrast in dark mode** - Pure white text on black is harsh
3. **Adjust shadows** - Lighter shadows in dark mode
4. **Test gradients** - Some gradients look bad in dark mode

```jsx
// Good dark mode example
<div
	className="
  bg-white dark:bg-slate-800
  text-gray-900 dark:text-slate-100
  shadow-lg dark:shadow-slate-900/30
  border border-gray-200 dark:border-slate-700
"
>
	{/* Content adapts to theme */}
</div>
```

---

## 📐 Spacing & Layout

### Container Widths

```jsx
// Max widths for different layouts
<div className="max-w-7xl mx-auto px-6">  {/* Dashboard */}
<div className="max-w-4xl mx-auto px-6">  {/* Study session */}
<div className="max-w-2xl mx-auto px-6">  {/* Forms, settings */}
```

### Grid Layouts

```jsx
// Responsive deck grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {decks.map(deck => <DeckCard key={deck.id} {...deck} />)}
</div>

// Stats grid
<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
  {stats.map(stat => <StatCard key={stat.id} {...stat} />)}
</div>
```

### Spacing Scale

```javascript
// Follow Tailwind's spacing scale
{
  // Tight spacing
  gap: 'gap-2',      // 8px - Between related items
  gap: 'gap-4',      // 16px - Between cards in a group

  // Medium spacing
  gap: 'gap-6',      // 24px - Between sections (most common)
  gap: 'gap-8',      // 32px - Between major sections

  // Large spacing
  gap: 'gap-12',     // 48px - Between page sections

  // Padding
  p: 'p-4',          // 16px - Small cards
  p: 'p-6',          // 24px - Standard cards
  p: 'p-8',          // 32px - Large containers
}
```

---

## 🎯 Component Library Recommendations

### Use These Sparingly (Build Most Yourself)

**Headless UI** (by Tailwind)

- Modals / Dialogs
- Dropdowns / Menus
- Transitions

```jsx
import { Dialog, Transition } from '@headlessui/react';

// Only when you need complex accessible components
```

**React Hot Toast** (for notifications)

```jsx
import toast from 'react-hot-toast';

toast.success('Card added!', {
	style: {
		background: '#10b981',
		color: '#fff',
	},
});
```

**Framer Motion** (for complex animations)

- Only if you need sophisticated page transitions
- Most animations should use Tailwind's built-in utilities

---

## 🎨 Design Tokens (Copy-Paste Ready)

```javascript
// design-tokens.js
export const tokens = {
	// Border Radius
	radius: {
		sm: 'rounded-lg', // 8px - Small elements
		md: 'rounded-xl', // 12px - Standard (use this most)
		lg: 'rounded-2xl', // 16px - Large cards
		full: 'rounded-full', // Badges, pills
	},

	// Shadows
	shadow: {
		sm: 'shadow-md', // Subtle elevation
		md: 'shadow-lg', // Standard cards
		lg: 'shadow-xl', // Prominent elements
		xl: 'shadow-2xl', // Modals, dropdowns
	},

	// Transitions
	transition: {
		fast: 'transition-all duration-150',
		normal: 'transition-all duration-200',
		slow: 'transition-all duration-300',
	},

	// Focus rings
	focus: 'focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2',

	// Disabled states
	disabled: 'opacity-50 cursor-not-allowed',
};
```

---

## 🎬 Special Effects Library

### Confetti (Celebration Moments)

```jsx
import confetti from 'canvas-confetti';

// Session complete, milestone reached
const celebrate = () => {
	confetti({
		particleCount: 100,
		spread: 70,
		origin: { y: 0.6 },
		colors: ['#14b8a6', '#06b6d4', '#10b981'],
	});
};
```

### Streak Flame Animation

```jsx
<div className="relative">
	<span className="text-4xl animate-bounce-subtle">🔥</span>
	<div
		className="
    absolute inset-0 
    bg-orange-500 
    blur-xl 
    opacity-50 
    animate-pulse
  "
	/>
</div>
```

---

## 📱 Responsive Breakpoints

```javascript
// Follow Tailwind defaults
sm: '640px'   // Mobile landscape
md: '768px'   // Tablet
lg: '1024px'  // Desktop
xl: '1280px'  // Large desktop
2xl: '1536px' // Extra large

// Common patterns
<div className="
  text-sm md:text-base lg:text-lg
  p-4 md:p-6 lg:p-8
  grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3
">
```

---

## ✅ Design Checklist

When creating a new component, ensure:

- [ ] Has both light and dark mode styles
- [ ] Includes hover/active/focus states
- [ ] Proper spacing using consistent scale
- [ ] Accessible (ARIA labels, keyboard navigation)
- [ ] Responsive on mobile/tablet/desktop
- [ ] Smooth transitions (200-300ms)
- [ ] Loading/disabled states defined
- [ ] Error states styled
- [ ] Icons from Lucide (consistent style)
- [ ] Uses design tokens for consistency

---

## 🎨 Example: Complete Deck Card Component

```jsx
const DeckCard = ({ deck, onStudy }) => {
	return (
		<div
			className="
      bg-white dark:bg-slate-800
      rounded-2xl
      shadow-lg hover:shadow-2xl
      border border-gray-100 dark:border-slate-700
      p-6
      transform hover:-translate-y-1
      transition-all duration-300
      cursor-pointer
      group
    "
		>
			{/* Header */}
			<div className="flex items-start justify-between mb-4">
				<div className="flex items-center gap-3">
					<span className="text-4xl">{deck.icon}</span>
					<div>
						<h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">
							{deck.name}
						</h3>
						<p className="text-sm text-gray-600 dark:text-slate-400">
							{deck.description}
						</p>
					</div>
				</div>
			</div>

			{/* Stats */}
			<div className="grid grid-cols-3 gap-3 mb-4">
				<div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-3">
					<div className="text-2xl font-bold text-red-600">
						{deck.dueToday}
					</div>
					<div className="text-xs text-gray-600 dark:text-slate-400">
						Due
					</div>
				</div>
				<div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-3">
					<div className="text-2xl font-bold text-teal-600">
						{deck.newCards}
					</div>
					<div className="text-xs text-gray-600 dark:text-slate-400">
						New
					</div>
				</div>
				<div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-3">
					<div className="text-2xl font-bold text-green-600">
						{deck.mastered}
					</div>
					<div className="text-xs text-gray-600 dark:text-slate-400">
						Mastered
					</div>
				</div>
			</div>

			{/* Progress */}
			<div className="h-2 bg-gray-200 dark:bg-slate-700 rounded-full mb-4 overflow-hidden">
				<div
					className="h-full bg-linear-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-500"
					style={{
						width: `${(deck.mastered / deck.totalCards) * 100}%`,
					}}
				/>
			</div>

			{/* Action */}
			<button
				onClick={() => onStudy(deck.id)}
				className="
          w-full
          flex items-center justify-center gap-2
          px-4 py-3
          bg-linear-to-r from-teal-500 to-cyan-500
          hover:from-teal-600 hover:to-cyan-600
          text-white font-medium
          rounded-xl
          shadow-lg group-hover:shadow-xl
          transition-all duration-200
        "
			>
				<Play size={18} />
				Study Now
			</button>
		</div>
	);
};
```

---

## 🎯 Summary

**Core Aesthetic:** Modern Academic with Scientific Clarity
**Primary Colors:** Teal-Cyan gradient (#14b8a6 → #06b6d4)
**Accent:** Cyan
**Typography:** Clean, readable, hierarchy-focused
**Cards:** Rounded (xl), shadowed, interactive
**Animations:** Subtle, purposeful, fast
**Dark Mode:** Full support, reduced contrast
**Icons:** Lucide React, consistent stroke width
**Charts:** Recharts with brand colors
**Mobile:** Touch-friendly, responsive grids

**Remember:** Consistency > Creativity. Use the same patterns everywhere.
