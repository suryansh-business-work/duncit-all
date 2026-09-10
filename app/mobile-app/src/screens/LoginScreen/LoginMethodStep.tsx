import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { BUTTON_SIZES, PRESS_STYLE } from '@duncit/buttons-native';

import { AuthAvatarsStrip } from '@/components/AuthAvatarsStrip';
import { AuthDivider } from '@/components/AuthDivider';
import { DuncitButton } from '@/components/DuncitButton';
import { GoogleAuthButton } from '@/components/GoogleAuthButton';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

const ICON_SIZE = BUTTON_SIZES.lg.iconSize;

interface Props {
  /** True while the screen is spending the id_token on the server. */
  googleLoading?: boolean;
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
 *
 * The two methods are NOT the same weight, and drawing them as two identical
 * solid red buttons said they were: mWeb has always painted Password contained
 * and OTP outlined, each behind its own icon (rule 27). One solid CTA per
 * screen is also what the press system means by `solid`.
 */
export function LoginMethodStep({
  googleLoading,
  onGoogle,
  onGoogleError,
  onChoosePassword,
  onChooseOtp,
  onSignup,
}: Readonly<Props>) {
  const { t } = useTranslation();
  // @expo/vector-icons takes a colour string, not a `$token`, so the two label
  // colours `buttonSpec` resolves are read here and handed to the icons.
  const { onPrimary, primary } = useThemeColors();

  return (
    <YStack gap={16}>
      <AuthAvatarsStrip caption={t('mweb.login.avatarsCaption')} />
      <Text textAlign="center" fontSize={14} color="$muted">
        {t('mweb.login.chooseMethod')}
      </Text>
      <GoogleAuthButton
        label={t('mweb.login.googleSignIn')}
        loading={googleLoading}
        onIdToken={onGoogle}
        onError={onGoogleError}
      />
      <AuthDivider />
      <DuncitButton
        testID="continue-with-password"
        label={t('mweb.login.continueWithPassword')}
        onPress={onChoosePassword}
        size="lg"
        fullWidth
        elevated
        icon={<MaterialIcons name="lock-outline" size={ICON_SIZE} color={onPrimary} />}
      />
      <DuncitButton
        testID="continue-with-otp"
        label={t('mweb.login.continueWithOtp')}
        onPress={onChooseOtp}
        variant="outline"
        size="lg"
        fullWidth
        icon={<MaterialIcons name="pin" size={ICON_SIZE} color={primary} />}
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
