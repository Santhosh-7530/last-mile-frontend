import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { EmptyState, ErrorState, LoadingState } from '../components/PageState';

function asList(payload) {
	if (Array.isArray(payload)) return payload;
	for (const key of ['requests', 'content', 'data', 'results']) if (Array.isArray(payload?.[key])) return payload[key];
	return [];
}

export default function Requests() {
	const [mine, setMine] = useState([]);
	const [incoming, setIncoming] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [message, setMessage] = useState(null);
	const [workingId, setWorkingId] = useState(null);

	async function load() {
		setLoading(true);
		setError('');
		const results = await Promise.allSettled([api.get('/requests/mine'), api.get('/requests/incoming')]);
		const [mineResult, incomingResult] = results;
		if (mineResult.status === 'fulfilled') setMine(asList(mineResult.value.data));
		else setMine([]);
		if (incomingResult.status === 'fulfilled') setIncoming(asList(incomingResult.value.data));
		else setIncoming([]);
		if (results.every(result => result.status === 'rejected')) setError('Unable to load requests. Please try again.');
		else if (results.some(result => result.status === 'rejected')) setError('Some requests could not be loaded. The available results are shown below.');
		setLoading(false);
	}

	useEffect(() => { load(); }, []);

	async function updateRequest(id, action) {
		setWorkingId(id);
		setMessage(null);
		try {
			await api.put(`/requests/${id}/${action}`);
			setMessage({ kind: 'success', text: `Request ${action === 'accept' ? 'accepted' : 'rejected'} successfully.` });
			await load();
		} catch (requestError) {
			setMessage({ kind: 'error', text: requestError.response?.data?.message || 'Unable to update this request.' });
		} finally {
			setWorkingId(null);
		}
	}

	function RideRequest({ request, incomingRequest = false }) {
		const ride = request.ride || {};
		return <article className="request-card">
			<div className="request-card-top"><strong>{incomingRequest ? request.passenger?.name || 'Passenger' : `${ride.pickup || 'Pickup'} → ${ride.destination || 'Destination'}`}</strong><span className={`status-tag status-${String(request.status || 'pending').toLowerCase()}`}>{request.status || 'PENDING'}</span></div>
			{incomingRequest && <p className="request-route">{ride.pickup || 'Pickup'} <span>→</span> {ride.destination || 'Destination'}</p>}
			{incomingRequest && request.passenger?.email && <p className="request-detail">{request.passenger.email}</p>}
			<p className="request-detail">{request.requestedAt ? new Date(request.requestedAt).toLocaleString() : 'Request date unavailable'}</p>
			{incomingRequest && String(request.status).toUpperCase() === 'PENDING' && <div className="request-actions"><button className="button button-primary" disabled={workingId === request.id} onClick={() => updateRequest(request.id, 'accept')}>{workingId === request.id ? 'Updating...' : 'Accept'}</button><button className="button button-danger" disabled={workingId === request.id} onClick={() => updateRequest(request.id, 'reject')}>Reject</button></div>}
		</article>;
	}

	return <section className="page-content">
		<div className="page-heading"><div><span className="eyebrow">RIDE COORDINATION</span><h1>Requests</h1><p>Follow your ride requests and respond to passengers.</p></div></div>
		{message && <div className={`notice notice-${message.kind}`} role="status">{message.text}</div>}
		<div className="notice" role="note">The backend supports driver accept/reject actions, but does not currently expose passenger request cancellation.</div>
		{loading ? <LoadingState label="Loading requests..." /> : error && mine.length === 0 && incoming.length === 0 ? <ErrorState message={error} onRetry={load} /> : <>
			{error && <div className="notice notice-error" role="status">{error}</div>}
			<div className="section-title"><div><h2>My requests</h2><p>Rides you have asked to join</p></div><span className="heading-count">{mine.length}</span></div>
			{mine.length ? <div className="request-list">{mine.map((request, index) => <RideRequest key={request.id ?? index} request={request} />)}</div> : <EmptyState title="No ride requests yet." detail="When you request a ride, it will appear here." />}
			<div className="section-title"><div><h2>Requests for my rides</h2><p>Passengers waiting for your response</p></div><span className="heading-count">{incoming.length}</span></div>
			{incoming.length ? <div className="request-list">{incoming.map((request, index) => <RideRequest key={request.id ?? index} request={request} incomingRequest />)}</div> : <EmptyState title="No incoming requests." detail="New passenger requests for your rides will appear here." />}
		</>}
	</section>;
}
