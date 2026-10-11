import { api } from './api';

let checkoutScriptPromise;

export async function createPaymentOrder(purchase) {
  const response = await api.post('/payments/create-order', purchase);
  return response.data;
}

export async function verifyPayment(payment, purchase) {
  const response = await api.post('/payments/verify', { ...payment, ...purchase });
  return response.data;
}

export function loadRazorpayCheckout() {
  if (window.Razorpay) return Promise.resolve();
  if (checkoutScriptPromise) return checkoutScriptPromise;

  checkoutScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => {
      if (window.Razorpay) resolve();
      else {
        checkoutScriptPromise = null;
        reject(new Error('Secure checkout could not initialize.'));
      }
    };
    script.onerror = () => {
      checkoutScriptPromise = null;
      reject(new Error('Secure checkout could not be loaded.'));
    };
    document.head.appendChild(script);
  });

  return checkoutScriptPromise;
}