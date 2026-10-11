import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { api } from '../services/api';
import { ErrorState, LoadingState } from '../components/PageState';

const RouteMap = lazy(() => import('../components/RouteMap'));

function asList(payload) {
	if (Array.isArray(payload)) return payload;
	for (const key of ['rides', 'content', 'data', 'results']) {
		if (Array.isArray(payload?.[key])) return payload[key];
	}
	return [];
}

export default function RideDetails() {
	const { rideId } = useParams();
	const location = useLocation();
	const [ride, setRide] = useState(location.state?.ride || null);
	const [loading, setLoading] = useState(!location.state?.ride);
	const [error, setError] = useState('');

	async function load() {
		setLoading(true);
		setError('');
		try {
			const response = await api.get('/rides');
			const match = asList(response.data).find(item => String(item.id) === rideId);
			if (!match) {
				setRide(null);
				setError('This ride is not in the current available-rides list.');
				return;
			}
			setRide(match);
		} catch (requestError) {
			setError(requestError.response?.data?.message || 'Unable to load this ride. Please try again.');
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		if (!ride) load();
	}, [rideId]);

	if (loading) return <section className="page-content"><div className="page-heading"><div><span className="eyebrow">RIDE DETAILS</span><h1>Loading ride details</h1></div></div><LoadingState label="Loading ride details..." /></section>;
	if (error || !ride) return <section className="page-content"><div className="page-heading"><div><span className="eyebrow">RIDE DETAILS</span><h1>Ride details unavailable</h1></div></div><ErrorState message={error || 'Ride details are unavailable.'} onRetry={load} /><Link className="button button-secondary" to="/rides">Back to Find Ride</Link></section>;

	const driver = ride.driver || {};
	return <section className="page-content">
		<div className="page-heading">
			<div><span className="eyebrow">RIDE DETAILS</span><h1>{ride.pickup} <span className="route-arrow">→</span> {ride.destination}</h1><p>Ride information returned by the current rides API.</p></div>
			<Link className="button button-secondary" to="/rides">Back to Find Ride</Link>
		</div>
		<article className="ride-card ride-detail-card">
			<div className="ride-card-main">
				<div className="ride-meta">
					<div><span className="meta-label">Departure</span><strong>{ride.departureTime ? new Date(ride.departureTime).toLocaleString() : 'Not provided'}</strong></div>
					<div><span className="meta-label">Driver</span><strong>{driver.name || ride.driverName || 'Community driver'}</strong></div>
					<div><span className="meta-label">Seats available</span><strong>{ride.seatsAvailable ?? '—'} of {ride.seatsTotal ?? '—'}</strong></div>
					<div><span className="meta-label">Price per passenger</span><strong>₹{ride.costPerPassenger ?? '—'}</strong></div>
					<div><span className="meta-label">Status</span><strong>{ride.status || 'Not provided'}</strong></div>
					{ride.description && <div><span className="meta-label">About this ride</span><strong>{ride.description}</strong></div>}
					{ride.vehicle && <div><span className="meta-label">Vehicle</span><strong>{ride.vehicle}</strong></div>}
				</div>
			</div>
		</article>
		<Suspense fallback={<LoadingState label="Loading map..." />}><RouteMap pickup={ride.pickup} destination={ride.destination} ride={ride} /></Suspense>
		<div className="notice" role="note">The backend does not currently expose a GET /api/rides/{'{id}'} endpoint. Details are loaded from the active rides list; if the ride is no longer listed, its details cannot be fetched.</div>
	</section>;
}
