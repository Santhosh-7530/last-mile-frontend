import { useState } from 'react';
import { api } from '../services/api';

export default function SafetyCenter() {
	const [description, setDescription] = useState('');
	const [reportedUserId, setReportedUserId] = useState('');
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState('');
	const [notice, setNotice] = useState('');

	async function submit(event) {
		event.preventDefault();
		setSaving(true);
		setError('');
		setNotice('');
		try {
			await api.post('/safety/report', {
				description: description.trim(),
				...(reportedUserId.trim() ? { reportedUserId: Number(reportedUserId) } : {})
			});
			setDescription('');
			setReportedUserId('');
			setNotice('Your report was submitted to the safety team.');
		} catch (requestError) {
			setError(requestError.response?.data?.message || 'Unable to submit your report.');
		} finally {
			setSaving(false);
		}
	}

	return <section className="page-content form-page">
		<div className="page-heading"><div><span className="eyebrow">COMMUNITY CARE</span><h1>Safety Center</h1><p>Send a safety report to the Last Mile team.</p></div></div>
		{notice && <div className="notice notice-success" role="status">{notice}</div>}
		{error && <div className="notice notice-error" role="alert">{error}</div>}
		<form className="editor-panel" onSubmit={submit}>
			<label>What happened?<textarea required maxLength="2000" rows="6" value={description} onChange={event => setDescription(event.target.value)} placeholder="Describe the safety concern. Do not include passwords or payment details." /></label>
			<label>Reported user ID (optional)<input type="number" min="1" value={reportedUserId} onChange={event => setReportedUserId(event.target.value)} /></label>
			<div className="form-actions"><button className="button button-primary" type="submit" disabled={saving}>{saving ? 'Submitting...' : 'Submit report'}</button></div>
		</form>
		<div className="notice" role="note">The backend currently ignores ride IDs on reports and does not provide an endpoint for a reporter to view submitted reports. For urgent danger, contact local emergency services.</div>
	</section>;
}
