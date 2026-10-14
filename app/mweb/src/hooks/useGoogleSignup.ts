import { useRef, useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { logs } from '@duncit/logs';
import type { SocialCredential } from '@duncit/utils';
import { useTranslation } from '../i18n/useTranslation';
import { parseApiError } from '../utils/parseApiError';
import { SOCIAL_SIGNUP_STATUS } from '../pages/register-page/queries';

/** A credential for somebody already on Duncit, waiting on "log in instead?". */
export interface ExistingSocialAccount {
  credential: SocialCredential;
  email: string;
}

/**
 * Google (or Apple) signup, held open across the policy gate AND the WhatsApp code.
 *
 * `signupWithGoogle` is new-account-only, so the credential Google returns is
 * kept unspent — first while the acceptance dialog runs, then while the number
 * step and the code step do. Nothing is created until all three have answered,
 * which is what the dialog's Google wording promises: backing out at any point
 * leaves nothing behind.
 *
 * Before any of that, the server is asked whether the person is already on
 * Duncit. Someone who is gets "log in instead?" rather than a signup that could
 * only end in a refusal after their code was spent.
 *
 * This hook holds the credential and nothing else. The mutation belongs to the
 * SIGNUP FLOW, which is the only thing that knows the number the code proved —
 * and a Google account with no proven number is exactly what must not exist.
 */
export function useGoogleSignup(
  onAccepted: (credential: SocialCredential, policyIds: string[]) => void,
) {
  const { t } = useTranslation();
  const client = useApolloClient();
  const [credential, setCredential] = useState<SocialCredential | null>(null);
  const [existing, setExisting] = useState<ExistingSocialAccount | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // One check at a time: a ref holds within the tick, before the busy flag renders.
  const inFlight = useRef(false);

  const start = async (next: SocialCredential) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setError(null);
    setChecking(true);
    try {
      const { data } = await client.query({
        query: SOCIAL_SIGNUP_STATUS,
        variables: { input: { provider: next.provider, id_token: next.idToken } },
        // An answer about whether an account exists must never come from cache.
        fetchPolicy: 'no-cache',
      });
      const status = data?.socialSignupStatus;
      if (!status) setError(t('mweb.auth.somethingWentWrong'));
      else if (status.exists) setExisting({ credential: next, email: status.email });
      else setCredential(next);
    } catch (e) {
      // Nothing is opened on a failed ask: the provider button can be pressed again.
      logs.mWeb.error('useGoogleSignup', 'socialSignupStatus', { error: e, provider: next.provider });
      setError(parseApiError(e));
    } finally {
      setChecking(false);
      inFlight.current = false;
    }
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

  return {
    credential,
    existing,
    dismissExisting: () => setExisting(null),
    checking,
    error,
    setError,
    start,
    accept,
    cancel,
  };
}
