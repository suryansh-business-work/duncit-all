import { Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { LoginForm, type LoginSubmitValues } from '@/forms/login';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  loading: boolean;
  errorMessage: string | null;
  onSubmit: (values: LoginSubmitValues) => void | Promise<void>;
  onForgotPassword: () => void;
  onBack: () => void;
}

/**
 * The password step. Tamagui twin of mWeb's <LoginPasswordStep/>.
 *
 * "Forgot password?" lives here rather than on the landing step because it is
 * only ever about a password — offering it to somebody about to press Continue
 * with Google was offering to recover something they may not have.
 */
export function LoginPasswordStep({
  loading,
  errorMessage,
  onSubmit,
  onForgotPassword,
  onBack,
}: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <YStack gap={16}>
      <Text textAlign="center" fontSize={14} color="$muted">
        {t('mweb.login.passwordStepSubtitle')}
      </Text>
      <LoginForm loading={loading} errorMessage={errorMessage} onSubmit={onSubmit} />
      <XStack justifyContent="flex-end">
        <Text
          pressStyle={PRESS_STYLE.inline}
          testID="go-forgot-password"
          fontSize={14}
          fontWeight="600"
          color="$primary"
          onPress={onForgotPassword}
        >
          {t('mweb.login.forgotPassword')}
        </Text>
      </XStack>
      <XStack justifyContent="center">
        <Text
          pressStyle={PRESS_STYLE.inline}
          testID="back-to-options"
          fontSize={14}
          fontWeight="600"
          color="$primary"
          onPress={onBack}
        >
          {t('mweb.login.backToOptions')}
        </Text>
      </XStack>
    </YStack>
  );
}
