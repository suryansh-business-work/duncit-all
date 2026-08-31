import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Text, XStack, YStack } from 'tamagui';
import type { ContactChangeLabels } from '@duncit/utils';

import { FormTextField } from '@/components/FormTextField';
import { PrimaryButton } from '@/components/PrimaryButton';
import {
  contactOtpSchema,
  type ContactOtpValues,
} from '@/forms/contact-change/contact-change.types';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  labels: ContactChangeLabels;
  /** Where the live code went, named back to the person who asked for it. */
  sentTo: string;
  /** Echoed back only while no transport is wired for this channel. */
  testCode: string | null;
  busy: boolean;
  onVerify: (otp: string) => void;
  onEditValue: () => void;
}

/**
 * Step two: the code that proves the value typed in step one. Tamagui twin of
 * mWeb's <ContactOtpStep/>.
 *
 * "Change this" goes back rather than closing, because the commonest reason a
 * code never arrives is that the number was wrong — and a sheet that can only
 * be abandoned makes the person start the whole thing again.
 */
export function ContactOtpStep({
  labels,
  sentTo,
  testCode,
  busy,
  onVerify,
  onEditValue,
}: Readonly<Props>) {
  const {
    control,
    handleSubmit,
    formState: { isValid },
  } = useForm<ContactOtpValues, any, ContactOtpValues>({
    defaultValues: { otp: '' },
    resolver: zodResolver(contactOtpSchema) as unknown as Resolver<
      ContactOtpValues,
      any,
      ContactOtpValues
    >,
    mode: 'onChange',
  });

  const submit = handleSubmit((values) => onVerify(values.otp));

  return (
    <YStack gap={12}>
      <Text fontSize={13} color="$muted">
        {labels.codeSentTo(sentTo)}
      </Text>
      {testCode ? (
        <Text fontSize={13} fontWeight="600" color="$color" testID="contact-change-test-code">
          {labels.testCode(testCode)}
        </Text>
      ) : null}
      <FormTextField
        control={control}
        name="otp"
        label={labels.codeLabel}
        keyboardType="number-pad"
        digitsOnly
        maxLength={6}
      />
      <XStack gap={12}>
        <YStack flex={1}>
          <XStack
            testID="contact-change-edit"
            role="button"
            aria-label={labels.editValue}
            onPress={onEditValue}
            height={46}
            alignItems="center"
            justifyContent="center"
            borderRadius={12}
            borderWidth={1}
            borderColor="$borderColor"
            pressStyle={PRESS_STYLE.control}
          >
            <Text fontSize={14} fontWeight="600" color="$color">
              {labels.editValue}
            </Text>
          </XStack>
        </YStack>
        <YStack flex={1}>
          <PrimaryButton
            testID="contact-change-verify"
            label={busy ? labels.verifying : labels.verifyAndSave}
            loading={busy}
            disabled={busy || !isValid}
            onPress={submit}
          />
        </YStack>
      </XStack>
    </YStack>
  );
}
