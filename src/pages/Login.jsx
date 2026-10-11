import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getApiErrorMessage } from '../services/api';

export default function Login() {
	const { login } = useAuth();
	const nav = useNavigate();
	const [form, setForm] = useState({ email: '', password: '' });
	const [error, setError] = useState('');
	const [submitting, setSubmitting] = useState(false);

	const submit = async event => {
		event.preventDefault();
		if (submitting) return;

		setSubmitting(true);
		setError('');
		try {
			await login(form);
			nav('/');
		} catch (requestError) {
			setError(getApiErrorMessage(requestError, 'Login failed'));
		} finally {
			setSubmitting(false);
		}
	};

	return <div className="auth"><div className="authcard"><h1>Last Mile</h1><p>Find or share a ride with your community.</p>{error && <div className="error">{error}</div>}<form onSubmit={submit}><input type="email" placeholder="Email" required value={form.email} onChange={event => setForm({ ...form, email: event.target.value })}/><input type="password" placeholder="Password" required value={form.password} onChange={event => setForm({ ...form, password: event.target.value })}/><button type="submit" disabled={submitting}>{submitting ? 'Logging in...' : 'Login'}</button></form><p>New here? <Link to="/register">Create account</Link></p></div></div>;
}