import Notification from "./Notification";
import ConfirmationDialog from "./ConfirmationDialog";
import { useNotification } from "../contexts/NotificationContext";

const NotificationContainer = () => {
	const {
		notifications,
		confirmationDialog,
		removeNotification,
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
				onConfirm={confirmationDialog.onConfirm}
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
