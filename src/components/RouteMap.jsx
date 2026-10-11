import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const DEFAULT_VIEW = [20, 0];
const GEOCODE_URL = 'https://nominatim.openstreetmap.org/search';
const ROUTE_URL = 'https://router.project-osrm.org/route/v1/driving';
const geocodeCache = new Map();
let lastGeocodeAt = 0;

function createMarkerIcon(color) {
	return L.divIcon({
		className: 'lastmile-map-marker',
		html: `<span style="background:${color}; border-color:${color};"></span>`,
		iconSize: [22, 22],
		iconAnchor: [11, 11]
	});
}

const pickupMarkerIcon = createMarkerIcon('#17654e');
const destinationMarkerIcon = createMarkerIcon('#b54c37');
const currentLocationMarkerIcon = createMarkerIcon('#2563eb');

function wait(milliseconds) {
	return new Promise(resolve => window.setTimeout(resolve, milliseconds));
}

async function geocode(location) {
	const cacheKey = location.trim().toLocaleLowerCase();
	if (geocodeCache.has(cacheKey)) return geocodeCache.get(cacheKey);

	const delay = Math.max(0, 1100 - (Date.now() - lastGeocodeAt));
	if (delay) await wait(delay);
	lastGeocodeAt = Date.now();

	const response = await fetch(`${GEOCODE_URL}?format=jsonv2&limit=1&q=${encodeURIComponent(location)}`);
	if (!response.ok) throw new Error('The location search service is temporarily unavailable.');
	const results = await response.json();
	if (!results.length) throw new Error(`Could not find "${location}". Try a nearby landmark or include the city.`);

	const point = [Number(results[0].lat), Number(results[0].lon)];
	geocodeCache.set(cacheKey, point);
	return point;
}

function FitRoute({ points, userLocation }) {
	const map = useMap();
	useEffect(() => {
		if (userLocation) {
			map.flyTo(userLocation, 14, { duration: 0.7 });
			return;
		}
		if (points.length === 2) map.fitBounds(points, { padding: [36, 36] });
		else if (points.length === 1) map.setView(points[0], 12);
		else map.setView(DEFAULT_VIEW, 2);
	}, [map, points, userLocation]);
	return null;
}

export default function RouteMap({ pickup, destination, ride }) {
	const [points, setPoints] = useState(null);
	const [route, setRoute] = useState(null);
	const [routeSummary, setRouteSummary] = useState(null);
	const [state, setState] = useState('idle');
	const [error, setError] = useState('');
	const [tilesFailed, setTilesFailed] = useState(false);
	const [userLocation, setUserLocation] = useState(null);
	const [locationLoading, setLocationLoading] = useState(false);
	const [locationError, setLocationError] = useState('');
	const [locationStatus, setLocationStatus] = useState('');
	const mapRef = useRef(null);

	const coords = useMemo(() => {
		const from = ride?.pickupLatitude != null && ride?.pickupLongitude != null ? [Number(ride.pickupLatitude), Number(ride.pickupLongitude)] : null;
		const to = ride?.destinationLatitude != null && ride?.destinationLongitude != null ? [Number(ride.destinationLatitude), Number(ride.destinationLongitude)] : null;
		return from && to ? [from, to] : null;
	}, [ride]);

	useEffect(() => {
		let active = true;
		setError('');
		setRoute(null);
		setRouteSummary(null);
		setPoints(coords);
		if (coords) {
			setState('ready');
			return () => { active = false; };
		}
		if (!pickup?.trim() || !destination?.trim()) {
			setState('idle');
			return () => { active = false; };
		}

		setState('loading');
		(async () => {
			try {
				const from = await geocode(pickup);
				const to = await geocode(destination);
				if (active) {
					setPoints([from, to]);
					setState('ready');
				}

				const routeResponse = await fetch(
					`${ROUTE_URL}/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`
				);
				if (!routeResponse.ok) throw new Error('The route service is temporarily unavailable.');
				const routeData = await routeResponse.json();
				if (routeData.code !== 'Ok' || !routeData.routes?.length) {
					throw new Error('No driving route was found. The pickup and destination markers are still shown.');
				}
				if (active) {
					setRoute(routeData.routes[0].geometry.coordinates.map(([longitude, latitude]) => [latitude, longitude]));
					setRouteSummary({
						distance: `${(routeData.routes[0].distance / 1000).toFixed(1)} km`,
						duration: `${Math.round(routeData.routes[0].duration / 60)} min`
					});
				}
			} catch (routeError) {
				if (active) {
					setError(routeError.message || 'Unable to show a route right now.');
					setState(current => current === 'loading' ? 'unavailable' : current);
				}
			}
		})();
		return () => { active = false; };
	}, [coords, pickup, destination]);

	const mapFeedback = locationLoading
		? 'Finding your current location…'
		: locationError
			? locationError
			: error
				? error
				: route
					? 'Driving route shown. Route data is supplied by the public OSRM demo service.'
					: coords
						? 'Ride pickup and destination coordinates shown.'
						: points?.length
							? 'Pickup and destination markers shown.'
							: 'Search a pickup and destination to preview the route.';

	const handleUseCurrentLocation = () => {
		if (!navigator.geolocation) {
			setLocationError('Geolocation is unavailable in this browser. Choose a pickup and destination manually instead.');
			setLocationStatus('');
			setLocationLoading(false);
			return;
		}
		if (!window.isSecureContext) {
			setLocationError('Location access is blocked on this insecure origin. Use HTTPS or a trusted local development setup and then try again.');
			setLocationStatus('');
			setLocationLoading(false);
			return;
		}

		setLocationLoading(true);
		setLocationError('');
		setLocationStatus('');
		navigator.geolocation.getCurrentPosition(
			position => {
				const nextLocation = [position.coords.latitude, position.coords.longitude];
				setUserLocation(current => {
					if (current && Math.abs(current[0] - nextLocation[0]) < 0.00001 && Math.abs(current[1] - nextLocation[1]) < 0.00001) {
						return current;
					}
					return nextLocation;
				});
				setLocationStatus(`Current location detected at ${nextLocation[0].toFixed(4)}, ${nextLocation[1].toFixed(4)}.`);
				setLocationLoading(false);
				if (mapRef.current) mapRef.current.flyTo(nextLocation, 14, { duration: 0.7 });
			},
			geoError => {
				setLocationLoading(false);
				const code = geoError.code || 0;
				const messages = {
					1: 'Location access was denied. You can still enter a pickup and destination manually.',
					2: 'The location service is unavailable right now. Please try again or choose a pickup point manually.',
					3: 'Location detection timed out. Please try again or set a pickup and destination manually.',
					0: 'We could not determine your location. Choose a pickup and destination manually.'
				};
				setLocationError(messages[code] || messages[0]);
				setLocationStatus('');
			},
			{ enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
		);
	};

	const markerPoints = points || [];
	const locationSummary = locationStatus || 'Choose a pickup and destination, or use your current location.';

	return <section className="route-map-panel" aria-label="Route map">
		<div className="route-map-heading">
			<div><span className="eyebrow">ROUTE PREVIEW</span><h2>Map</h2></div>
			<div className="route-map-controls">
				{routeSummary && <div className="route-summary"><span>{routeSummary.distance}</span><span>{routeSummary.duration}</span></div>}
				<button type="button" className="button button-secondary use-location-button" onClick={handleUseCurrentLocation} disabled={locationLoading} aria-label="Use my current location">
					{locationLoading ? <span className="spinner map-button-spinner" aria-hidden="true" /> : '??'}
					<span>Use My Current Location</span>
				</button>
			</div>
		</div>
		<div className="route-map-canvas" aria-label="Interactive OpenStreetMap showing the pickup and destination">
			<MapContainer center={DEFAULT_VIEW} zoom={2} scrollWheelZoom className="route-leaflet-map" whenReady={({ target }) => { mapRef.current = target; }}>
				<TileLayer
					attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
					url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
					eventHandlers={{
						tileerror: () => setTilesFailed(true),
						load: () => setTilesFailed(false)
					}}
				/>
				<FitRoute points={markerPoints} userLocation={userLocation} />
				{userLocation && <Marker position={userLocation} icon={currentLocationMarkerIcon}><Tooltip permanent>Current location</Tooltip></Marker>}
				{markerPoints.map((position, index) => (
					<Marker key={`${index}-${position.join(',')}`} position={position} icon={index === 0 ? pickupMarkerIcon : destinationMarkerIcon}>
						<Tooltip permanent>{index === 0 ? 'Pickup' : 'Destination'}</Tooltip>
					</Marker>
				))}
				{route && <Polyline positions={route} pathOptions={{ color: '#17654e', weight: 5, opacity: 0.85 }} />}
			</MapContainer>
		</div>
		<div className={`map-feedback${error || locationError ? ' map-feedback-error' : ''}`} role={error || locationError ? 'alert' : 'status'}>{mapFeedback}</div>
		<div className="map-location-status" aria-live="polite">{locationSummary}</div>
		{tilesFailed && <div className="notice notice-error" role="alert">Map tiles could not be loaded. Check your connection or the public map-tile service; route lookup may still work.</div>}
		{!coords && pickup?.trim() && destination?.trim() && <p className="map-attribution-note">Location lookup and route previews use public OpenStreetMap and OSRM services. Avoid entering private or sensitive addresses.</p>}
	</section>;
}