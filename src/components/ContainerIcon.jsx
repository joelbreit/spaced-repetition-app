import { resolveContainerIcon } from '../config/containerIcons';

export default function ContainerIcon({
	name,
	isFolder = false,
	className = 'h-5 w-5',
}) {
	const Icon = resolveContainerIcon(name, isFolder);
	return <Icon className={className} aria-hidden="true" />;
}
