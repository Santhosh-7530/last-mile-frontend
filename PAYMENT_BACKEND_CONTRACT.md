# Monthly Pass Payment Backend Contract

The frontend checkout is disabled until the separate Spring Boot backend implements and passes the verification contract below. Inspection of the current backend integration showed that order creation uses a locally generated UUID, payment verification does not validate a Razorpay signature, and the frontend/backend verification field names do not match. Do not re-enable the checkout or call `POST /api/passes` to activate a purchase until the backend changes are applied in STS and verified.

All endpoints require the existing bearer-token authentication. The authenticated user ID must come from the verified token, not from request data.

## Create Order

`POST /api/payments/create-order`

Request:

```json
{
  "planId": "monthly-30",
  "pickup": "Anurag University",
  "destination": "Kukatpally"
}
```

The server must look up the plan and authoritative price, validate the route and user, create the Razorpay order with the server-side key secret, and persist a pending order. Never trust a client-supplied amount.

Response expected by the frontend:

```json
{
  "orderId": "order_provider_id",
  "amount": 49900,
  "currency": "INR",
  "keyId": "rzp_test_public_id"
}
```

`amount` is the Razorpay amount in paise. `keyId` is the public key only; do not return the secret.

## Verify And Activate

`POST /api/payments/verify`

Request includes Razorpay Checkout's response fields plus the selected plan and route:

```json
{
  "razorpay_order_id": "order_provider_id",
  "razorpay_payment_id": "pay_provider_id",
  "razorpay_signature": "provider_signature",
  "planId": "monthly-30",
  "pickup": "Anurag University",
  "destination": "Kukatpally"
}
```

The server must verify the HMAC signature using the private Razorpay secret, confirm payment/order status, amount, currency, ownership, and pending state, then atomically mark the payment complete and activate the pass. Make verification idempotent and reject duplicate or mismatched orders. The frontend shows success only when the response includes `verified: true` and an activated pass.

Expected response:

```json
{
  "verified": true,
  "transactionId": "pay_provider_id",
  "payment": { "paymentId": "pay_provider_id" },
  "pass": {
    "id": 123,
    "name": "Monthly Ride Pass",
    "pickup": "Anurag University",
    "destination": "Kukatpally",
    "validFrom": "2026-10-05",
    "validUntil": "2026-11-04",
    "status": "ACTIVE"
  }
}
```

Return a non-2xx response when verification fails. Do not activate a pass on order creation, checkout dismissal, client-side callback alone, or a failed verification. `GET /api/passes` should return only the authenticated user's persisted passes so the Monthly Pass page and dashboard reflect server-verified activation.

## Current Backend Mismatch

The inspected backend's `PaymentController` currently reads `orderId` and `paymentId`, while Razorpay Checkout returns `razorpay_order_id`, `razorpay_payment_id`, and `razorpay_signature`. Its service does not verify the signature or create a provider order, and it does not persist/activate a `MonthlyPass` as part of verification. The payment routes are also marked public in Spring Security despite reading the authenticated user. These backend issues must be fixed before frontend checkout can safely be re-enabled.

## Persistence And Security

Use the existing pass entity if appropriate. Add a payment/order entity or equivalent persistence containing provider order ID (unique), provider payment ID (unique when present), authenticated user ID, plan/pass ID, amount in minor units, currency, status, created time, and completed time. Add database transactions and appropriate unique constraints for idempotency.

Do not persist card numbers, CVV, UPI PINs, bank passwords, or other payment credentials. Payment entry stays in Razorpay-hosted Checkout. Keep the Razorpay key secret exclusively in Spring Boot configuration or a secret store. Configure local frontend origin CORS as needed, and use a Razorpay webhook for reconciliation if desired; webhook handling does not replace signature verification in the purchase flow.