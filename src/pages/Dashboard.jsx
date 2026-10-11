import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { EmptyState, ErrorState, LoadingState } from '../components/PageState';

function asList(payload) {
	if (Array.isArray(payload)) return payload;
	for (const key of ['rides', 'content', 'data', 'results']) if (Array.isArray(payload?.[key])) return payload[key];
	return [];
}

function belongsToUser(ride, user) {
	const ownerId = ride.driverId ?? ride.driver?.id ?? ride.driver?.userId;
	return user?.id != null && String(ownerId) === String(user.id);
}

export default function Dashboard() {
	const { user } = useAuth();
	const [stats, setStats] = useState({ available: null, mine: null, requests: null, passes: null });
	const [upcoming, setUpcoming] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	useEffect(() => {
		let mounted = true;
		Promise.allSettled([api.get('/rides'), api.get('/rides/mine'), api.get('/requests/mine'), api.get('/passes')]).then(([rideResult, mineResult, requestResult, passResult]) => {
			if (!mounted) return;
			if (rideResult.status === 'fulfilled') {
				const rides = asList(rideResult.value.data);
				const now = Date.now();
				setStats(current => ({ ...current, available: rides.length }));
				setUpcoming(rides.filter(ride => !ride.departureTime || new Date(ride.departureTime).getTime() >= now).slice(0, 4));
			}
			if (mineResult.status === 'fulfilled') {
				const rides = asList(mineResult.value.data);
				setStats(current => ({ ...current, mine: rides.filter(ride => belongsToUser(ride, user)).length }));
			}
			if (requestResult.status === 'fulfilled') {
				const requests = Array.isArray(requestResult.value.data) ? requestResult.value.data : requestResult.value.data?.content || [];
				setStats(current => ({ ...current, requests: requests.length }));
			}
			if (passResult.status === 'fulfilled') {
				const passes = Array.isArray(passResult.value.data) ? passResult.value.data : passResult.value.data?.content || [];
				const activePasses = passes.filter(pass => {
					const status = String(pass.status || '').toUpperCase();
					const validUntil = pass.validUntil || pass.endDate;
					return !status.includes('EXPIRED') && !status.includes('CANCEL') && (!validUntil || new Date(validUntil).getTime() >= Date.now());
				});
				setStats(current => ({ ...current, passes: activePasses.length }));
			}
			if ([rideResult, mineResult, requestResult, passResult].some(result => result.status === 'rejected')) {
				const firstFailure = [rideResult, mineResult, requestResult, passResult].find(result => result.status === 'rejected');
				setError(firstFailure.reason.response?.data?.message || 'Some dashboard data could not be loaded. Available results are shown.');
			}
		}).finally(() => { if (mounted) setLoading(false); });
		return () => { mounted = false; };
	}, [user]);

	const name = user?.name?.trim()?.split(/\s+/)[0] || 'there';
	return <section className="page-content dashboard-page">
		<div className="welcome-row"><div><span className="eyebrow">YOUR COMMUNITY, IN MOTION</span><h1>Welcome back, {name}</h1><p>Where are you headed today?</p></div><div className="welcome-actions"><Link className="button button-primary" to="/rides">Find a Ride</Link><Link className="button button-outline" to="/offer">Offer a Ride</Link></div></div>
		<div className="quick-links">
			<Link to="/rides"><span className="quick-icon">↗</span><span><strong>Find a Ride</strong><small>Search community trips</small></span></Link>
			<Link to="/offer"><span className="quick-icon">＋</span><span><strong>Offer a Ride</strong><small>Share your available seats</small></span></Link>
			<Link to="/my-rides"><span className="quick-icon">⌁</span><span><strong>My Rides</strong><small>Review your trips</small></span></Link>
			<Link to="/requests"><span className="quick-icon">◎</span><span><strong>My Requests</strong><small>Track ride requests</small></span></Link>
			<Link to="/recurring"><span className="quick-icon">↻</span><span><strong>Recurring</strong><small>Manage ride schedules</small></span></Link>
			<Link to="/notifications"><span className="quick-icon">◉</span><span><strong>Notifications</strong><small>Read account updates</small></span></Link>
			<Link to="/safety"><span className="quick-icon">＋</span><span><strong>Safety Center</strong><small>Submit a report</small></span></Link>
			<Link to="/analytics"><span className="quick-icon">▥</span><span><strong>Analytics</strong><small>Review travel activity</small></span></Link>
		</div>
		<div className="stats-grid">
			<div className="stat-card"><span>Available rides</span><strong>{loading ? '—' : stats.available ?? '—'}</strong></div>
			<div className="stat-card"><span>My rides</span><strong>{loading ? '—' : stats.mine ?? '—'}</strong></div>
			<div className="stat-card"><span>Ride requests</span><strong>{loading ? '—' : stats.requests ?? '—'}</strong></div>
			<div className="stat-card"><span>Active passes</span><strong>{loading ? '—' : stats.passes == null ? '—' : stats.passes}</strong></div>
			<div className="stat-card"><span>Trust score</span><strong>{user?.trustScore == null ? '—' : Number(user.trustScore).toFixed(1)}</strong></div>
		</div>
		<div className="section-title"><div><h2>Upcoming rides</h2><p>Recent trips shared by your community</p></div><Link to="/rides">Browse all</Link></div>
		{loading ? <LoadingState label="Loading rides..." /> : upcoming.length ? <div className="ride-list">{upcoming.map((ride, index) => <article className="compact-ride" key={ride.id ?? index}><div><strong>{ride.pickup || 'Pickup'} <span>→</span> {ride.destination || 'Destination'}</strong><small>{ride.departureTime ? new Date(ride.departureTime).toLocaleString() : 'Time to be confirmed'}</small></div><span className="compact-price">₹{ride.costPerPassenger ?? '—'} <small>/ passenger</small></span><Link className="button button-secondary" to={`/rides/${ride.id}`} state={{ ride }}>Details</Link></article>)}</div> : <EmptyState title="No upcoming rides yet." detail="Browse available rides or offer a seat on your next trip." />}
		{error && <ErrorState message={error} onRetry={() => location.reload()} />}
	</section>;
}
