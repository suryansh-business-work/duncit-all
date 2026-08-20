import { Controller } from 'react-hook-form';
import { Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, Text, XStack, YStack } from 'tamagui';
import { OTP_MEDIUMS, type PodAttendanceLabels, type PodAttendanceRow } from '@duncit/utils';

import { FormTextField } from '@/components/FormTextField';
import { ModalThemeScope } from '@/components/ModalThemeScope';
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
 * Prove the attendee before the host marks them — the Tamagui twin of the
 * shared MUI dialog (rule 27).
 *
 * Two steps in one sheet because they are one thought: confirm the name and
 * number the code goes to, then type the code back.
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

  return (
    <Modal visible={!!row} transparent animationType="slide" onRequestClose={onClose}>
      <ModalThemeScope>
        <YStack flex={1} justifyContent="flex-end" testID="attendance-otp-sheet">
          <YStack
            role="button"
            aria-label={labels.otpCancel}
            onPress={onClose}
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            backgroundColor="rgba(0,0,0,0.5)"
          />
          <YStack
            backgroundColor="$background"
            borderTopLeftRadius={20}
            borderTopRightRadius={20}
            padding={18}
            maxHeight="88%"
          >
            <SafeAreaView edges={['bottom']}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <YStack gap={12}>
                  <Text fontSize={16} fontWeight="800" color="$color">
                    {labels.otpTitle}
                  </Text>
                  <Text fontSize={12.5} color="$muted" lineHeight={17}>
                    {labels.otpBody(row?.name ?? '')}
                  </Text>

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
                              label={
                                medium === 'WHATSAPP'
                                  ? labels.otpMediumWhatsapp
                                  : labels.otpMediumSms
                              }
                              selected={field.value.includes(medium)}
                              onPress={() =>
                                field.onChange(
                                  field.value.includes(medium)
                                    ? field.value.filter((m: string) => m !== medium)
                                    : [...field.value, medium],
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
                      <PillButton
                        testID="attendance-otp-verify"
                        label={otp.verifying ? labels.otpVerifying : labels.otpVerify}
                        onPress={verify}
                        variant="solid"
                        disabled={otp.verifying}
                      />
                    </YStack>
                  ) : null}

                  <PillButton
                    testID="attendance-otp-cancel"
                    label={labels.otpCancel}
                    onPress={onClose}
                    variant="ghost"
                    disabled={false}
                  />
                </YStack>
              </ScrollView>
            </SafeAreaView>
          </YStack>
        </YStack>
      </ModalThemeScope>
    </Modal>
  );
}
