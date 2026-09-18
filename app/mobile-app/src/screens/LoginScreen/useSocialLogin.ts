import { useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  openGoogleSignup,
  SOCIAL_AUTH_COPY,
  SOCIAL_NOT_FOUND_CODE,
  type GoogleSignupHandoff,
  type SocialCredential,
} from '@duncit/utils';

import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';
import {
  linkAppleAccount,
  linkGoogleAccount,
  loginWithApple,
  loginWithGoogle,
  type AuthOutcome,
} from '@/services/auth.service';
import { useAuthStore } from '@/stores/auth.store';
import { errorCode, toErrorMessage } from '@/utils/errors';

/** The pending consent grant: the credential the login just refused, and the account it matched. */
export interface SocialConsent {
  credential: SocialCredential;
  email: string;
}

const login = ({ provider, idToken }: SocialCredential): Promise<AuthOutcome> =>
  provider === 'APPLE' ? loginWithApple(idToken) : loginWithGoogle(idToken);

const link = ({ provider, idToken }: SocialCredential): Promise<AuthOutcome> =>
  provider === 'APPLE' ? linkAppleAccount(idToken) : linkGoogleAccount(idToken);

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
 * mWeb twin: app/mweb/src/pages/login-page/useSocialLogin.ts.
 */
export function useSocialLogin(onError: (message: string | null) => void) {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const authenticate = useAuthStore((s) => s.authenticate);
  /*
    The exchange is the slow half: the provider returning is the halfway point,
    and until the login answers the screen would otherwise have nothing on it.
  */
  const [busy, setBusy] = useState(false);
  const [invite, setInvite] = useState<GoogleSignupHandoff | null>(null);
  const [consent, setConsent] = useState<SocialConsent | null>(null);
  const [consentError, setConsentError] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);
  /*
    One exchange at a time. The busy flag is what the SCREEN shows, and it is a
    render behind: two taps landing in the same tick would both get past it and
    put two logins in the air, which for a brand-new account is two invites and
    two runs at making one account. A ref holds within the tick.
  */
  const exchanging = useRef(false);

  const start = async (credential: SocialCredential) => {
    if (exchanging.current) return;
    exchanging.current = true;
    onError(null);
    setBusy(true);
    try {
      const result = await login(credential);
      authenticate(result.token, result.surveyCompleted);
    } catch (e) {
      const code = errorCode(e);
      const email = (e as { extensions?: { email?: string } }).extensions?.email ?? '';
      if (code === 'EMAIL_LOGIN_REQUIRED') {
        setConsentError(null);
        setConsent({ credential, email });
      } else if (code === SOCIAL_NOT_FOUND_CODE[credential.provider]) {
        setInvite((current) =>
          openGoogleSignup(current, credential.idToken, email, {
            provider: credential.provider,
            name: credential.name,
          }),
        );
      } else {
        const failed =
          credential.provider === 'APPLE'
            ? t('mweb.auth.appleFailed')
            : t('mweb.auth.googleFailed');
        onError(toErrorMessage(e, failed));
      }
    } finally {
      setBusy(false);
      exchanging.current = false;
    }
  };

  /*
    Yes to the invite: carry the credential into signup as a navigation param.
    Clearing it first is what makes a double press idempotent here; the signup
    screen claims what arrives exactly once.
  */
  const acceptInvite = () => {
    if (!invite) return;
    setInvite(null);
    navigation.navigate('Signup', { googleSignup: invite });
  };

  const allowLink = async () => {
    if (!consent) return;
    const failed = t(SOCIAL_AUTH_COPY[consent.credential.provider].linkFailed);
    setConsentError(null);
    setLinking(true);
    try {
      const result = await link(consent.credential);
      setConsent(null);
      authenticate(result.token, result.surveyCompleted);
    } catch (e) {
      // Kept open with the reason: closing would look like the grant worked.
      setConsentError(toErrorMessage(e, failed));
    } finally {
      setLinking(false);
    }
  };

  // Denying changes nothing about the account. Back to the options with a
  // warning that says both what happened and how to get here again.
  const denyLink = () => {
    if (!consent) return;
    const provider = consent.credential.provider;
    setConsent(null);
    setConsentError(null);
    onError(t(SOCIAL_AUTH_COPY[provider].linkDenied));
  };

  return {
    busy,
    start,
    invite,
    acceptInvite,
    dismissInvite: () => setInvite(null),
    consent,
    consentError,
    linking,
    allowLink,
    denyLink,
  };
}
