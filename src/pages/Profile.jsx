import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { ErrorState, LoadingState } from '../components/PageState';

export default function Profile() {
	const [user, setUser] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	async function load() {
		setLoading(true);
		setError('');
		try {
			const response = await api.get('/users/me');
			setUser(response.data);
		} catch (requestError) {
			setError(requestError.response?.data?.message || 'Unable to load your profile. Please try again.');
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => { load(); }, []);
	if (loading) return <LoadingState label="Loading profile..." />;
	if (error) return <ErrorState message={error} onRetry={load} />;
	if (!user) return <ErrorState message="Unable to load your profile. Please try again." onRetry={load} />;

	return <section className="page-content profile-page"><div className="page-heading"><div><span className="eyebrow">YOUR COMMUNITY ACCOUNT</span><h1>My Profile</h1><p>Personal details and community standing.</p></div></div><article className="profilecard"><div className="avatar">{user.name?.[0]?.toUpperCase() || '?'}</div><h2>{user.name || 'Community member'}</h2><p>{user.email || 'Email not provided'}</p>{user.college && <p>{user.college}</p>}{user.phone && <p>{user.phone}</p>}<div className="score">{user.trustScore == null ? '—' : Number(user.trustScore).toFixed(1)} / 5 trust score</div><span className="badge">{user.verified ? 'Verified community member' : 'Unverified'}</span></article></section>;
}
