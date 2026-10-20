import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  readTruecallerSignupProof,
  TRUECALLER_SIGNUP_STATE_KEY,
  type TruecallerSignupProof,
} from '@duncit/utils';

/**
 * Take the Truecaller proof that navigated here (from login, or from this
 * page's own Truecaller button) into the signup flow — once.
 *
 * The state is cleared from the history entry as it is taken: router state
 * outlives a reload, and the proof is single-use on the server, so replaying
 * it would only prefill a form whose shortcut no longer works.
 */
export function useTruecallerHandoff(onProof: (proof: TruecallerSignupProof) => void) {
  const location = useLocation();
  const navigate = useNavigate();
  const carried = readTruecallerSignupProof(
    (location.state as Record<string, unknown> | null)?.[TRUECALLER_SIGNUP_STATE_KEY],
  );
  const token = carried?.whatsapp_token ?? '';

  useEffect(() => {
    if (!carried) return;
    onProof(carried);
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
    // Keyed by the proof itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);
}
