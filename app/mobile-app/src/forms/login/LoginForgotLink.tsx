import { Text, XStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';
import {
  recoveryHandoffFrom,
  type PasswordRecoveryChannel,
  type RecoveryHandoff,
  type SignInBoxes,
} from '@duncit/utils';

import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  channel: PasswordRecoveryChannel;
  /** The boxes as they stand at the moment of the press. */
  read: () => SignInBoxes;
  /** Absent: the form is used where there is no recovery to offer. */
  onPick?: (handoff: RecoveryHandoff) => void;
}

/**
 * "Forgot password?" under the password box. It carries the tab and what was
 * typed, so the code goes straight to that email or that number. mWeb twin:
 * forms/login/LoginForgotLink.tsx.
 */
export function LoginForgotLink({ channel, read, onPick }: Readonly<Props>) {
  const { t } = useTranslation();
  if (!onPick) return null;
  return (
    <XStack justifyContent="flex-end">
      <Text
        pressStyle={PRESS_STYLE.inline}
        testID="go-forgot-password"
        role="link"
        fontSize={14}
        fontWeight="600"
        color="$accent"
        onPress={() => onPick(recoveryHandoffFrom(channel, read()))}
      >
        {t('mweb.login.forgotPassword')}
      </Text>
    </XStack>
  );
}
