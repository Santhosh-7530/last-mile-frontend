import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { ErrorState, LoadingState } from '../components/PageState';

function formatDate(value) {
	if (!value) return 'Pending backend confirmation';
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatCurrency(value) {
	if (value === null || value === undefined || value === '') return '—';
	const numericValue = Number(value);
	if (!Number.isFinite(numericValue)) return value;
	return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(numericValue);
}

function formatStatus(value) {
	if (!value) return 'Not provided';
	return String(value).replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
}

function getPassName(pass) {
	return pass?.name || pass?.type || pass?.planName || 'Monthly Ride Pass';
}

function getPassStartValue(pass) {
	return pass?.startDate || pass?.validFrom || pass?.purchaseDate || pass?.createdAt || null;
}

function getPassEndValue(pass) {
	return pass?.endDate || pass?.validUntil || pass?.expiryDate || null;
}

function getRemainingCredits(pass) {
	const rideCredits = Number(pass?.rideCredits ?? 0);
	const ridesUsed = Number(pass?.ridesUsed ?? 0);
	return Math.max(rideCredits - ridesUsed, 0);
}

function getStatusClass(status) {
	const normalizedStatus = String(status || '').toUpperCase();
	if (normalizedStatus === 'ACTIVE') return 'status-accepted';
	if (normalizedStatus === 'EXPIRED') return 'status-past';
	if (normalizedStatus === 'CANCELLED') return 'status-cancelled';
	if (normalizedStatus === 'PENDING') return 'status-pending';
	return 'status-tag';
}

export default function Passes() {
	const [passes, setPasses] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const inFlightRef = useRef(false);

	async function load() {
		if (inFlightRef.current) return;
		inFlightRef.current = true;
		setLoading(true);
		setError('');
		try {
			const response = await api.get('/passes');
			setPasses(Array.isArray(response.data) ? response.data : response.data?.content || []);
		} catch (requestError) {
			setError(requestError.response?.data?.message || requestError.message || 'Unable to load passes. Please try again.');
		} finally {
			inFlightRef.current = false;
			setLoading(false);
		}
	}

	useEffect(() => { load(); }, []);

	const activePass = passes.find(pass => (pass?.status || '').toString().toUpperCase() !== 'EXPIRED' && (pass?.status || '').toString().toUpperCase() !== 'CANCELLED') || passes[0];
	const routeCoverage = activePass ? [activePass.pickup, activePass.destination].filter(Boolean).join(' → ') || 'Route coverage not available yet' : 'No active route yet';
	const remainingCredits = activePass ? getRemainingCredits(activePass) : 0;

	return <section className="page-content pass-page"><div className="page-heading"><div><span className="eyebrow">REGULAR COMMUTER BENEFITS</span><h1>Monthly Pass</h1><p>Route-based credits for regular commuters.</p></div></div>
		<div className="notice notice-info" role="status"><div className="notice-icon" aria-hidden="true">i</div><div><strong>Payment availability:</strong> Secure Razorpay checkout is temporarily disabled until the backend creates provider orders and verifies Razorpay signatures before any pass is activated.</div></div>
		<div className="pass-hero">
			<div className="pass-hero-card">
				<span className="eyebrow">COMMUTER PLAN</span>
				<h2>{getPassName(activePass)}</h2>
				<p>Use verified monthly credits on your regular route and keep your routine rides predictable.</p>
				<div className="pass-badges">
					<span className="chip">Route-based credits</span>
					<span className="chip">Flexible validity</span>
					<span className="chip">Account-linked usage</span>
				</div>
				<div className="pass-hero-metrics">
					<div className="pass-metric"><span>Coverage</span><strong>{routeCoverage}</strong></div>
					<div className="pass-metric"><span>Credits left</span><strong>{remainingCredits}</strong></div>
					<div className="pass-metric"><span>Valid until</span><strong>{activePass ? formatDate(getPassEndValue(activePass)) : 'Not assigned yet'}</strong></div>
				</div>
			</div>
			<aside className="pass-summary-card">
				<span className="eyebrow">CHECKOUT STATUS</span>
				<h3>Purchase unavailable</h3>
				<p>The current backend cannot create a provider order or verify Razorpay signatures, so this frontend keeps purchases disabled until the server-side verification path exists.</p>
			</aside>
		</div>
		<div className="section-title"><div><h2>Your passes</h2><p>Pass records returned by your account API</p></div></div>
		{loading ? <LoadingState label="Loading passes..." /> : error && passes.length === 0 ? <ErrorState message={error} onRetry={load} /> : passes.length ? <div className="ride-list">{passes.map((pass, index) => {
			const remaining = getRemainingCredits(pass);
			const totalCredits = Number(pass?.rideCredits ?? (remaining || 0));
			const usedCredits = Number(pass?.ridesUsed ?? 0);
			const usagePercent = totalCredits > 0 ? Math.min((usedCredits / totalCredits) * 100, 100) : 0;
			return <article className="ride-card pass-card" key={pass.id ?? index}><div className="ride-card-main"><div className="pass-card-header"><div><span className="eyebrow small">PASS</span><h3>{getPassName(pass)}</h3></div><span className={getStatusClass(pass.status)}>{formatStatus(pass.status)}</span></div><div className="route-line"><span>{pass.pickup || 'Pickup'}</span><span className="route-arrow">→</span><span>{pass.destination || 'Destination'}</span></div><div className="ride-meta pass-meta"><div><span className="meta-label">Purchase date</span><strong>{formatDate(getPassStartValue(pass))}</strong></div><div><span className="meta-label">Expiry date</span><strong>{formatDate(getPassEndValue(pass))}</strong></div><div><span className="meta-label">Remaining credits</span><strong>{remaining}</strong></div><div><span className="meta-label">Usage</span><strong>{usedCredits} / {totalCredits} credits used</strong></div></div><div className="pass-usage"><div className="pass-usage-row"><span>{usedCredits} used</span><span>{remaining} left</span></div><div className="pass-progress" aria-label={`Usage progress: ${Math.round(usagePercent)} percent`}><span style={{ width: `${usagePercent}%` }} /></div></div></div><div className="ride-card-aside"><div className="ride-price"><strong>{formatCurrency(pass.price)}</strong><span>{pass.price ? 'monthly plan' : 'route credit'}</span></div><small>{totalCredits ? `${totalCredits} credits included` : 'Route-based credit plan'}</small></div></article>;
		})}</div> : <div className="state-panel state-empty" role="status"><span className="state-mark">＋</span><h3>No pass records yet.</h3><p>Your account does not currently have a saved monthly pass. Once a verified pass is created and activated by the backend, it will appear here with its route, credit balance, and validity details.</p><div className="state-actions"><button className="button button-secondary" type="button" onClick={load} disabled={loading}>Refresh</button><Link className="button button-primary" to="/">Back to dashboard</Link></div></div>}
		{error && passes.length > 0 && <div className="notice notice-error" role="alert"><strong>Unable to refresh your pass list.</strong> {error}</div>}
	</section>;
}
