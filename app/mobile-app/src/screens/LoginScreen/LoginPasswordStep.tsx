import { Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';
import type { RecoveryHandoff } from '@duncit/utils';

import { LoginForm, type LoginSubmitValues } from '@/forms/login';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  loading: boolean;
  errorMessage: string | null;
  onSubmit: (values: LoginSubmitValues) => void | Promise<void>;
  onForgotPassword: (handoff: RecoveryHandoff) => void;
  onBack: () => void;
}

/**
 * The password step. Tamagui twin of mWeb's <LoginPasswordStep/>.
 *
 * "Forgot password?" lives here rather than on the landing step because it is
 * only ever about a password. The form renders it beside the password box and
 * hands over its tab and boxes, so the code goes straight to that email or number.
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
      <LoginForm
        loading={loading}
        errorMessage={errorMessage}
        onSubmit={onSubmit}
        onForgotPassword={onForgotPassword}
      />
      <XStack justifyContent="center">
        <Text
          pressStyle={PRESS_STYLE.inline}
          testID="back-to-options"
          role="button"
          fontSize={14}
          fontWeight="600"
          color="$accent"
          onPress={onBack}
        >
          {t('mweb.login.backToOptions')}
        </Text>
      </XStack>
    </YStack>
  );
}
