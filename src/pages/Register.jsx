import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getApiErrorMessage } from '../services/api';

export default function Register() {
	const { register } = useAuth();
	const nav = useNavigate();
	const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', college: '' });
	const [error, setError] = useState('');
	const [submitting, setSubmitting] = useState(false);

	const submit = async event => {
		event.preventDefault();
		if (submitting) return;

		setSubmitting(true);
		setError('');
		try {
			await register(form);
			nav('/');
		} catch (requestError) {
			setError(getApiErrorMessage(requestError, 'Registration failed'));
		} finally {
			setSubmitting(false);
		}
	};

	return <div className="auth"><div className="authcard"><h1>Create account</h1>{error && <div className="error">{error}</div>}<form onSubmit={submit}><input placeholder="Full name" required value={form.name} onChange={event => setForm({ ...form, name: event.target.value })}/><input type="email" placeholder="Email" required value={form.email} onChange={event => setForm({ ...form, email: event.target.value })}/><input type="password" placeholder="Password (6+ chars)" minLength="6" required value={form.password} onChange={event => setForm({ ...form, password: event.target.value })}/><input placeholder="Phone" value={form.phone} onChange={event => setForm({ ...form, phone: event.target.value })}/><input placeholder="College / Company" value={form.college} onChange={event => setForm({ ...form, college: event.target.value })}/><button type="submit" disabled={submitting}>{submitting ? 'Creating account...' : 'Create account'}</button></form><p>Already registered? <Link to="/login">Login</Link></p></div></div>;
}