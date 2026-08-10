/** Money formatting for the picker. Matches what the pod forms already render
 * beside it (₹ / en-IN), held in one place so the dialog, the card and the
 * attached list cannot disagree about a price. */
const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

export const formatMoney = (amount: number): string => currency.format(Number(amount) || 0);
