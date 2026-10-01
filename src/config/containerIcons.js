import {
	BookOpen,
	Folder,
	Library,
	Brain,
	GraduationCap,
	Languages,
	FlaskConical,
	Atom,
	Calculator,
	Code,
	Globe,
	Landmark,
	Briefcase,
	Stethoscope,
	Heart,
	Leaf,
	Music,
	Palette,
	Feather,
	Camera,
	Utensils,
	Dumbbell,
	Gamepad2,
	Plane,
	Map,
	PawPrint,
	Lightbulb,
	Star,
	Trophy,
	Rocket,
} from 'lucide-react';

// Deck and folder symbols are stored as one of these keys (deckSymbol /
// folderSymbol). Anything else - including emoji saved by older versions of
// the app - falls back to the default icon for that container type.
export const CONTAINER_ICONS = {
	'book-open': BookOpen,
	folder: Folder,
	library: Library,
	brain: Brain,
	'graduation-cap': GraduationCap,
	languages: Languages,
	flask: FlaskConical,
	atom: Atom,
	calculator: Calculator,
	code: Code,
	globe: Globe,
	landmark: Landmark,
	briefcase: Briefcase,
	stethoscope: Stethoscope,
	heart: Heart,
	leaf: Leaf,
	music: Music,
	palette: Palette,
	feather: Feather,
	camera: Camera,
	utensils: Utensils,
	dumbbell: Dumbbell,
	gamepad: Gamepad2,
	plane: Plane,
	map: Map,
	paw: PawPrint,
	lightbulb: Lightbulb,
	star: Star,
	trophy: Trophy,
	rocket: Rocket,
};

export const DEFAULT_DECK_ICON = 'book-open';
export const DEFAULT_FOLDER_ICON = 'folder';

export function resolveContainerIcon(name, isFolder = false) {
	return (
		CONTAINER_ICONS[name] ||
		CONTAINER_ICONS[isFolder ? DEFAULT_FOLDER_ICON : DEFAULT_DECK_ICON]
	);
}

// Normalize a stored symbol to a valid icon key (legacy emoji -> default)
export function normalizeContainerIcon(name, isFolder = false) {
	if (CONTAINER_ICONS[name]) return name;
	return isFolder ? DEFAULT_FOLDER_ICON : DEFAULT_DECK_ICON;
}
