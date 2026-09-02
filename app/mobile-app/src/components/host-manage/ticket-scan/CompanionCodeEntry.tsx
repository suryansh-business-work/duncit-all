import { Input, Text, XStack, YStack } from 'tamagui';

import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  index: number;
  code: string;
  onCodeChange: (next: string) => void;
  /** Echoed back only while nothing can really carry the code. */
  testCode: string;
  verifying: boolean;
  onVerify: () => void;
  onCancel: () => void;
}

/**
 * The code box and its two buttons, shown once this row's code is out.
 *
 * Split from CompanionOtpPanel for the same reason as the send CTA: it carried
 * four of the panel's inline conditionals, which together broke S3776.
 */
export function CompanionCodeEntry({
  index,
  code,
  onCodeChange,
  testCode,
  verifying,
  onVerify,
  onCancel,
}: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <YStack gap={6}>
      {testCode ? (
        <Text fontSize={12} fontWeight="700" color="$success">
          {t('mweb.attendance.otpTestCode', { vars: { code: testCode } })}
        </Text>
      ) : null}
      <Text fontSize={11.5} color="$muted">
        {t('mweb.attendance.otpCode')}
      </Text>
      <Input
        testID={`companion-otp-code-${index}`}
        value={code}
        onChangeText={onCodeChange}
        placeholder={t('mweb.attendance.otpCode')}
        keyboardType="number-pad"
        maxLength={6}
        size="$4"
      />
      <XStack gap={8}>
        <XStack
          testID={`companion-otp-verify-${index}`}
          role="button"
          aria-label={t('mweb.attendance.otpVerify')}
          aria-disabled={verifying}
          onPress={verifying ? undefined : onVerify}
          height={38}
          paddingHorizontal={18}
          alignItems="center"
          justifyContent="center"
          borderRadius={999}
          backgroundColor="$primary"
          opacity={verifying ? 0.7 : 1}
          pressStyle={PRESS_STYLE.control}
        >
          <Text fontSize={12.5} fontWeight="800" color="$onPrimary">
            {verifying ? t('mweb.attendance.otpVerifying') : t('mweb.attendance.otpVerify')}
          </Text>
        </XStack>
        <XStack
          testID={`companion-otp-cancel-${index}`}
          role="button"
          aria-label={t('mweb.attendance.otpCancel')}
          onPress={onCancel}
          height={38}
          paddingHorizontal={18}
          alignItems="center"
          justifyContent="center"
          borderRadius={999}
          borderWidth={1}
          borderColor="$borderColor"
          pressStyle={PRESS_STYLE.ghost}
        >
          <Text fontSize={12.5} fontWeight="700" color="$color">
            {t('mweb.attendance.otpCancel')}
          </Text>
        </XStack>
      </XStack>
    </YStack>
  );
}
