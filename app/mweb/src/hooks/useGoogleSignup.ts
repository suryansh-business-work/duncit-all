import { useState } from 'react';
import type { SocialCredential } from '@duncit/utils';
import { useTranslation } from '../i18n/useTranslation';

/**
 * Google (or Apple) signup, held open across the policy gate AND the WhatsApp code.
 *
 * `signupWithGoogle` is new-account-only, so the credential Google returns is
 * kept unspent — first while the acceptance dialog runs, then while the number
 * step and the code step do. Nothing is created until all three have answered,
 * which is what the dialog's Google wording promises: backing out at any point
 * leaves nothing behind.
 *
 * This hook holds the credential and nothing else. The mutation belongs to the
 * SIGNUP FLOW, which is the only thing that knows the number the code proved —
 * and a Google account with no proven number is exactly what must not exist.
 */
export function useGoogleSignup(
  onAccepted: (credential: SocialCredential, policyIds: string[]) => void,
) {
  const { t } = useTranslation();
  const [credential, setCredential] = useState<SocialCredential | null>(null);
  const [error, setError] = useState<string | null>(null);

  const start = (next: SocialCredential) => {
    setError(null);
    setCredential(next);
  };

  const accept = (acceptedPolicyIds: string[]) => {
    const held = credential;
    setCredential(null);
    if (held) onAccepted(held, acceptedPolicyIds);
  };

  // Backing out drops the credential: they can press Google again, and until
  // every policy is accepted there is nothing to carry forward.
  const cancel = () => {
    setCredential(null);
    setError(t('policyAcceptance.mustAcceptHint'));
  };

  return { credential, error, setError, start, accept, cancel };
}
