import { missingCheckoutRequirements, type CheckoutRequirement } from '@duncit/utils';
import { useMeStore } from '@/stores/me.store';

export interface CheckoutEligibility {
  /** What the account still has to do. Empty means it can pay. */
  missing: CheckoutRequirement[];
  loading: boolean;
  ready: boolean;
}

/**
 * Whether this account may pay, and what is stopping it.
 *
 * The server refuses the payment itself, so this exists purely so the buyer
 * finds out BEFORE filling in a card rather than after. It reads the `me` store
 * every screen already loads instead of asking again — the account facts it needs
 * are on that document, so the gate costs no extra request.
 *
 * While nothing is loaded nothing is claimed to be missing: a gate that flashes
 * on a cold store reads as a rejection. mWeb twin.
 */
export function useCheckoutEligibility(): CheckoutEligibility {
  // Not re-read on mount: the phone and email verification flows re-read the
  // user info when they save, which is what lifts the gate in this session.
  const data = useMeStore((s) => s.data);

  const me = data?.me;
  const missing = me
    ? missingCheckoutRequirements({
        phoneNumber: me.phone_number,
        isEmailVerified: me.is_email_verified,
      })
    : [];
  return { missing, loading: !me, ready: !!me && missing.length === 0 };
}
