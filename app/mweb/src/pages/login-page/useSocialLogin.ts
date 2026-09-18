import { useRef, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { useNavigate } from 'react-router';
import {
  openGoogleSignup,
  SOCIAL_AUTH_COPY,
  SOCIAL_NOT_FOUND_CODE,
  type GoogleSignupHandoff,
  type SocialCredential,
} from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import { parseApiError } from '../../utils/parseApiError';
import { LINK_APPLE_ACCOUNT, LINK_GOOGLE_ACCOUNT, LOGIN_APPLE, LOGIN_GOOGLE } from './queries';

type FinishLogin = (token: string, user: any) => Promise<void>;

/** The pending consent grant: the credential the login just refused, and the account it matched. */
export interface SocialConsent {
  credential: SocialCredential;
  email: string;
}

/**
 * Signing in through Google or Apple — the same door, whichever provider.
 *
 * A credential is spent on the provider's login. It either opens a session, or
 * is refused in one of two ways that are offers rather than dead ends: the
 * provider vouched for an address an email/password account holds (the consent
 * step offers to link it), or Duncit has no account for it at all (the invite
 * carries the credential, unspent, into signup). Either way the credential is
 * kept, so answering "yes" never needs a second trip to the provider.
 *
 * Native twin: app/mobile-app/src/screens/LoginScreen/useSocialLogin.ts.
 */
export function useSocialLogin(finishLogin: FinishLogin) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loginGoogle, { loading: googleBusy }] = useMutation<any>(LOGIN_GOOGLE);
  const [loginApple, { loading: appleBusy }] = useMutation<any>(LOGIN_APPLE);
  const [linkGoogle, { loading: googleLinking }] = useMutation<any>(LINK_GOOGLE_ACCOUNT);
  const [linkApple, { loading: appleLinking }] = useMutation<any>(LINK_APPLE_ACCOUNT);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<GoogleSignupHandoff | null>(null);
  const [consent, setConsent] = useState<SocialConsent | null>(null);
  const [consentError, setConsentError] = useState<string | null>(null);
  /*
    The provider's own button stays pressable under the spinner. A second press
    during the exchange would put two logins in the air, and for a brand-new
    account that is two invites — and, if both are answered, two runs at making
    one account. One exchange at a time; a ref because the guard has to hold
    within the tick, before any re-render.
  */
  const exchanging = useRef(false);

  const login = async ({ provider, idToken }: SocialCredential) => {
    const variables = { input: { id_token: idToken } };
    if (provider === 'APPLE') return (await loginApple({ variables })).data?.loginWithApple;
    return (await loginGoogle({ variables })).data?.loginWithGoogle;
  };

  const link = async ({ provider, idToken }: SocialCredential) => {
    const variables = { input: { id_token: idToken } };
    if (provider === 'APPLE') return (await linkApple({ variables })).data?.linkAppleAccount;
    return (await linkGoogle({ variables })).data?.linkGoogleAccount;
  };

  const start = async (credential: SocialCredential) => {
    if (exchanging.current) return;
    exchanging.current = true;
    setError(null);
    try {
      const payload = await login(credential);
      if (payload?.token) await finishLogin(payload.token, payload.user);
    } catch (e: any) {
      const extensions = e.graphQLErrors?.[0]?.extensions;
      const email = (extensions?.email as string | undefined) ?? '';
      if (extensions?.code === SOCIAL_NOT_FOUND_CODE[credential.provider]) {
        setInvite((current) =>
          openGoogleSignup(current, credential.idToken, email, {
            provider: credential.provider,
            name: credential.name,
          }),
        );
      } else if (extensions?.code === 'EMAIL_LOGIN_REQUIRED') {
        setConsentError(null);
        setConsent({ credential, email });
      } else {
        setError(parseApiError(e));
      }
    } finally {
      exchanging.current = false;
    }
  };

  /*
    Yes to the invite: carry the credential into signup, in router state rather
    than the query string — an id_token in the URL is an id_token in the
    history and in every access log the address reaches. Clearing the invite
    first is what makes a double press idempotent here.
  */
  const acceptInvite = () => {
    if (!invite) return;
    setInvite(null);
    navigate('/register', { state: { googleSignup: invite } });
  };

  const allowLink = async () => {
    if (!consent) return;
    setConsentError(null);
    try {
      const payload = await link(consent.credential);
      if (payload?.token) {
        setConsent(null);
        await finishLogin(payload.token, payload.user);
      }
    } catch (e) {
      // Kept open with the reason: closing would look like the grant worked.
      setConsentError(parseApiError(e));
    }
  };

  // Denying changes nothing about the account. Back to the options with a
  // warning that says both what happened and how to get here again.
  const denyLink = () => {
    if (!consent) return;
    const provider = consent.credential.provider;
    setConsent(null);
    setConsentError(null);
    setError(t(SOCIAL_AUTH_COPY[provider].linkDenied));
  };

  return {
    busy: googleBusy || appleBusy,
    error,
    setError,
    start,
    invite,
    acceptInvite,
    dismissInvite: () => setInvite(null),
    consent,
    consentError,
    linking: googleLinking || appleLinking,
    allowLink,
    denyLink,
  };
}
