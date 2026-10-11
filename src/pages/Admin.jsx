import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ErrorState, LoadingState } from '../components/PageState';

export default function Admin() {
	const { user } = useAuth();
	const [dashboard, setDashboard] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	async function load() {
		setLoading(true);
		setError('');
		try {
			const dashboardResponse = await api.get('/admin/dashboard');
			setDashboard(dashboardResponse.data);
		} catch (requestError) {
			setError(requestError.response?.data?.message || 'Unable to load the admin console. Please try again.');
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		if (user?.role === 'ADMIN') load();
		else setLoading(false);
	}, [user]);

	return <section className="page-content"><div className="page-heading"><div><span className="eyebrow">COMMUNITY OPERATIONS</span><h1>Admin Console</h1><p>Manage community access and safety reports.</p></div></div>
		{user?.role !== 'ADMIN' ? <div className="notice notice-error" role="alert">Administrator access is required to view this page.</div> : loading ? <LoadingState label="Loading admin data..." /> : error ? <ErrorState message={error} onRetry={load} /> : <>
			{dashboard && <div className="stats-grid">{Object.entries(dashboard).map(([label, value]) => <div className="stat-card" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>}
			<div className="notice notice-error" role="alert"><strong>User and report management is temporarily hidden.</strong> The current backend returns raw entities from these APIs, including user password properties. Do not request or render those records until the backend returns safe DTOs.</div>
		</>}
	</section>;
}
