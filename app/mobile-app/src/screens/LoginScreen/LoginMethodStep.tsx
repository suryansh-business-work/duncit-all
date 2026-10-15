import type { ComponentProps } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { auth } from '@duncit/auth-tokens';
import { BUTTON_SIZES, PRESS_STYLE } from '@duncit/buttons-native';
import type { SocialCredential } from '@duncit/utils';

import { AuthDivider } from '@/components/AuthDivider';
import { useAuthFit } from '@/components/AuthScaffold/useAuthFit';
import { LegalLinks } from '@/components/LegalLinks';
import { SocialRoundButtons } from '@/components/SocialRoundButtons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { LoginFeatureChips } from './LoginFeatureChips';

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
 * One "continue with…" door: a large surface pill — icon, label, chevron —
 * because it opens a step rather than signing anyone in. mWeb twin: MethodRow
 * in pages/login-page/LoginMethodStep.tsx. Hoisted, never nested (S6478).
 */
function MethodButton({ testID, label, icon, ink, onPress }: Readonly<MethodButtonProps>) {
  return (
    <XStack
      testID={testID}
      role="button"
      aria-label={label}
      tabIndex={0}
      onPress={onPress}
      alignItems="center"
      justifyContent="flex-start"
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
      <Text flex={1} fontSize={LG.fontSize} fontWeight="600" color="$color">
        {label}
      </Text>
      <MaterialIcons name="chevron-right" size={LG.iconSize} color={ink} />
    </XStack>
  );
}

interface Props {
  /** True while the screen is spending a Google or Apple id_token on the server. */
  socialLoading?: boolean;
  onSocialCredential: (credential: SocialCredential) => void;
  onSocialError: (message: string) => void;
  onChoosePassword: () => void;
  onChooseOtp: () => void;
  onSignup: () => void;
}

/**
 * The landing step: how would you like to sign in? Tamagui twin of mWeb's
 * <LoginMethodStep/>.
 *
 * Feature chips, then the two doors that open a step (password, OTP), the way
 * to signup and the legal line — and, under an OR, Google and Apple as round
 * buttons. "Forgot password?" lives one step in, beside the password box.
 */
export function LoginMethodStep({
  socialLoading,
  onSocialCredential,
  onSocialError,
  onChoosePassword,
  onChooseOtp,
  onSignup,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { color: ink } = useThemeColors();
  // The gaps between blocks shrink with the window; the doors themselves don't.
  const { size } = useAuthFit();

  return (
    <YStack gap={size(auth.fit.gap * (2 / 3))}>
      <LoginFeatureChips />
      <YStack gap={12}>
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
      </YStack>
      <XStack justifyContent="center" gap={4}>
        <Text fontSize={14} color="$muted">
          {t('mweb.login.newHere')}
        </Text>
        <Text
          pressStyle={PRESS_STYLE.inline}
          testID="go-signup"
          role="link"
          fontSize={14}
          fontWeight="600"
          color="$accent"
          textDecorationLine="underline"
          onPress={onSignup}
        >
          {t('mweb.login.createOne')}
        </Text>
      </XStack>
      <LegalLinks prefix={t('mweb.auth.legalSignIn')} />
      <AuthDivider />
      <SocialRoundButtons
        intent="SIGN_IN"
        loading={socialLoading}
        onCredential={onSocialCredential}
        onError={onSocialError}
      />
    </YStack>
  );
}
