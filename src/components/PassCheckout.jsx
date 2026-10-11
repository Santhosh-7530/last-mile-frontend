import { useRef, useState } from 'react';
import { createPaymentOrder, loadRazorpayCheckout, verifyPayment } from '../services/payment';
import { useAuth } from '../context/AuthContext';

export default function PassCheckout({ pass, pickup, destination, onCancel, onSuccess, onOutcome }) {
  const { user } = useAuth();
  const [processing, setProcessing] = useState(false);
  const [gatewayOpen, setGatewayOpen] = useState(false);
  const processingRef = useRef(false);
  const finishedRef = useRef(false);

  function finishAsCancelled() {
    if (finishedRef.current) return;
    finishedRef.current = true;
    processingRef.current = false;
    onOutcome({ status: 'cancelled' });
  }

  function finishAsFailed(message) {
    if (finishedRef.current) return;
    finishedRef.current = true;
    processingRef.current = false;
    onOutcome({ status: 'failed', message });
  }

  async function proceed() {
    if (processingRef.current) return;
    processingRef.current = true;
    finishedRef.current = false;
    setProcessing(true);
    try {
      const purchase = { planId: pass.id, pickup: pickup.trim(), destination: destination.trim() };
      const order = await createPaymentOrder(purchase);
      const publicKey = order.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID;
      const orderId = order.orderId || order.id;
      if (!publicKey || !orderId || !Number.isFinite(Number(order.amount)) || Number(order.amount) <= 0) {
        throw new Error('The payment service returned an incomplete order. No pass has been activated.');
      }

      await loadRazorpayCheckout();
      const checkout = new window.Razorpay({
        key: publicKey,
        amount: Number(order.amount),
        currency: order.currency || 'INR',
        order_id: orderId,
        name: 'Last Mile',
        description: `${pass.name} · ${pass.durationDays} days`,
        prefill: { name: user?.name || '', email: user?.email || '' },
        theme: { color: '#17654e' },
        modal: { ondismiss: finishAsCancelled },
        handler: async paymentResponse => {
          if (finishedRef.current) return;
          finishedRef.current = true;
          setGatewayOpen(false);
          setProcessing(true);
          try {
            const verification = await verifyPayment(paymentResponse, purchase);
            const activatedPass = verification.pass || verification.activatedPass;
            if (verification.verified !== true || !activatedPass) {
              throw new Error('Payment could not be verified. Your pass has not been activated.');
            }
            finishedRef.current = true;
            processingRef.current = false;
            onSuccess(verification);
          } catch (verificationError) {
            processingRef.current = false;
            onOutcome({ status: 'failed', message: verificationError.response?.data?.message || verificationError.message || 'Payment verification failed. Your pass has not been activated.' });
          }
        }
      });

      checkout.on('payment.failed', response => {
        const message = response.error?.description || 'Your payment could not be completed.';
        finishAsFailed(message);
      });
      setProcessing(false);
      setGatewayOpen(true);
      checkout.open();
    } catch (paymentError) {
      finishAsFailed(paymentError.response?.data?.message || paymentError.message || 'Unable to start secure checkout. No pass has been activated.');
    }
  }

  return <div className="checkout-backdrop">
    <section className="checkout-dialog" role="dialog" aria-modal="true" aria-labelledby="checkout-title">
      <div className="checkout-dialog-heading"><div><span className="eyebrow">SECURE CHECKOUT</span><h2 id="checkout-title">Review your pass</h2></div><button className="checkout-close" type="button" onClick={onCancel} disabled={processing || gatewayOpen} aria-label="Close checkout">×</button></div>
      <div className="checkout-summary">
        <div className="checkout-plan"><strong>{pass.name}</strong><span>{pass.durationDays} days · Valid from activation</span></div>
        <div className="checkout-route"><span>{pickup}</span><span className="route-arrow">→</span><span>{destination}</span></div>
        <div className="checkout-benefits">{pass.benefits.map(benefit => <span key={benefit}><b aria-hidden="true">✓</b>{benefit}</span>)}</div>
        <div className="checkout-total"><span>Total amount</span><strong>₹{pass.price}</strong></div>
      </div>
      <div className="payment-methods"><span>Payment methods in secure checkout</span><div><span>UPI</span><span>Credit card</span><span>Debit card</span><span>Net banking</span></div></div>
      {processing && <div className="checkout-progress" role="status"><span className="spinner" />Processing payment...</div>}
      {gatewayOpen && <div className="checkout-progress" role="status"><span className="spinner" />Complete payment in the secure Razorpay window. Pass activation waits for server verification.</div>}
      <div className="checkout-actions"><button className="button button-secondary" type="button" onClick={onCancel} disabled={processing || gatewayOpen}>Cancel</button><button className="button button-primary" type="button" onClick={proceed} disabled={processing || gatewayOpen}>{processing ? 'Processing payment...' : gatewayOpen ? 'Waiting for payment...' : 'Proceed to Payment'}</button></div>
      <p className="checkout-security">Card details and UPI PIN are entered only in Razorpay Checkout. Last Mile does not collect or store them.</p>
    </section>
  </div>;
}