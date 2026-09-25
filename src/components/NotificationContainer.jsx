import Notification from './Notification';
import ConfirmationDialog from './ConfirmationDialog';
import { useNotification } from '../hooks/useNotification';

const NotificationContainer = () => {
	const {
		notifications,
		confirmationDialog,
		removeNotification,
		resolveConfirmation,
		closeConfirmation,
	} = useNotification();

	return (
		<>
			{/* Notification Container */}
			<div className="fixed top-4 right-4 z-40 space-y-2">
				{notifications.map((notification) => (
					<Notification
						key={notification.id}
						notification={notification}
						onClose={removeNotification}
					/>
				))}
			</div>

			{/* Confirmation Dialog */}
			<ConfirmationDialog
				isOpen={confirmationDialog.isOpen}
				onClose={closeConfirmation}
				onCancel={() => resolveConfirmation(false)}
				onConfirm={() => resolveConfirmation(true)}
				title={confirmationDialog.title}
				message={confirmationDialog.message}
				confirmText={confirmationDialog.confirmText}
				cancelText={confirmationDialog.cancelText}
				type={confirmationDialog.type}
			/>
		</>
	);
};

export default NotificationContainer;
