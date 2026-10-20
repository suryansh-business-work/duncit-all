import { Text, XStack, YStack } from 'tamagui';
import type { SocialCredential } from '@duncit/utils';

import { AppleAuthButton, useAppleConfigured } from '@/components/AppleAuthButton';
import { GoogleAuthButton } from '@/components/GoogleAuthButton';
import { TruecallerCell } from '@/components/TruecallerButton';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  /** Which door: the buttons' accessible names follow it. */
  intent: 'SIGN_IN' | 'SIGN_UP';
  /** True while a credential is being spent — both buttons wait. */
  loading?: boolean;
  onCredential: (credential: SocialCredential) => void;
  onError: (message: string) => void;
}

/**
 * Google, Apple and Truecaller as a row of round buttons, each captioned with
 * the provider's name — the redesigned login and signup screens share it so
 * the two doors cannot drift apart. Apple and Truecaller are absent until Tech
 * has configured them (Truecaller also needs a build that carries its SDK). mWeb twin: app/mweb/src/components/SocialRoundButtons.tsx.
 */
export function SocialRoundButtons({ intent, loading, onCredential, onError }: Readonly<Props>) {
  const { t } = useTranslation();
  const appleReady = useAppleConfigured();
  const signUp = intent === 'SIGN_UP';

  return (
    <XStack testID="social-round-buttons" justifyContent="center" gap={48}>
      <YStack alignItems="center" gap={8}>
        <GoogleAuthButton
          variant="icon"
          label={signUp ? t('mweb.auth.googleContinue') : t('mweb.login.googleSignIn')}
          loading={loading}
          onIdToken={(idToken) => onCredential({ provider: 'GOOGLE', idToken })}
          onError={onError}
        />
        <Text fontSize={14} color="$muted">
          {t('mweb.auth.googleShort')}
        </Text>
      </YStack>
      {appleReady ? (
        <YStack alignItems="center" gap={8}>
          <AppleAuthButton
            variant="icon"
            label={signUp ? t('mweb.auth.appleSignUp') : t('mweb.auth.appleSignIn')}
            loading={loading}
            onCredential={onCredential}
            onError={onError}
          />
          <Text fontSize={14} color="$muted">
            {t('mweb.auth.appleShort')}
          </Text>
        </YStack>
      ) : null}
      <TruecallerCell intent={intent} loading={loading} onError={onError} />
    </XStack>
  );
}
