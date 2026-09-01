import { Text, XStack, YStack } from 'tamagui';
import { buildOtpLoginLabels, recoveryDestination } from '@duncit/utils';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { RecoveryChannelStep } from '@/components/password-recovery/RecoveryChannelStep';
import { RecoveryCodeStep } from '@/components/password-recovery/RecoveryCodeStep';
import { useTranslation } from '@/hooks/useTranslation';
import type { OtpLogin } from './useOtpLogin';

interface Props {
  otp: OtpLogin;
  onBack: () => void;
}

/**
 * Continue with OTP: pick a channel, then type the code. Tamagui twin of
 * mWeb's <LoginOtpStep/> — the same two steps recovery renders, with sign-in
 * copy and a session at the end, so there is no third screen here.
 */
export function LoginOtpStep({ otp, onBack }: Readonly<Props>) {
  const { t } = useTranslation();
  const labels = buildOtpLoginLabels(t);
  const { state, error, notFound, expiresInMinutes, testCode, resendIn, busy } = otp;
  const onCode = state.step === 'CODE';

  return (
    <YStack gap={16}>
      {onCode ? (
        <RecoveryCodeStep
          labels={labels}
          destination={recoveryDestination(state.channel, state.draft)}
          expiresInMinutes={expiresInMinutes}
          testCode={testCode}
          busy={busy.verifying}
          resending={busy.requesting}
          resendIn={resendIn}
          onVerify={(code) => {
            otp.submitCode(code).catch(() => undefined);
          }}
          onResend={() => {
            otp.sendCode(state.draft).catch(() => undefined);
          }}
        />
      ) : (
        <RecoveryChannelStep
          key={state.channel}
          channel={state.channel}
          labels={labels}
          defaultValues={state.draft}
          busy={busy.requesting}
          notFound={notFound}
          onChannel={otp.setChannel}
          onSend={(draft) => {
            otp.sendCode(draft).catch(() => undefined);
          }}
        />
      )}

      {error ? (
        <Text fontSize={14} color="$danger" testID="otp-login-error">
          {error}
        </Text>
      ) : null}

      <XStack justifyContent="center">
        <Text
          testID="otp-back"
          pressStyle={PRESS_STYLE.inline}
          fontSize={14}
          fontWeight="600"
          color="$primary"
          onPress={onCode ? otp.goBack : onBack}
        >
          {onCode ? labels.back : t('mweb.login.backToOptions')}
        </Text>
      </XStack>
    </YStack>
  );
}
