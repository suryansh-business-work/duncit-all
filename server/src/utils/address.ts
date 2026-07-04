/** A structured postal address — the user's saved main address and the shape
 * embedded in a payment's billing block. Kept in one place so the User profile
 * and the Payment billing stay in lock-step. */
export interface PostalAddress {
  line1: string;
  line2: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/** Normalize any raw/partial address doc into the full string-only shape
 * (missing parts become '', country defaults to India). */
export function toPostalAddress(raw: unknown): PostalAddress {
  const a = (raw ?? {}) as Record<string, unknown>;
  return {
    line1: str(a.line1),
    line2: str(a.line2),
    landmark: str(a.landmark),
    city: str(a.city),
    state: str(a.state),
    pincode: str(a.pincode),
    country: str(a.country) || 'India',
  };
}

/** True when the address has enough to be a real postal address (a line + city
 * + pincode). Used to decide whether an invoice can print an address block. */
export function hasPostalAddress(a: PostalAddress): boolean {
  return !!(a.line1 && a.city && a.pincode);
}

/** Single-line, comma-joined address string (skips empty parts) — used for the
 * legacy flat `billing_address` field and compact displays. */
export function composeAddressLine(a: PostalAddress): string {
  return [a.line1, a.line2, a.landmark, a.city, a.state, a.pincode, a.country]
    .map((p) => p.trim())
    .filter(Boolean)
    .join(', ');
}
