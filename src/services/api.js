import axios from 'axios';

function resolveConfiguredApiUrl() {
	const configuredApiUrl = (import.meta.env.VITE_API_URL || '').trim();
	if (configuredApiUrl) return configuredApiUrl.replace(/\/+$/, '');

	const hostname = window.location.hostname || 'localhost';
	const isLocalhost = ['localhost', '127.0.0.1', '::1'].includes(hostname);
	const backendHost = isLocalhost ? 'localhost' : hostname;
	return `http://${backendHost}:8080`;
}

export function normalizeApiBaseUrl(rawUrl = resolveConfiguredApiUrl()) {
	const normalizedUrl = rawUrl.replace(/\/+$/, '');
	return normalizedUrl.endsWith('/api') ? normalizedUrl : `${normalizedUrl}/api`;
}

export function getApiErrorMessage(error, fallback) {
	if (!error) return fallback;

	const payload = error.response?.data;
	if (typeof payload === 'string' && payload.trim()) return payload;
	if (payload?.message) return payload.message;
	if (payload?.error) return payload.error;
	if (Array.isArray(payload?.errors) && payload.errors.length) {
		const firstError = payload.errors[0];
		if (typeof firstError === 'string') return firstError;
		if (firstError?.message) return firstError.message;
	}

	if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
		return 'Unable to reach the Last Mile backend. Verify that the backend is running and that VITE_API_URL points to the correct host and port.';
	}
	if (error.response?.status === 401) return 'Your session expired. Please log in again.';
	if (error.response?.status === 403) return 'You do not have permission to complete that request.';
	if (error.response?.status === 409) return 'This request conflicts with existing data. Please review the form and try again.';
	if (error.response?.status >= 500) return 'The server encountered an unexpected error. Please try again.';
	return error.message || fallback;
}

const apiBaseUrl = normalizeApiBaseUrl();

export const api = axios.create({ baseURL: apiBaseUrl });

api.interceptors.request.use(config => {
	const token = localStorage.getItem('lastmile_token');
	if (token) {
		config.headers = {
			...config.headers,
			Authorization: `Bearer ${token}`
		};
	}
	return config;
});

api.interceptors.response.use(
	response => response,
	error => {
		if (error.response?.status === 401) {
			localStorage.removeItem('lastmile_token');
			localStorage.removeItem('lastmile_user');
			if (location.pathname !== '/login') location.assign('/login');
		}
		return Promise.reject(error);
	}
);