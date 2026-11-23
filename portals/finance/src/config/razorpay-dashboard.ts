/**
 * Razorpay's own dashboard pages for one payment, order or refund — the
 * "open it at Razorpay" links on a failed payment. One place, so a page Razorpay
 * moves is one edit. They open Duncit's Razorpay account only: a venue's food
 * orders are paid to the venue's own account and are never linked here.
 */
const RAZORPAY_DASHBOARD = 'https://dashboard.razorpay.com/app';

export const razorpayDashboardUrl = {
  payment: (id: string) => `${RAZORPAY_DASHBOARD}/payments/${encodeURIComponent(id)}`,
  order: (id: string) => `${RAZORPAY_DASHBOARD}/orders/${encodeURIComponent(id)}`,
  refund: (id: string) => `${RAZORPAY_DASHBOARD}/refunds/${encodeURIComponent(id)}`,
} as const;
