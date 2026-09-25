import { useState, useCallback, useRef } from 'react';
import { NotificationContext } from './NotificationContext.js';

export const NotificationProvider = ({ children }) => {
	const [notifications, setNotifications] = useState([]);
	const [confirmationDialog, setConfirmationDialog] = useState({
		isOpen: false,
		title: '',
		message: '',
		confirmText: 'Confirm',
		cancelText: 'Cancel',
		type: 'warning',
	});
	const confirmationResolverRef = useRef(null);

	const addNotification = useCallback((notification) => {
		const id = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
		const newNotification = {
			id,
			type: 'info',
			duration: 5000,
			...notification,
		};
		setNotifications((prev) => [...prev, newNotification]);
		return id;
	}, []);

	const removeNotification = useCallback((id) => {
		setNotifications((prev) =>
			prev.filter((notification) => notification.id !== id)
		);
	}, []);

	const showSuccess = useCallback(
		(message, title = 'Success') => {
			return addNotification({ type: 'success', message, title });
		},
		[addNotification]
	);

	const showError = useCallback(
		(message, title = 'Error') => {
			return addNotification({ type: 'error', message, title });
		},
		[addNotification]
	);

	const showWarning = useCallback(
		(message, title = 'Warning') => {
			return addNotification({ type: 'warning', message, title });
		},
		[addNotification]
	);

	const showInfo = useCallback(
		(message, title = 'Info') => {
			return addNotification({ type: 'info', message, title });
		},
		[addNotification]
	);

	// Resolves true (confirm button), false (cancel button), or null (dismissed
	// via Escape, the X, or the backdrop). Callers whose cancel button is itself
	// an action, like "Delete Only This Card", tell false and null apart.
	const showConfirmation = useCallback((options) => {
		return new Promise((resolve) => {
			confirmationResolverRef.current?.(null);
			confirmationResolverRef.current = resolve;
			setConfirmationDialog({
				isOpen: true,
				title: options.title || 'Confirm Action',
				message: options.message || 'Are you sure?',
				confirmText: options.confirmText || 'Confirm',
				cancelText: options.cancelText || 'Cancel',
				type: options.type || 'warning',
			});
		});
	}, []);

	const resolveConfirmation = useCallback((result) => {
		confirmationResolverRef.current?.(result);
		confirmationResolverRef.current = null;
		setConfirmationDialog((prev) => ({ ...prev, isOpen: false }));
	}, []);

	const closeConfirmation = useCallback(
		() => resolveConfirmation(null),
		[resolveConfirmation]
	);

	const value = {
		notifications,
		confirmationDialog,
		addNotification,
		removeNotification,
		showSuccess,
		showError,
		showWarning,
		showInfo,
		showConfirmation,
		resolveConfirmation,
		closeConfirmation,
	};

	return (
		<NotificationContext.Provider value={value}>
			{children}
		</NotificationContext.Provider>
	);
};
