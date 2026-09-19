import { isEmailAddress } from '@utils/email';

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
/** ShipRocket refuses a pickup address whose street line is shorter than this. */
const MIN_PICKUP_STREET = 10;
const STREET = 'the house number and street';

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
    problems.push(STREET);
  }
  if (city.length < MIN_TEXT || city.toLowerCase() === country.toLowerCase()) problems.push('the city');
  if (!text(a.state)) problems.push('the state');
  if (!/^\d{6}$/.test(digits(a.pincode))) problems.push('a 6-digit pincode');
  if (digits(a.phone).slice(-10).length !== 10) problems.push('a 10-digit phone number');
  return problems;
}

export interface PickupAddress extends CourierAddress {
  name?: string | null;
  email?: string | null;
}

/**
 * What ShipRocket would refuse in a new pickup address — the courier's rules
 * above, plus a street line of ten characters, a contact name and an email.
 * Checked before the call, so the operator is told what to fix instead of
 * reading ShipRocket's validation dump.
 */
export function pickupProblems(p: PickupAddress): string[] {
  const problems = addressProblems(p);
  if (!problems.includes(STREET) && text(p.line1).length < MIN_PICKUP_STREET) {
    problems.unshift(`${STREET} (at least ${MIN_PICKUP_STREET} characters)`);
  }
  if (!text(p.name)) problems.push('a contact name');
  if (!isEmailAddress(text(p.email))) problems.push('a contact email');
  return problems;
}
