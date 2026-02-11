import { useState, useCallback } from 'react';
import { NotificationContext } from './NotificationContext.js';

export const NotificationProvider = ({ children }) => {
	const [notifications, setNotifications] = useState([]);
	const [confirmationDialog, setConfirmationDialog] = useState({
		isOpen: false,
		title: '',
		message: '',
		onConfirm: null,
		confirmText: 'Confirm',
		cancelText: 'Cancel',
		type: 'warning',
	});

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

	const showConfirmation = useCallback((options) => {
		return new Promise((resolve) => {
			setConfirmationDialog({
				isOpen: true,
				title: options.title || 'Confirm Action',
				message: options.message || 'Are you sure?',
				confirmText: options.confirmText || 'Confirm',
				cancelText: options.cancelText || 'Cancel',
				type: options.type || 'warning',
				onConfirm: () => resolve(true),
			});
		});
	}, []);

	const closeConfirmation = useCallback(() => {
		setConfirmationDialog((prev) => ({
			...prev,
			isOpen: false,
			onConfirm: null,
		}));
	}, []);

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
		closeConfirmation,
	};

	return (
		<NotificationContext.Provider value={value}>
			{children}
		</NotificationContext.Provider>
	);
};
