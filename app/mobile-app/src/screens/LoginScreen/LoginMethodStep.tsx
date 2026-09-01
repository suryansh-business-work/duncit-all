import { Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { AuthAvatarsStrip } from '@/components/AuthAvatarsStrip';
import { AuthDivider } from '@/components/AuthDivider';
import { GoogleAuthButton } from '@/components/GoogleAuthButton';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  onGoogle: (idToken: string) => void;
  onGoogleError: (message: string) => void;
  onChoosePassword: () => void;
  onChooseOtp: () => void;
  onSignup: () => void;
}

/**
 * The landing step: how would you like to sign in? Tamagui twin of mWeb's
 * <LoginMethodStep/>.
 *
 * Signing in is a choice of method now rather than a password form with a
 * Google button under it, so the two are offered side by side and the email and
 * password boxes live one step in — which is also where "Forgot password?"
 * belongs, since it is only ever about the password.
 */
export function LoginMethodStep({
  onGoogle,
  onGoogleError,
  onChoosePassword,
  onChooseOtp,
  onSignup,
}: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <YStack gap={16}>
      <AuthAvatarsStrip caption={t('mweb.login.avatarsCaption')} />
      <Text textAlign="center" fontSize={14} color="$muted">
        {t('mweb.login.chooseMethod')}
      </Text>
      <GoogleAuthButton
        label={t('mweb.login.googleSignIn')}
        onIdToken={onGoogle}
        onError={onGoogleError}
      />
      <AuthDivider />
      <PrimaryButton
        testID="continue-with-password"
        label={t('mweb.login.continueWithPassword')}
        onPress={onChoosePassword}
      />
      <PrimaryButton
        testID="continue-with-otp"
        label={t('mweb.login.continueWithOtp')}
        onPress={onChooseOtp}
      />
      <XStack justifyContent="center" gap={4}>
        <Text fontSize={14} color="$muted">
          {t('mweb.login.newHere')}
        </Text>
        <Text
          pressStyle={PRESS_STYLE.inline}
          testID="go-signup"
          fontSize={14}
          fontWeight="600"
          color="$primary"
          onPress={onSignup}
        >
          {t('mweb.login.createOne')}
        </Text>
      </XStack>
    </YStack>
  );
}
