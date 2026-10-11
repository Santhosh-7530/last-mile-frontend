import { NavLink, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Rides from './pages/Rides';
import MyRides from './pages/MyRides';
import OfferRide from './pages/OfferRide';
import Requests from './pages/Requests';
import Passes from './pages/Passes';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import RideDetails from './pages/RideDetails';
import RecurringRides from './pages/RecurringRides';
import Notifications from './pages/Notifications';
import SafetyCenter from './pages/SafetyCenter';
import Analytics from './pages/Analytics';

function Protected({ children }) {
	const { user, loading } = useAuth();
	if (loading) return <div className="center">Loading...</div>;
	return user ? children : <Navigate to="/login" replace />;
}

function Layout() {
	const { user, logout } = useAuth();
	return <div className="app-shell">
		<header className="site-header">
			<NavLink className="brand" to="/" aria-label="Last Mile home"><span className="brand-mark">LM</span><span>Last Mile</span></NavLink>
			<nav className="primary-nav" aria-label="Main navigation">
				<NavLink end to="/">Dashboard</NavLink>
				<NavLink to="/rides">Find Ride</NavLink>
				<NavLink to="/offer">Offer Ride</NavLink>
				<NavLink to="/my-rides">My Rides</NavLink>
				<NavLink to="/requests">Requests</NavLink>
				<NavLink to="/recurring">Recurring</NavLink>
				<NavLink to="/passes">Monthly Pass</NavLink>
				<NavLink to="/notifications">Notifications</NavLink>
				<NavLink to="/profile">Profile</NavLink>
				<NavLink to="/safety">Safety</NavLink>
				<NavLink to="/analytics">Analytics</NavLink>
				{user?.role === 'ADMIN' && <NavLink to="/admin">Admin</NavLink>}
			</nav>
			<button className="logout-button" type="button" onClick={logout}>Log out</button>
		</header>
		<main className="app-main"><Outlet /></main>
		<footer className="site-footer">Last Mile <span>·</span> Community rides, shared locally</footer>
	</div>;
}

export default function App() {
	return <Routes>
		<Route path="/login" element={<Login />} />
		<Route path="/register" element={<Register />} />
		<Route path="/" element={<Protected><Layout /></Protected>}>
			<Route index element={<Dashboard />} />
			<Route path="rides" element={<Rides />} />
			<Route path="rides/:rideId" element={<RideDetails />} />
			<Route path="my-rides" element={<MyRides />} />
			<Route path="offer" element={<OfferRide />} />
			<Route path="requests" element={<Requests />} />
			<Route path="recurring" element={<RecurringRides />} />
			<Route path="passes" element={<Passes />} />
			<Route path="notifications" element={<Notifications />} />
			<Route path="profile" element={<Profile />} />
			<Route path="safety" element={<SafetyCenter />} />
			<Route path="analytics" element={<Analytics />} />
			<Route path="admin" element={<Admin />} />
		</Route>
		<Route path="*" element={<Navigate to="/" replace />} />
	</Routes>;
}
