import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { EmptyState, ErrorState, LoadingState } from '../components/PageState';

function asList(payload) {
	if (Array.isArray(payload)) return payload;
	return payload?.content || payload?.notifications || [];
}

export default function Notifications() {
	const [items, setItems] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [notice, setNotice] = useState('');
	const [workingId, setWorkingId] = useState(null);

	async function load() {
		setLoading(true);
		setError('');
		try {
			const response = await api.get('/notifications');
			setItems(asList(response.data));
		} catch (requestError) {
			setError(requestError.response?.data?.message || 'Unable to load notifications.');
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => { load(); }, []);

	async function markAllRead() {
		setWorkingId('all');
		setError('');
		setNotice('');
		try {
			await api.put('/notifications/read-all');
			setNotice('All notifications marked as read.');
			await load();
		} catch (requestError) {
			setError(requestError.response?.data?.message || 'Unable to update notifications.');
		} finally {
			setWorkingId(null);
		}
	}

	return <section className="page-content">
		<div className="page-heading"><div><span className="eyebrow">COMMUNITY UPDATES</span><h1>Notifications</h1><p>Updates returned by your account’s notifications API.</p></div>
			<button className="button button-secondary" type="button" disabled={loading || workingId === 'all' || !items.some(item => !item.read)} onClick={markAllRead}>Mark all read</button>
		</div>
		{notice && <div className="notice notice-success" role="status">{notice}</div>}
		{error && <div className="notice notice-error" role="alert">{error}</div>}
		{loading ? <LoadingState label="Loading notifications..." /> : error && !items.length ? <ErrorState message={error} onRetry={load} /> : items.length ? <div className="request-list">{items.map(item => <article className="request-card" key={item.id}>
			<div className="request-card-top"><strong>{item.title || item.type || 'Notification'}</strong><span className={`status-tag ${item.read ? 'status-past' : 'status-pending'}`}>{item.read ? 'Read' : 'Unread'}</span></div>
			<p className="request-detail">{item.message}</p>
			{item.createdAt && <p className="request-detail">{new Date(item.createdAt).toLocaleString()}</p>}
		</article>)}</div> : <EmptyState title="No notifications yet." detail="When the backend creates account notifications, they will appear here." />}
		<div className="notice" role="note">The single-notification read endpoint does not verify record ownership. This page only exposes the user-scoped “Mark all read” action.</div>
	</section>;
}
