import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { EmptyState, ErrorState, LoadingState } from '../components/PageState';

const initialForm = {
	pickup: '', destination: '', departureTime: '', startDate: '',
	endDate: '', recurrenceType: 'WEEKLY', selectedDays: [],
	seatsTotal: 1, price: 0
};
const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

function asList(payload) {
	if (Array.isArray(payload)) return payload;
	return payload?.content || payload?.recurringRides || [];
}

export default function RecurringRides() {
	const [rides, setRides] = useState([]);
	const [form, setForm] = useState(initialForm);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [workingId, setWorkingId] = useState(null);
	const [error, setError] = useState('');
	const [notice, setNotice] = useState(null);

	async function load() {
		setLoading(true);
		setError('');
		try {
			const response = await api.get('/recurring');
			setRides(asList(response.data));
		} catch (requestError) {
			setError(requestError.response?.data?.message || 'Unable to load recurring rides.');
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => { load(); }, []);

	function update(key, value) {
		setForm(current => ({ ...current, [key]: value }));
	}

	function toggleDay(day) {
		update('selectedDays', form.selectedDays.includes(day)
			? form.selectedDays.filter(item => item !== day)
			: [...form.selectedDays, day]);
	}

	async function create(event) {
		event.preventDefault();
		setError('');
		setNotice(null);
		if (form.recurrenceType === 'WEEKLY' && form.selectedDays.length === 0) {
			setError('Choose at least one day for a weekly schedule.');
			return;
		}
		if (form.endDate && form.endDate < form.startDate) {
			setError('The last date must be on or after the first date.');
			return;
		}
		setSaving(true);
		try {
			await api.post('/recurring', {
				...form,
				departureTime: form.departureTime || null,
				startDate: form.startDate || null,
				endDate: form.endDate || null
			});
			setForm(initialForm);
			setNotice('Recurring ride saved.');
			await load();
		} catch (requestError) {
			setError(requestError.response?.data?.message || 'Unable to save this recurring ride.');
		} finally {
			setSaving(false);
		}
	}

	async function changeStatus(ride) {
		setWorkingId(ride.id);
		setNotice(null);
		try {
			await api.put(`/recurring/${ride.id}/${ride.active ? 'pause' : 'resume'}`);
			setNotice(ride.active ? 'Recurring ride paused.' : 'Recurring ride resumed.');
			await load();
		} catch (requestError) {
			setError(requestError.response?.data?.message || 'Unable to update this recurring ride.');
		} finally {
			setWorkingId(null);
		}
	}

	async function remove(ride) {
		if (!window.confirm('Delete this recurring ride?')) return;
		setWorkingId(ride.id);
		setNotice(null);
		try {
			await api.delete(`/recurring/${ride.id}`);
			setNotice('Recurring ride deleted.');
			await load();
		} catch (requestError) {
			setError(requestError.response?.data?.message || 'Unable to delete this recurring ride.');
		} finally {
			setWorkingId(null);
		}
	}

	return <section className="page-content">
		<div className="page-heading"><div><span className="eyebrow">REPEAT YOUR ROUTINE</span><h1>Recurring rides</h1><p>Manage your saved repeating ride schedules.</p></div></div>
		{notice && <div className="notice notice-success" role="status">{notice}</div>}
		{error && <div className="notice notice-error" role="alert">{error}</div>}
		<form className="editor-panel" onSubmit={create}>
			<h2>Create a schedule</h2>
			<div className="form-grid">
				<label>Pickup<input required maxLength="120" value={form.pickup} onChange={event => update('pickup', event.target.value)} /></label>
				<label>Destination<input required maxLength="120" value={form.destination} onChange={event => update('destination', event.target.value)} /></label>
				<label>Departure time<input type="datetime-local" required value={form.departureTime} onChange={event => update('departureTime', event.target.value)} /></label>
				<label>First date<input type="date" required value={form.startDate} onChange={event => update('startDate', event.target.value)} /></label>
				<label>Last date (optional)<input type="date" value={form.endDate} onChange={event => update('endDate', event.target.value)} /></label>
				<label>Seats<input type="number" min="1" max="8" required value={form.seatsTotal} onChange={event => update('seatsTotal', Number(event.target.value))} /></label>
				<label>Price per passenger (₹)<input type="number" min="0" step="1" required value={form.price} onChange={event => update('price', Number(event.target.value))} /></label>
			</div>
			<label>Repeat<select value={form.recurrenceType} onChange={event => update('recurrenceType', event.target.value)}><option value="WEEKLY">Weekly</option><option value="DAILY">Daily</option></select></label>
			<fieldset className="weekday-picker"><legend>Days of the week</legend>{days.map(day => <label key={day}><input type="checkbox" checked={form.selectedDays.includes(day)} onChange={() => toggleDay(day)} />{day.slice(0, 3)}</label>)}</fieldset>
			<div className="form-actions"><button className="button button-primary" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save recurring ride'}</button></div>
		</form>
		<div className="section-title"><div><h2>Your schedules</h2><p>Loaded from the recurring-rides API</p></div></div>
		{loading ? <LoadingState label="Loading recurring rides..." /> : error && !rides.length ? <ErrorState message={error} onRetry={load} /> : rides.length ? <div className="ride-list">{rides.map(ride => <article className="ride-card" key={ride.id}>
			<div className="ride-card-main"><div className="route-line"><span>{ride.pickup}</span><span className="route-arrow">→</span><span>{ride.destination}</span></div>
				<div className="ride-meta"><div><span className="meta-label">Schedule</span><strong>{ride.recurrenceType || 'WEEKLY'} · {(ride.selectedDays || []).join(', ') || 'Days not specified'}</strong></div><div><span className="meta-label">Seats / price</span><strong>{ride.seatsAvailable ?? ride.seatsTotal} seats · ₹{ride.price ?? '—'} per passenger</strong></div><div><span className="meta-label">Active</span><strong>{ride.active ? 'Yes' : 'Paused'}</strong></div></div>
			</div>
			<div className="ride-card-aside"><button className="button button-secondary" type="button" disabled={workingId === ride.id} onClick={() => changeStatus(ride)}>{ride.active ? 'Pause' : 'Resume'}</button><button className="button button-danger" type="button" disabled={workingId === ride.id} onClick={() => remove(ride)}>Delete</button></div>
		</article>)}</div> : <EmptyState title="No recurring schedules yet." detail="Create a schedule above. This backend saves recurring templates; automatic ride generation is not available." />}
	</section>;
}
