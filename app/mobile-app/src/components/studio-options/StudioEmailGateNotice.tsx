import { Text, YStack } from 'tamagui';
import { STUDIO_EMAIL_GATE_KEYS } from '@duncit/utils';

import { PrimaryButton } from '@/components/PrimaryButton';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * "Verify your email first": what the Host, Venue and Club Admin studios show
 * while the account's email is unverified. The Studio screen shows it in place
 * of the options (with `onVerify`, its own button), so a deep link or a
 * remembered role cannot get round the gate; the role switcher shows it above
 * its own button. mWeb twin: pages/studio-options/StudioEmailGateNotice.
 */
export function StudioEmailGateNotice({
  testID = 'studio-email-gate',
  onVerify,
}: Readonly<{ testID?: string; onVerify?: () => void }>) {
  const { t } = useTranslation();
  return (
    <YStack
      testID={testID}
      role="alert"
      gap={6}
      padding={16}
      borderRadius={24}
      borderWidth={1}
      borderColor="$danger"
      backgroundColor="$surface"
    >
      <Text fontSize={16} fontWeight="600" color="$color">
        {t(STUDIO_EMAIL_GATE_KEYS.title)}
      </Text>
      <Text fontSize={13} color="$muted" lineHeight={19}>
        {t(STUDIO_EMAIL_GATE_KEYS.body)}
      </Text>
      {onVerify ? (
        <YStack paddingTop={6}>
          <PrimaryButton
            testID={`${testID}-action`}
            label={t(STUDIO_EMAIL_GATE_KEYS.action)}
            onPress={onVerify}
          />
        </YStack>
      ) : null}
    </YStack>
  );
}
