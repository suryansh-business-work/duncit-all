/**
 * Whether an address can be handed to a courier.
 *
 * "Not empty" is not enough: a browser's address autofill happily fills the
 * street line and the city with just the country, and ShipRocket then refuses
 * the order (an address under three characters, no real city). The checkout
 * and the shipment both ask the same question here, so what the buyer is
 * allowed to submit is exactly what the courier will accept.
 */
export interface CourierAddress {
  line1?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  country?: string | null;
  phone?: string | null;
}

const MIN_TEXT = 3;

const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const digits = (v: unknown) => text(v).replaceAll(/\D/g, '');

/** What is wrong with the address, in words that finish "Enter …". Empty = shippable. */
export function addressProblems(a: CourierAddress): string[] {
  const line1 = text(a.line1);
  const city = text(a.city);
  const country = text(a.country) || 'India';
  const region = new Set([city, text(a.state), country, digits(a.pincode)].map((v) => v.toLowerCase()).filter(Boolean));
  const problems: string[] = [];
  if (line1.length < MIN_TEXT || region.has(line1.toLowerCase()) || /^\d+$/.test(line1)) {
    problems.push('the house number and street');
  }
  if (city.length < MIN_TEXT || city.toLowerCase() === country.toLowerCase()) problems.push('the city');
  if (!text(a.state)) problems.push('the state');
  if (!/^\d{6}$/.test(digits(a.pincode))) problems.push('a 6-digit pincode');
  if (digits(a.phone).slice(-10).length !== 10) problems.push('a 10-digit phone number');
  return problems;
}
