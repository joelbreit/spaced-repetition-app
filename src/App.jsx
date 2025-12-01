import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
// import ProfilePage from "./pages/ProfilePage";
// import About from "./pages/About";
import OverviewPage from "./pages/OverviewPage";

function App() {
	return (
		<Router>
			<Routes>
				<Route path="/" element={<OverviewPage />} />
				{/* <Route path="/profile" element={<ProfilePage />} /> */}
			</Routes>
		</Router>
	);
}

export default App;
