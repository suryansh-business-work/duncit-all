import type { ComponentProps } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { BUTTON_SIZES, PRESS_STYLE } from '@duncit/buttons-native';

import { AuthDivider } from '@/components/AuthDivider';
import { GoogleAuthButton } from '@/components/GoogleAuthButton';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

const LG = BUTTON_SIZES.lg;

interface MethodButtonProps {
  testID: string;
  label: string;
  icon: ComponentProps<typeof MaterialIcons>['name'];
  /** Resolved once by the parent — @expo/vector-icons takes a colour string. */
  ink: string;
  onPress: () => void;
}

/**
 * One "continue with…" choice: a surface pill with a hairline, ink label and
 * icon — the same look as the Google pill above it, because all three are a
 * choice of door, not the action itself. The green pill waits one step in, on
 * the button that actually signs you in. mWeb twin: METHOD_SX in
 * pages/login-page/LoginMethodStep.tsx. Hoisted, never nested (S6478).
 */
function MethodButton({ testID, label, icon, ink, onPress }: Readonly<MethodButtonProps>) {
  return (
    <XStack
      testID={testID}
      role="button"
      aria-label={label}
      onPress={onPress}
      alignItems="center"
      justifyContent="center"
      gap={LG.gap}
      width="100%"
      height={LG.height}
      paddingHorizontal={LG.paddingHorizontal}
      borderRadius={LG.borderRadius}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
      pressStyle={PRESS_STYLE.control}
    >
      <MaterialIcons name={icon} size={LG.iconSize} color={ink} />
      <Text fontSize={LG.fontSize} fontWeight="600" color="$color">
        {label}
      </Text>
    </XStack>
  );
}

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
  const { color: ink } = useThemeColors();

  return (
    <YStack gap={16}>
      <GoogleAuthButton
        label={t('mweb.login.googleSignIn')}
        loading={googleLoading}
        onIdToken={onGoogle}
        onError={onGoogleError}
      />
      <AuthDivider />
      <MethodButton
        testID="continue-with-password"
        label={t('mweb.login.continueWithPassword')}
        icon="lock-outline"
        ink={ink}
        onPress={onChoosePassword}
      />
      <MethodButton
        testID="continue-with-otp"
        label={t('mweb.login.continueWithOtp')}
        icon="pin"
        ink={ink}
        onPress={onChooseOtp}
      />
      <XStack justifyContent="center" gap={4} paddingTop={8}>
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
