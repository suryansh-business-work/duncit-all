import { formatDateTime } from '@duncit/app-settings';
import { EM_DASH } from '@duncit/table';
import { rentalMoney, type RentalBookingRow } from '@duncit/utils';
import type { Translate } from '../../types';

/** An amount in the booking's own currency. */
export const bookingMoney = (booking: Pick<RentalBookingRow, 'currency_symbol'>, amount: number | null | undefined) =>
  rentalMoney(booking.currency_symbol, amount ?? 0);

/** A server timestamp in the admin-configured format, or a dash when there is none. */
export const when = (iso: string | null | undefined) => (iso ? formatDateTime(iso) || EM_DASH : EM_DASH);

/** A value the server may leave empty, said as "Not provided" instead of a blank. */
export const orNotProvided = (t: Translate, value: string | null | undefined) =>
  value?.trim() ? value : t('venueRentals.detail.notProvided');

/** How the rent was made: "₹50 × 3 hrs × 1 qty = ₹150", from the booking's frozen numbers. */
export function rentalChargeLine(t: Translate, booking: RentalBookingRow): string {
  const vars = {
    rate: bookingMoney(booking, booking.rate),
    quantity: booking.quantity,
    amount: bookingMoney(booking, booking.rent_amount),
  };
  return booking.unit === 'HOUR'
    ? t('venueRentals.guest.rentMathHour', { count: booking.units, vars })
    : t('venueRentals.guest.rentMathSlot', { vars });
}

/** The deposit rule frozen on the booking: Duncit's Razorpay refund, or cash at the venue for older ones. */
export function depositPolicyText(t: Translate, policy: string | null | undefined): string | null {
  if (policy === 'DUNCIT_REFUND') return t('venueRentals.detail.depositPolicyDuncit');
  if (policy === 'VENUE_CASH') return t('venueRentals.detail.depositPolicyVenue');
  return null;
}

/** A phone number as a `tel:` address: spaces dropped, the leading + kept. */
export const telHref = (phone: string) => `tel:${phone.split(' ').join('')}`;
