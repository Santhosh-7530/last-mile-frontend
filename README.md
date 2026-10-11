# Last Mile Frontend
React + Vite frontend for the Last Mile community ride-sharing platform.

## Run in VS Code
1. Install Node.js 20+.
2. Open this folder in VS Code.
3. Open terminal and run `npm install`.
4. Copy `.env.example` to `.env` if the backend is not at `http://localhost:8080`. `VITE_API_URL` accepts either the backend origin or a URL ending in `/api`; the frontend centralizes the `/api` prefix.
5. Run `npm run dev`.
6. Open http://localhost:5173.

The backend must be running on port 8080.

## Maps
Find Ride uses React Leaflet with OpenStreetMap tiles, so a browser API key is not needed. After submitting pickup and destination filters, the map looks up those locations using the public Nominatim service and requests a driving route from the public OSRM demo service. Those services are third-party, availability/rate limits are outside this project's control, and submitted location text is sent to them. Do not enter sensitive addresses. For production traffic, use a geocoding/routing provider or self-hosted services with an explicit service policy and backend proxy/caching as appropriate.

Ride details are currently read from the active rides list because the backend does not expose `GET /api/rides/{id}`. The recurring-rides page uses the backend's saved recurring schedule endpoints; the backend does not generate ride occurrences. Safety reports can be submitted, but there is no API to list a user's own reports.

The current backend serializes raw entities for ride, request, pass, notification, safety-report, and admin user APIs. Related users expose a password property in those JSON responses. The frontend admin user/report lists are therefore hidden; the backend should add safe response DTOs and omit password fields before these endpoints are used with populated records. This is a backend security issue that cannot be corrected in the frontend alone.

## Monthly Pass Payments
Pass purchasing is intentionally disabled in the frontend. The current backend does not create Razorpay provider orders or verify payment signatures before reporting a payment as verified. See [PAYMENT_BACKEND_CONTRACT.md](PAYMENT_BACKEND_CONTRACT.md) for the required server-side contract before enabling checkout.

Never put payment secrets or card/UPI credentials in frontend environment variables. Vite `VITE_*` variables are exposed to the browser.
