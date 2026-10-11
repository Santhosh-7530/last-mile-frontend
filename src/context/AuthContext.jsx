import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

function clearSession() {
	localStorage.removeItem('lastmile_token');
	localStorage.removeItem('lastmile_user');
}

export function AuthProvider({ children }) {
	const [user, setUser] = useState(() => {
		try {
			return JSON.parse(localStorage.getItem('lastmile_user') || 'null');
		} catch {
			localStorage.removeItem('lastmile_user');
			return null;
		}
	});
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let active = true;
		if (!localStorage.getItem('lastmile_token')) {
			setLoading(false);
			return () => { active = false; };
		}

		api.get('/users/me')
			.then(response => {
				if (!active) return;
				setUser(response.data);
				localStorage.setItem('lastmile_user', JSON.stringify(response.data));
			})
			.catch(() => {
				if (!active) return;
				clearSession();
				setUser(null);
			})
			.finally(() => {
				if (active) setLoading(false);
			});

		return () => { active = false; };
	}, []);

	async function authenticate(path, data) {
		const response = await api.post(path, data);
		localStorage.setItem('lastmile_token', response.data.token);
		try {
			const profile = await api.get('/users/me');
			setUser(profile.data);
			localStorage.setItem('lastmile_user', JSON.stringify(profile.data));
		} catch (error) {
			clearSession();
			setUser(null);
			throw error;
		}
	}

	const login = data => authenticate('/auth/login', data);
	const register = data => authenticate('/auth/register', data);
	const logout = () => {
		clearSession();
		setUser(null);
		location.assign('/login');
	};

	return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>;
}
