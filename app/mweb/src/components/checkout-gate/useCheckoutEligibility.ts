import { useQuery } from '@apollo/client';
import { missingCheckoutRequirements, type CheckoutRequirement } from '@duncit/utils';
import { CHECKOUT_ELIGIBILITY, type CheckoutEligibilityMe } from './queries';

export interface CheckoutEligibility {
  /** What the account still has to do. Empty means it can pay. */
  missing: CheckoutRequirement[];
  /** True until the answer is known — never block a button on a pending read. */
  loading: boolean;
  ready: boolean;
}

/**
 * Whether this account may pay, and what is stopping it.
 *
 * The server refuses the payment itself, so this exists purely so the buyer
 * finds out BEFORE filling in a card rather than after. While the answer is
 * still loading nothing is claimed to be missing — a gate that flashes on a
 * cold cache reads as a rejection.
 */
export function useCheckoutEligibility(): CheckoutEligibility {
  const { data, loading } = useQuery<{ me: CheckoutEligibilityMe | null }>(CHECKOUT_ELIGIBILITY, {
    fetchPolicy: 'cache-and-network',
  });
  const me = data?.me;
  const missing = me
    ? missingCheckoutRequirements({
        phoneNumber: me.phone_number,
        isEmailVerified: me.is_email_verified,
      })
    : [];
  return { missing, loading: loading && !me, ready: !!me && missing.length === 0 };
}
