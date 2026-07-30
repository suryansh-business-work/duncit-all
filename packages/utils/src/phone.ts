/**
 * The national (local) digits of a phone number — the last `length` digits with
 * every non-digit stripped, so "+91 9876543210", "+919876543210" and
 * "9876543210" all read back as "9876543210".
 *
 * Display-only: use it wherever a phone is SHOWN as a bare local number. Never
 * write the result back over a stored number — a foreign number's country code
 * is data, not noise.
 */
export function nationalPhoneDigits(raw: string | null | undefined, length = 10): string {
  const digits = (raw ?? '').replace(/\D/g, '');
  return digits.slice(-length);
}
