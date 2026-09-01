import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { semantic } from '@duncit/auth-tokens';
import { PRESS_STYLE } from '@duncit/buttons-native';
import {
  PASSWORD_RECOVERY_STEP_COUNT,
  buildPasswordRecoveryLabels,
  passwordRecoveryStepIndex,
  previousRecoveryStep,
  recoveryDestination,
  recoveryHeading,
} from '@duncit/utils';

import { AuthScaffold } from '@/components/AuthScaffold';
import { PrimaryButton } from '@/components/PrimaryButton';
import { RecoveryChannelStep } from '@/components/password-recovery/RecoveryChannelStep';
import { RecoveryCodeStep } from '@/components/password-recovery/RecoveryCodeStep';
import { RecoveryPasswordStep } from '@/components/password-recovery/RecoveryPasswordStep';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';
import { usePasswordRecovery } from './usePasswordRecovery';

/**
 * Forgotten-password recovery: choose a channel, prove the code, set the
 * password. Tamagui twin of mWeb's ForgotPasswordPage (rule 27) — the step
 * machine and every label come from @duncit/utils (rule 40).
 */
export function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const labels = buildPasswordRecoveryLabels(t);
  const recovery = usePasswordRecovery(t('mweb.auth.somethingWentWrong'));
  const { state, error, notFound, notSent, expiresInMinutes, testCode, resendIn, busy } = recovery;

  if (state.step === 'DONE') {
    return (
      <AuthScaffold
        testID="recovery-success"
        title={labels.doneTitle}
        accentWord={labels.doneTitleAccent}
        subtitle={labels.doneSubtitle}
      >
        <YStack alignItems="center" gap={16}>
          <MaterialIcons name="check-circle" size={64} color={semantic.success} />
          <PrimaryButton
            testID="recovery-go-login"
            label={labels.continueToLogin}
            onPress={() => navigation.navigate('Login')}
          />
        </YStack>
      </AuthScaffold>
    );
  }

  const heading = recoveryHeading(state.step, labels);
  const canGoBack = previousRecoveryStep(state.step) !== null;

  return (
    <AuthScaffold
      testID="forgot-password-screen"
      title={heading.title}
      accentWord={heading.accent}
      subtitle={heading.subtitle}
    >
      <Text textAlign="center" fontSize={12} color="$muted" marginTop={-8}>
        {labels.stepOf(passwordRecoveryStepIndex(state.step), PASSWORD_RECOVERY_STEP_COUNT)}
      </Text>

      {state.step === 'CHANNEL' ? (
        <RecoveryChannelStep
          key={state.channel}
          channel={state.channel}
          labels={labels}
          defaultValues={state.draft}
          busy={busy.requesting}
          notFound={notFound}
          notSent={notSent}
          onChannel={recovery.setChannel}
          onSend={(draft) => {
            recovery.sendCode(draft).catch(() => undefined);
          }}
        />
      ) : null}

      {state.step === 'CODE' ? (
        <RecoveryCodeStep
          labels={labels}
          destination={recoveryDestination(state.channel, state.draft)}
          expiresInMinutes={expiresInMinutes}
          testCode={testCode}
          busy={busy.verifying}
          resending={busy.requesting}
          resendIn={resendIn}
          onVerify={(otp) => {
            recovery.submitCode(otp).catch(() => undefined);
          }}
          onResend={() => {
            recovery.sendCode(state.draft).catch(() => undefined);
          }}
        />
      ) : null}

      {state.step === 'PASSWORD' ? (
        <RecoveryPasswordStep
          labels={labels}
          busy={busy.saving}
          onSave={(password) => {
            recovery.submitPassword(password).catch(() => undefined);
          }}
        />
      ) : null}

      {error ? (
        <Text fontSize={14} color="$danger" testID="recovery-error">
          {error}
        </Text>
      ) : null}

      {notFound && state.step === 'CHANNEL' ? (
        <YStack gap={8} alignItems="center">
          <Text fontSize={14} color="$muted">
            {labels.newToDuncit}
          </Text>
          <PrimaryButton
            testID="recovery-create-account"
            label={labels.createAccount}
            onPress={() => navigation.navigate('Signup')}
          />
        </YStack>
      ) : null}

      <YStack gap={8} alignItems="center">
        {canGoBack ? (
          <Text
            testID="recovery-back"
            pressStyle={PRESS_STYLE.inline}
            fontSize={14}
            fontWeight="600"
            color="$primary"
            onPress={recovery.goBack}
          >
            {labels.back}
          </Text>
        ) : null}
        <XStack justifyContent="center" gap={4}>
          <Text fontSize={14} color="$muted">
            {labels.rememberedIt}
          </Text>
          <Text
            testID="recovery-back-login"
            pressStyle={PRESS_STYLE.inline}
            fontSize={14}
            fontWeight="600"
            color="$primary"
            onPress={() => navigation.navigate('Login')}
          >
            {labels.backToLogin}
          </Text>
        </XStack>
      </YStack>
    </AuthScaffold>
  );
}
