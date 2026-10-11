import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export default function OfferRide() {
	const navigate = useNavigate();
	const [form, setForm] = useState({ pickup: '', destination: '', departureTime: '', seatsTotal: 1, costPerPassenger: 0 });
	const [error, setError] = useState('');
	const [saving, setSaving] = useState(false);
	const update = (key, value) => setForm(current => ({ ...current, [key]: value }));

	async function submit(event) {
		event.preventDefault();
		setError('');
		if (new Date(form.departureTime).getTime() <= Date.now()) return setError('Choose a departure time in the future.');
		setSaving(true);
		try {
			await api.post('/rides', { ...form, pickup: form.pickup.trim(), destination: form.destination.trim() });
			navigate('/my-rides', { state: { notice: 'Your ride was published successfully.' } });
		} catch (requestError) {
			setError(requestError.response?.data?.message || 'Unable to create ride. Please try again.');
		} finally {
			setSaving(false);
		}
	}

	return <section className="page-content form-page">
		<div className="page-heading"><div><span className="eyebrow">SHARE YOUR JOURNEY</span><h1>Offer a Ride</h1><p>Let nearby students know when you have a seat to share.</p></div></div>
		<form className="editor-panel" onSubmit={submit}>
			{error && <div className="notice notice-error" role="alert">{error}</div>}
			<div className="form-grid"><label>Pickup<input required maxLength="120" value={form.pickup} onChange={event => update('pickup', event.target.value)} placeholder="Starting location" /></label><label>Destination<input required maxLength="120" value={form.destination} onChange={event => update('destination', event.target.value)} placeholder="Where are you going?" /></label><label>Departure date and time<input type="datetime-local" required min={new Date().toISOString().slice(0, 16)} value={form.departureTime} onChange={event => update('departureTime', event.target.value)} /></label><label>Available seats<input type="number" required min="1" max="8" value={form.seatsTotal} onChange={event => update('seatsTotal', Number(event.target.value))} /></label><label>Cost per passenger (₹)<input type="number" required min="0" step="1" value={form.costPerPassenger} onChange={event => update('costPerPassenger', Number(event.target.value))} /></label></div>
			<p className="form-helper">This publishes one ride. To manage a repeating schedule, use <Link to="/recurring">Recurring rides</Link>.</p>
			<div className="form-actions"><button className="button button-primary" type="submit" disabled={saving}>{saving ? 'Publishing...' : 'Publish ride'}</button></div>
		</form>
	</section>;
}
