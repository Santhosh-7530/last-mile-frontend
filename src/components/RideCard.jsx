import { Link } from 'react-router-dom';

function formatDeparture(value) {
  if (!value) return 'Departure time not provided';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString(undefined, {
    day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit'
  });
}

export default function RideCard({ ride, user, onRequest, requesting }) {
  const driver = ride.driver || {};
  const driverId = ride.driverId ?? driver.id ?? driver.userId;
  const isOwnRide = user?.id != null && String(driverId) === String(user.id);
  const seatsAvailable = ride.seatsAvailable ?? ride.availableSeats;
  const seatsTotal = ride.seatsTotal ?? ride.totalSeats;

  return <article className="ride-card">
    <div className="ride-card-main">
      <div className="route-line"><span>{ride.pickup || 'Pickup not provided'}</span><span className="route-arrow" aria-hidden="true">→</span><span>{ride.destination || 'Destination not provided'}</span></div>
      <div className="ride-meta">
        <div><span className="meta-label">Departure</span><strong>{formatDeparture(ride.departureTime || ride.dateTime)}</strong></div>
        <div><span className="meta-label">Driver</span><strong>{driver.name || ride.driverName || 'Community driver'}</strong></div>
        <div><span className="meta-label">Available seats</span><strong>{seatsAvailable ?? '—'}{seatsTotal != null ? ` of ${seatsTotal}` : ''}</strong></div>
      </div>
    </div>
    <div className="ride-card-aside">
      <div className="ride-price"><strong>₹{ride.costPerPassenger ?? ride.pricePerPassenger ?? '—'}</strong><span>per passenger</span></div>
      {driver.trustScore != null && <span className="trust-score">★ {Number(driver.trustScore).toFixed(1)} trust score</span>}
      {ride.recurring && <span className="recurring-tag">Recurring ride</span>}
      <Link className="button button-secondary" to={`/rides/${ride.id}`} state={{ ride }}>Ride details</Link>
      <button className="button button-primary" type="button" onClick={() => onRequest(ride.id)} disabled={!ride.id || isOwnRide || seatsAvailable === 0 || requesting}>
        {requesting ? 'Sending...' : isOwnRide ? 'Your ride' : seatsAvailable === 0 ? 'No seats left' : 'Request ride'}
      </button>
    </div>
  </article>;
}