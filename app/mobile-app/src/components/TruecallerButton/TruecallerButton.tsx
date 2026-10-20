import { useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Spinner, XStack } from 'tamagui';
import { auth } from '@duncit/auth-tokens';
import { BUTTON_SIZES, PRESS_STYLE } from '@duncit/buttons-native';
import { logs } from '@duncit/logs';
import { TRUECALLER_COPY, TRUECALLER_SIGNUP_STATE_KEY } from '@duncit/utils';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';
import {
  loginWithTruecaller,
  type TruecallerIds,
  type TruecallerProofInput,
} from '@/services/truecaller.service';
import { useAuthStore } from '@/stores/auth.store';
import { toErrorMessage } from '@/utils/errors';
import { useTruecallerNative } from './useTruecallerNative';

const ROUND_ICON = Math.round(BUTTON_SIZES.lg.height * auth.fit.socialIconRatio);

interface Props {
  ids: TruecallerIds;
  /** Which door: the accessible name follows it. */
  intent: 'SIGN_IN' | 'SIGN_UP';
  /** Another provider's credential is being spent — this button waits too. */
  loading?: boolean;
  onError: (message: string) => void;
}

/**
 * Continue with Truecaller — the round button. Both answers are handled here,
 * so login and signup behave the same: a known number signs straight in; an
 * unknown one opens signup with the number already proven.
 * mWeb twin: app/mweb/src/components/truecaller/TruecallerCell.tsx.
 */
export function TruecallerButton({ ids, intent, loading, onError }: Readonly<Props>) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const authenticate = useAuthStore((s) => s.authenticate);
  const [busy, setBusy] = useState(false);
  // Failures before a press (an SDK that cannot start) are logged, not shown.
  const pressed = useRef(false);

  const spend = async (proof: TruecallerProofInput) => {
    setBusy(true);
    try {
      const outcome = await loginWithTruecaller(proof);
      if (outcome.kind === 'SIGNED_IN') {
        authenticate(outcome.auth.token, outcome.auth.surveyCompleted);
      } else {
        navigation.navigate('Signup', { [TRUECALLER_SIGNUP_STATE_KEY]: outcome.proof });
      }
    } catch (error) {
      logs.mobileApp.error('TruecallerButton', 'loginWithTruecaller', { error });
      onError(toErrorMessage(error, t(TRUECALLER_COPY.failed)));
    } finally {
      pressed.current = false;
      setBusy(false);
    }
  };

  const truecaller = useTruecallerNative(ids, {
    onProof: (proof) => {
      spend(proof).catch(() => undefined);
    },
    onFailure: (detail) => {
      setBusy(false);
      logs.mobileApp.warn('TruecallerButton', 'sdk', { detail, pressed: pressed.current });
      if (pressed.current) onError(t(TRUECALLER_COPY.declined));
      pressed.current = false;
    },
  });

  const waiting = busy || loading === true || !truecaller.ready;
  const press = () => {
    if (waiting) return;
    pressed.current = true;
    truecaller
      .open()
      .then((opened) => {
        if (!opened) onError(t(TRUECALLER_COPY.notInstalled));
      })
      .catch((error: unknown) => {
        logs.mobileApp.error('TruecallerButton', 'open', { error });
        onError(t(TRUECALLER_COPY.failed));
      });
  };

  return (
    <XStack
      testID="truecaller-auth-button"
      role="button"
      aria-disabled={waiting}
      aria-busy={busy}
      aria-label={t(intent === 'SIGN_UP' ? TRUECALLER_COPY.signUp : TRUECALLER_COPY.signIn)}
      tabIndex={0}
      disabled={waiting}
      onPress={press}
      alignItems="center"
      justifyContent="center"
      width={BUTTON_SIZES.lg.height}
      height={BUTTON_SIZES.lg.height}
      borderRadius={BUTTON_SIZES.lg.borderRadius}
      backgroundColor="$accent"
      opacity={waiting ? 0.6 : 1}
      pressStyle={PRESS_STYLE.control}
    >
      {busy ? (
        <Spinner color="$background" />
      ) : (
        <Ionicons name="call" size={ROUND_ICON} color={colors.background} />
      )}
    </XStack>
  );
}
