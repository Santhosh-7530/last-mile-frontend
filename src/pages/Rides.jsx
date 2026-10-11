import { lazy, Suspense, useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import RideCard from '../components/RideCard';
import { EmptyState, ErrorState, LoadingState } from '../components/PageState';

const RouteMap = lazy(() => import('../components/RouteMap'));

function extractRides(payload) {
	if (Array.isArray(payload)) return payload;
	for (const key of ['rides', 'content', 'data', 'results']) {
		if (Array.isArray(payload?.[key])) return payload[key];
	}
	return [];
}

function errorMessage(error, fallback) {
	return error.response?.data?.message || error.response?.data?.error || fallback;
}

export default function Rides() {
	const { user } = useAuth();
	const [filters, setFilters] = useState({ pickup: '', destination: '', date: '' });
	const [mapLocations, setMapLocations] = useState({ pickup: '', destination: '' });
	const [rides, setRides] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [notice, setNotice] = useState(null);
	const [requestingId, setRequestingId] = useState(null);

	async function search(searchFilters = filters) {
		setLoading(true);
		setError('');
		setNotice(null);
		setMapLocations({ pickup: searchFilters.pickup.trim(), destination: searchFilters.destination.trim() });
		const params = Object.fromEntries(Object.entries(searchFilters).map(([key, value]) => [key, value.trim()]).filter(([, value]) => value));
		try {
			const response = await api.get('/rides', { params });
			setRides(extractRides(response.data));
		} catch (requestError) {
			setRides([]);
			setError(errorMessage(requestError, 'Unable to load rides. Please try again.'));
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => { search({ pickup: '', destination: '', date: '' }); }, []);

	async function requestRide(rideId) {
		setRequestingId(rideId);
		setNotice(null);
		try {
			await api.post(`/requests/ride/${rideId}`);
			setNotice({ kind: 'success', text: 'Your ride request was sent.' });
		} catch (requestError) {
			const status = requestError.response?.status;
			const fallback = status === 401 ? 'Please sign in to request a ride.'
				: status === 400 || status === 409 ? 'The ride request was rejected. It may be your ride, already requested, or have no seats left.'
					: 'Unable to send your request. Please try again.';
			setNotice({ kind: 'error', text: errorMessage(requestError, fallback) });
		} finally {
			setRequestingId(null);
		}
	}

	function clearFilters() {
		const cleared = { pickup: '', destination: '', date: '' };
		setFilters(cleared);
		search(cleared);
	}

	return <section className="page-content">
		<div className="page-heading">
			<div><span className="eyebrow">COMMUNITY TRAVEL</span><h1>Find a Ride</h1><p>Find convenient rides from people travelling your way.</p></div>
			<span className="heading-count">{loading ? 'Searching...' : `${rides.length} ${rides.length === 1 ? 'ride' : 'rides'}`}</span>
		</div>

		<form className="search-panel" onSubmit={event => { event.preventDefault(); search(); }}>
			<label>Pickup location<input autoComplete="off" placeholder="Where are you starting?" value={filters.pickup} onChange={event => setFilters({ ...filters, pickup: event.target.value })} /></label>
			<label>Destination<input autoComplete="off" placeholder="Where are you going?" value={filters.destination} onChange={event => setFilters({ ...filters, destination: event.target.value })} /></label>
			<label>Date<input type="date" min={new Date().toISOString().slice(0, 10)} value={filters.date} onChange={event => setFilters({ ...filters, date: event.target.value })} /></label>
			<div className="search-actions"><button className="button button-primary" type="submit" disabled={loading}>Search rides</button><button className="button button-quiet" type="button" onClick={clearFilters} disabled={loading}>Clear filters</button></div>
		</form>

		{notice && <div className={`notice notice-${notice.kind}`} role="status">{notice.text}</div>}
		<div className="ride-discovery-layout">
			<div className="ride-results-column">
				<div className="results-heading"><h2>Available rides</h2><span>Routes shared by your community</span></div>
				{loading ? <LoadingState label="Loading rides..." /> : error ? <ErrorState message={error} onRetry={() => search()} /> : rides.length === 0 ? <EmptyState title="No rides found." detail="Try another location or date, or clear your filters to see all available rides." /> : <div className="ride-list">{rides.map((ride, index) => <RideCard key={ride.id ?? `${ride.pickup}-${ride.destination}-${index}`} ride={ride} user={user} onRequest={requestRide} requesting={requestingId === ride.id} />)}</div>}
			</div>
			<Suspense fallback={<LoadingState label="Loading map..." />}><RouteMap pickup={mapLocations.pickup} destination={mapLocations.destination} /></Suspense>
		</div>
	</section>;
}
