import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./config/amplify";
import { AuthProvider } from "./contexts/AuthContext";
import { NotificationProvider } from "./contexts/NotificationContext.jsx";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AppDataProvider } from "./contexts/AppDataContext";
import ProfilePage from "./pages/ProfilePage";
import OverviewPage from "./pages/OverviewPage";

function App() {
	return (
		<ThemeProvider>
			<AuthProvider>
				<NotificationProvider>
					<AppDataProvider>
						<Router>
							<Routes>
								<Route path="/" element={<OverviewPage />} />
								<Route
									path="/profile"
									element={<ProfilePage />}
								/>
							</Routes>
						</Router>
					</AppDataProvider>
				</NotificationProvider>
			</AuthProvider>
		</ThemeProvider>
	);
}

export default App;
