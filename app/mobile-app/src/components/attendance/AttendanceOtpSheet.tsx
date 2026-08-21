import { Controller } from 'react-hook-form';
import { Text, XStack, YStack } from 'tamagui';
import {
  OTP_MEDIUMS,
  type OtpMedium,
  type PodAttendanceLabels,
  type PodAttendanceRow,
} from '@duncit/utils';

import { DuncitDialog } from '@/components/DuncitDialog';
import { FormTextField } from '@/components/FormTextField';
import { MediumToggle, PillButton } from '@/components/attendance/AttendanceOtpControls';
import { useAttendanceOtp } from '@/hooks/useAttendanceOtp';

interface Props {
  podId: string;
  row: PodAttendanceRow | null;
  labels: PodAttendanceLabels;
  onClose: () => void;
  onVerified: (challengeId: string) => void;
}

/**
 * Hoisted so the medium pick sits at nesting 0 (Sonar S2004): a selected
 * medium is removed, an unselected one is appended.
 */
function toggleMedium(
  current: readonly OtpMedium[],
  medium: OtpMedium,
  checked: boolean,
): OtpMedium[] {
  if (checked) return current.filter((m) => m !== medium);
  return [...current, medium];
}

/**
 * Prove the attendee before the host marks them — the Tamagui twin of the
 * shared MUI dialog (rule 27).
 *
 * Two steps in one sheet because they are one thought: confirm the name and
 * number the code goes to, then type the code back. Cancel and Verify live in
 * the dialog's pinned footer, so they stay reachable however long the form gets
 * once the code field and any error appear.
 *
 * Nothing is actually delivered yet; the server says so and hands back a test
 * code, which this shows. Everything around it — expiry, attempt limit, single
 * use — is real, so wiring a transport changes nothing on this screen.
 */
export function AttendanceOtpSheet({ podId, row, labels, onClose, onVerified }: Readonly<Props>) {
  const otp = useAttendanceOtp(podId, row, labels);
  const { control } = otp.form;

  const verify = () => {
    otp
      .verify()
      .then((challengeId) => challengeId && onVerified(challengeId))
      .catch(() => undefined);
  };

  const footer = (
    <XStack gap={10}>
      <YStack flex={1}>
        <PillButton
          testID="attendance-otp-cancel"
          label={labels.otpCancel}
          onPress={onClose}
          variant="ghost"
          disabled={false}
        />
      </YStack>
      <YStack flex={1}>
        <PillButton
          testID="attendance-otp-verify"
          label={otp.verifying ? labels.otpVerifying : labels.otpVerify}
          onPress={verify}
          variant="solid"
          disabled={otp.verifying || !otp.challengeId}
        />
      </YStack>
    </XStack>
  );

  return (
    <DuncitDialog
      open={!!row}
      onClose={onClose}
      testID="attendance-otp-sheet"
      title={labels.otpTitle}
      subtitle={labels.otpBody(row?.name ?? '')}
      closeLabel={labels.otpCancel}
      footer={footer}
    >
      <YStack gap={12}>
        <FormTextField control={control} name="name" label={labels.otpName} required />
        <XStack gap={10}>
          <YStack width={118}>
            <FormTextField
              control={control}
              name="extension"
              label={labels.otpExtension}
              keyboardType="phone-pad"
              required
            />
          </YStack>
          <YStack flex={1}>
            <FormTextField
              control={control}
              name="number"
              label={labels.otpPhone}
              keyboardType="number-pad"
              required
            />
          </YStack>
        </XStack>

        <Controller
          control={control}
          name="mediums"
          render={({ field, fieldState }) => (
            <YStack gap={6}>
              <Text fontSize={12} fontWeight="700" color="$color">
                {labels.otpMediumLabel}
              </Text>
              <XStack gap={8}>
                {OTP_MEDIUMS.map((medium) => (
                  <MediumToggle
                    key={medium}
                    label={medium === 'WHATSAPP' ? labels.otpMediumWhatsapp : labels.otpMediumSms}
                    selected={field.value.includes(medium)}
                    onPress={() =>
                      field.onChange(
                        toggleMedium(field.value, medium, field.value.includes(medium)),
                      )
                    }
                  />
                ))}
              </XStack>
              {fieldState.error ? (
                <Text fontSize={12} color="$danger">
                  {fieldState.error.message}
                </Text>
              ) : null}
            </YStack>
          )}
        />

        <PillButton
          testID="attendance-otp-send"
          label={otp.sendLabel}
          onPress={otp.send}
          variant={otp.challengeId ? 'ghost' : 'solid'}
          disabled={otp.sending}
        />
        {otp.error ? (
          <Text fontSize={12} color="$danger">
            {otp.error}
          </Text>
        ) : null}

        {otp.challengeId ? (
          <YStack gap={10}>
            {otp.testCode ? (
              <Text fontSize={12.5} fontWeight="700" color="$success">
                {labels.otpTestCode(otp.testCode)}
              </Text>
            ) : null}
            <FormTextField
              control={control}
              name="code"
              label={labels.otpCode}
              keyboardType="number-pad"
              maxLength={6}
              required
            />
          </YStack>
        ) : null}
      </YStack>
    </DuncitDialog>
  );
}
