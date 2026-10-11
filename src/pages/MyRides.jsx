import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { EmptyState, ErrorState, LoadingState } from '../components/PageState';

function asList(payload) {
  if (Array.isArray(payload)) return payload;
  for (const key of ['rides', 'content', 'data', 'results']) if (Array.isArray(payload?.[key])) return payload[key];
  return [];
}

function isMine(ride, user) {
  const ownerId = ride.driverId ?? ride.driver?.id ?? ride.driver?.userId;
  return user?.id != null && String(ownerId) === String(user.id);
}

function rideStatus(ride) {
  const status = String(ride.status || '').toUpperCase();
  if (status.includes('CANCEL')) return 'Cancelled';
  if (ride.departureTime && new Date(ride.departureTime).getTime() < Date.now()) return 'Past';
  return status || 'Upcoming';
}

function departure(value) {
  if (!value) return 'Departure time not provided';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function MyRides() {
  const { user } = useAuth();
  const location = useLocation();
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(location.state?.notice || '');
  const [workingId, setWorkingId] = useState(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/rides/mine');
      setRides(asList(response.data).filter(ride => isMine(ride, user)));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load rides. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [user]);

  async function cancelRide(ride) {
    if (!window.confirm(`Cancel the ride from ${ride.pickup} to ${ride.destination}?`)) return;
    setWorkingId(ride.id);
    setError('');
    setNotice('');
    try {
      await api.put(`/rides/${ride.id}/cancel`);
      setNotice('Ride cancelled.');
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to cancel this ride.');
    } finally {
      setWorkingId(null);
    }
  }

  return <section className="page-content">
    <div className="page-heading"><div><span className="eyebrow">YOUR TRAVEL HISTORY</span><h1>My Rides</h1><p>Review the trips you have offered to the community.</p></div></div>
    {notice && <div className="notice notice-success" role="status">{notice}</div>}
    {loading ? <LoadingState label="Loading rides..." /> : error ? <ErrorState message={error} onRetry={load} /> : rides.length === 0 ? <EmptyState title="You have not offered a ride yet." detail="Publish a trip and make room for someone travelling your way." /> : <div className="ride-list">{rides.map((ride, index) => <article className="ride-card" key={ride.id ?? index}>
      <div className="ride-card-main"><div className="route-line"><span>{ride.pickup || 'Pickup not provided'}</span><span className="route-arrow" aria-hidden="true">→</span><span>{ride.destination || 'Destination not provided'}</span></div><div className="ride-meta"><div><span className="meta-label">Departure</span><strong>{departure(ride.departureTime)}</strong></div><div><span className="meta-label">Seats</span><strong>{ride.seatsAvailable ?? '—'} available of {ride.seatsTotal ?? '—'}</strong></div><div><span className="meta-label">Price</span><strong>₹{ride.costPerPassenger ?? '—'} per passenger</strong></div></div></div>
      <div className="ride-card-aside"><span className={`status-tag status-${rideStatus(ride).toLowerCase()}`}>{rideStatus(ride)}</span>{String(ride.status || '').toUpperCase() === 'ACTIVE' && <button className="button button-danger" type="button" disabled={workingId === ride.id} onClick={() => cancelRide(ride)}>{workingId === ride.id ? 'Cancelling...' : 'Cancel ride'}</button>}</div>
    </article>)}</div>}
  </section>;
}