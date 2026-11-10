import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';

const STROKE_WIDTH = 2.5;

/**
 * Build a rounded-rect path that starts at the top-center and runs clockwise,
 * so a dash-offset reveal grows like a clock hand around the border.
 */
function buildPath(width, height, radius) {
	const inset = STROKE_WIDTH / 2;
	const x0 = inset;
	const y0 = inset;
	const x1 = width - inset;
	const y1 = height - inset;
	const r = Math.max(
		0,
		Math.min(radius - inset, (x1 - x0) / 2, (y1 - y0) / 2)
	);
	const cx = width / 2;

	return [
		`M ${cx} ${y0}`,
		`H ${x1 - r}`,
		`A ${r} ${r} 0 0 1 ${x1} ${y0 + r}`,
		`V ${y1 - r}`,
		`A ${r} ${r} 0 0 1 ${x1 - r} ${y1}`,
		`H ${x0 + r}`,
		`A ${r} ${r} 0 0 1 ${x0} ${y1 - r}`,
		`V ${y0 + r}`,
		`A ${r} ${r} 0 0 1 ${x0 + r} ${y0}`,
		`H ${cx}`,
	].join(' ');
}

/**
 * Colored outline that fills clockwise around its parent (which must be
 * `relative`) as audio plays. Reads progress straight from the <audio> element
 * each animation frame, so it doesn't re-render the parent while playing.
 *
 * @param {object} props
 * @param {React.RefObject<HTMLAudioElement>} props.audioRef
 * @param {boolean} props.isPlaying - Whether audio is currently playing
 * @param {unknown} props.resetKey - Progress clears whenever this changes
 * @param {number} [props.radius=12] - Border radius of the parent, in px
 */
export default function AudioProgressBorder({
	audioRef,
	isPlaying,
	resetKey,
	radius = 12,
}) {
	const svgRef = useRef(null);
	const pathRef = useRef(null);
	const [size, setSize] = useState(null);
	const [visible, setVisible] = useState(false);
	const gradientId = useId();

	// Track the parent's size so the outline hugs the button exactly
	useLayoutEffect(() => {
		const parent = svgRef.current?.parentElement;
		if (!parent) return;
		const measure = () =>
			setSize({ w: parent.offsetWidth, h: parent.offsetHeight });
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(parent);
		return () => observer.disconnect();
	}, []);

	const setProgress = (fraction) => {
		if (pathRef.current) {
			const p = Math.max(0, Math.min(1, fraction || 0));
			pathRef.current.style.strokeDashoffset = String(1 - p);
		}
	};

	const readProgress = () => {
		const audio = audioRef.current;
		if (!audio || !audio.duration || !isFinite(audio.duration)) return 0;
		return audio.currentTime / audio.duration;
	};

	// Animate while playing; keep the partial outline while paused
	useEffect(() => {
		if (!isPlaying) return;
		setVisible(true);
		let frame;
		const tick = () => {
			setProgress(readProgress());
			frame = requestAnimationFrame(tick);
		};
		tick();
		return () => cancelAnimationFrame(frame);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isPlaying]);

	// Complete the loop on end, then fade; clear when new audio loads
	useEffect(() => {
		const audio = audioRef.current;
		if (!audio) return;
		const handleEnded = () => {
			setProgress(1);
			setVisible(false);
		};
		const handleLoadStart = () => setProgress(0);
		audio.addEventListener('ended', handleEnded);
		audio.addEventListener('loadstart', handleLoadStart);
		return () => {
			audio.removeEventListener('ended', handleEnded);
			audio.removeEventListener('loadstart', handleLoadStart);
		};
	}, [audioRef]);

	// Card changed or flipped: drop any leftover progress
	useEffect(() => {
		setVisible(false);
		setProgress(0);
	}, [resetKey]);

	return (
		<svg
			ref={svgRef}
			aria-hidden="true"
			className={`pointer-events-none absolute inset-0 overflow-visible transition-opacity duration-300 ${
				visible ? 'opacity-100' : 'opacity-0'
			}`}
			width={size?.w ?? 0}
			height={size?.h ?? 0}
		>
			<defs>
				<linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
					<stop offset="0%" stopColor="#14b8a6" />
					<stop offset="100%" stopColor="#06b6d4" />
				</linearGradient>
			</defs>
			{size && (
				<path
					ref={pathRef}
					d={buildPath(size.w, size.h, radius)}
					fill="none"
					stroke={`url(#${gradientId})`}
					strokeWidth={STROKE_WIDTH}
					strokeLinecap="round"
					pathLength={1}
					strokeDasharray="1 1"
					style={{ strokeDashoffset: 1 }}
				/>
			)}
		</svg>
	);
}
