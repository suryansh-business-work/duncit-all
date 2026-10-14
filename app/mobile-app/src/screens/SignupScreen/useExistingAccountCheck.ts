import { useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { logs } from '@duncit/logs';
import type { SocialCredential } from '@duncit/utils';

import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';
import { socialSignupStatus } from '@/services/auth.service';
import { toErrorMessage } from '@/utils/errors';

/** A credential for somebody already on Duncit, waiting on "log in instead?". */
interface ExistingSocialAccount {
  credential: SocialCredential;
  email: string;
}

/**
 * The signup screen's first question for a Google or Apple credential: is this
 * person already on Duncit? Asked before the policy sheet, so somebody who is
 * gets "log in instead?" rather than a signup that could only end in a refusal
 * after their WhatsApp code was spent.
 *
 * "Log me in" carries the credential, unspent, to the login screen — the one
 * place that handles every answer a provider login can get. Nothing is signed
 * in from here. mWeb twin: app/mweb/src/hooks/useGoogleSignup.ts.
 */
export function useExistingAccountCheck(onError: (message: string | null) => void) {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [existing, setExisting] = useState<ExistingSocialAccount | null>(null);
  const [checking, setChecking] = useState(false);
  // One check at a time: a ref holds within the tick, before the busy flag renders.
  const inFlight = useRef(false);

  /** Runs `onNew` only for a credential nobody on Duncit answers to. */
  const check = async (credential: SocialCredential, onNew: () => void) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setChecking(true);
    try {
      const status = await socialSignupStatus(credential);
      if (status.exists) setExisting({ credential, email: status.email });
      else onNew();
    } catch (e) {
      // Nothing is opened on a failed ask: the provider button can be pressed again.
      logs.mobileApp.error('useExistingAccountCheck', 'socialSignupStatus', {
        error: e,
        provider: credential.provider,
      });
      onError(toErrorMessage(e, t('mweb.auth.somethingWentWrong')));
    } finally {
      setChecking(false);
      inFlight.current = false;
    }
  };

  const logIn = () => {
    if (!existing) return;
    setExisting(null);
    navigation.navigate('Login', {
      socialLogin: {
        idToken: existing.credential.idToken,
        email: existing.email,
        provider: existing.credential.provider,
      },
    });
  };

  return { check, checking, existing, logIn, dismiss: () => setExisting(null) };
}
