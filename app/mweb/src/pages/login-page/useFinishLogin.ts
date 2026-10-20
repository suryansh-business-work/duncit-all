import { useLocation, useNavigate } from 'react-router';
import { useStartSession } from '../../user-info/useStartSession';
import {
  getSafeRedirectPath,
  postAuthPath,
  redirectPathFromLocation,
  type RedirectLocation,
} from '../../utils/redirect';

/**
 * Where every sign-in lands: store the session, then go where the person was
 * headed (the `redirect` param, or the page that sent them here), via the
 * onboarding survey when it is still owed. Password, OTP, Google, Apple and
 * Truecaller all end here, so they cannot land in different places.
 */
export function useFinishLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { start: startSession, starting } = useStartSession();

  const finishLogin = async (token: string, user: { onboarding_survey_completed?: boolean | null } | null) => {
    await startSession(token);
    const params = new URLSearchParams(location.search);
    const stateFrom = (location.state as { from?: RedirectLocation } | null)?.from;
    const redirect =
      getSafeRedirectPath(params.get('redirect')) ||
      getSafeRedirectPath(stateFrom ? redirectPathFromLocation(stateFrom) : '');
    navigate(postAuthPath(user?.onboarding_survey_completed !== false, redirect), { replace: true });
  };

  return { finishLogin, starting };
}
