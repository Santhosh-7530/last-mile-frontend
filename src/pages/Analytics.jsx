import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { EmptyState, ErrorState, LoadingState } from '../components/PageState';

function asList(payload) {
	if (Array.isArray(payload)) return payload;
	return payload?.content || payload?.rides || payload?.requests || [];
}

export default function Analytics() {
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	async function load() {
		setLoading(true);
		setError('');
		try {
			const [ridesResponse, requestsResponse, passesResponse] = await Promise.all([
				api.get('/rides/mine'),
				api.get('/requests/mine'),
				api.get('/passes')
			]);
			const rides = asList(ridesResponse.data);
			const requests = asList(requestsResponse.data);
			const passes = asList(passesResponse.data);
			const completedRides = rides.filter(ride => String(ride.status || '').toUpperCase() === 'COMPLETED');
			setData({
				rides: rides.length,
				completed: completedRides.length,
				seatsShared: rides.reduce((total, ride) => total + Math.max(0, Number(ride.seatsTotal || 0) - Number(ride.seatsAvailable || 0)), 0),
				requests: requests.length,
				accepted: requests.filter(request => String(request.status || '').toUpperCase() === 'ACCEPTED').length,
				passes: passes.length
			});
		} catch (requestError) {
			setError(requestError.response?.data?.message || 'Unable to load your analytics.');
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => { load(); }, []);

	return <section className="page-content">
		<div className="page-heading"><div><span className="eyebrow">YOUR TRAVEL ACTIVITY</span><h1>Analytics</h1><p>Totals derived from your ride, request, and pass records.</p></div></div>
		{loading ? <LoadingState label="Loading your activity..." /> : error ? <ErrorState message={error} onRetry={load} /> : data && (data.rides || data.requests || data.passes) ? <div className="stats-grid">
			<div className="stat-card"><span>Rides offered</span><strong>{data.rides}</strong></div>
			<div className="stat-card"><span>Completed rides</span><strong>{data.completed}</strong></div>
			<div className="stat-card"><span>Passenger seats filled</span><strong>{data.seatsShared}</strong></div>
			<div className="stat-card"><span>Requests sent</span><strong>{data.requests}</strong></div>
			<div className="stat-card"><span>Requests accepted</span><strong>{data.accepted}</strong></div>
			<div className="stat-card"><span>Pass records</span><strong>{data.passes}</strong></div>
		</div> : <EmptyState title="No activity to summarize yet." detail="Analytics are calculated from records returned by your account APIs; no sample totals are used." />}
		<div className="notice" role="note">These are account-level record counts, not a full analytics service. Passenger ride history, distance, emissions, and time-series reporting are not available from the current backend APIs.</div>
	</section>;
}
