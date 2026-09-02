import { useState } from 'react';
import { Input, Text, XStack, YStack } from 'tamagui';
import type { CompanionEntry, CompanionOtpState } from '@duncit/utils';

import { useTranslation } from '@/hooks/useTranslation';
import type { CompanionOtpApi } from '@/hooks/useCompanionOtp';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  index: number;
  entry: CompanionEntry;
  state: CompanionOtpState;
  otp: CompanionOtpApi;
  onVerified: (challengeId: string) => void;
}

/**
 * One companion's WhatsApp code — sent, then read back. The Tamagui twin of
 * mWeb's CompanionOtpPanel (rule 27), word for word through the shared bundle.
 *
 * Optional by design: an attendee whose phone is dead or abroad must still be
 * able to walk in, so this proves the people it can and records which ones
 * those were. What it must NOT do is prove two people at once, which is why the
 * button is dead on every other row while a code is live.
 */
export function CompanionOtpPanel({ index, entry, state, otp, onVerified }: Readonly<Props>) {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const live = otp.activeIndex === index;
  const sent = live && !!otp.challengeId;

  if (state === 'VERIFIED') {
    return (
      <Text testID={`companion-verified-${index}`} fontSize={12} fontWeight="700" color="$success">
        {t('mweb.hostScan.companionVerified')}
      </Text>
    );
  }

  const check = () => {
    otp
      .submit(code)
      .then((challengeId) => challengeId && onVerified(challengeId))
      .catch(() => undefined);
  };

  // Hoisted out of the JSX so the three-way choice sits at nesting 0 (S3358).
  let sendLabel = t('mweb.hostScan.companionVerifyCta');
  if (otp.sending && live) sendLabel = t('mweb.attendance.otpSending');
  else if (sent) sendLabel = t('mweb.attendance.otpResend');

  return (
    <YStack gap={6}>
      <Text fontSize={11.5} color="$muted">
        {state === 'BLOCKED'
          ? t('mweb.hostScan.companionOtpBlocked')
          : t('mweb.hostScan.companionOtpHint')}
      </Text>
      <XStack
        testID={`companion-otp-send-${index}`}
        role="button"
        aria-label={t('mweb.hostScan.companionVerifyCta')}
        aria-disabled={state !== 'READY'}
        onPress={
          state === 'READY'
            ? () => {
                setCode('');
                otp.start(index, entry);
              }
            : undefined
        }
        alignSelf="flex-start"
        height={36}
        paddingHorizontal={14}
        alignItems="center"
        justifyContent="center"
        borderRadius={999}
        borderWidth={1}
        borderColor="$borderColor"
        opacity={state === 'READY' ? 1 : 0.55}
        pressStyle={PRESS_STYLE.ghost}
      >
        <Text fontSize={12.5} fontWeight="700" color="$color">
          {sendLabel}
        </Text>
      </XStack>

      {sent ? (
        <YStack gap={6}>
          {otp.testCode ? (
            <Text fontSize={12} fontWeight="700" color="$success">
              {t('mweb.attendance.otpTestCode', { vars: { code: otp.testCode } })}
            </Text>
          ) : null}
          <Text fontSize={11.5} color="$muted">
            {t('mweb.attendance.otpCode')}
          </Text>
          <Input
            testID={`companion-otp-code-${index}`}
            value={code}
            onChangeText={setCode}
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
              aria-disabled={otp.verifying}
              onPress={otp.verifying ? undefined : check}
              height={38}
              paddingHorizontal={18}
              alignItems="center"
              justifyContent="center"
              borderRadius={999}
              backgroundColor="$primary"
              opacity={otp.verifying ? 0.7 : 1}
              pressStyle={PRESS_STYLE.control}
            >
              <Text fontSize={12.5} fontWeight="800" color="$onPrimary">
                {otp.verifying ? t('mweb.attendance.otpVerifying') : t('mweb.attendance.otpVerify')}
              </Text>
            </XStack>
            <XStack
              testID={`companion-otp-cancel-${index}`}
              role="button"
              aria-label={t('mweb.attendance.otpCancel')}
              onPress={otp.cancel}
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
      ) : null}

      {live && otp.error ? (
        <Text testID={`companion-otp-error-${index}`} fontSize={12} color="$danger">
          {otp.error}
        </Text>
      ) : null}
    </YStack>
  );
}
