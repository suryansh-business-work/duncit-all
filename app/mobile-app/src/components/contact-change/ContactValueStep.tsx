import { formResolver } from '../../utils/form-resolver';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Text, XStack, YStack } from 'tamagui';
import {
  CONTACT_NUMBER_FIELDS,
  contactValueStepView,
  isPhoneChannel,
  type ContactChangeLabels,
  type ContactChannel,
  type ContactDraft,
} from '@duncit/utils';

import { FormTextField } from '@/components/FormTextField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { CountryCodeField } from '@/forms/components/CountryCodeField';
import {
  makeContactValueSchema,
  type ContactValueValues,
} from '@/forms/contact-change/contact-change.types';
import { useSignupPhoneCheck } from '@/hooks/useSignupContactCheck';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  channel: ContactChannel;
  labels: ContactChangeLabels;
  defaultValues: ContactDraft;
  busy: boolean;
  /** A refusal of the typed value is showing — resending it would only repeat it. */
  blocked: boolean;
  /** May be async: the contact number is stored by this very submit. */
  onSend: (draft: ContactDraft) => void | Promise<void>;
  /** Told on every edit, so a refusal about the old value can be dropped. */
  onEdit: () => void;
}

/**
 * Step one: the new address or number. Tamagui twin of mWeb's
 * <ContactValueStep/>.
 *
 * A real form (rule 10) rather than a bare box: on the two channels that send
 * a code, a typo caught here costs nothing and one caught after the send costs
 * the person a wait and a wasted code — and on the contact number, which is
 * stored the moment this button is pressed, this form is the only thing
 * between a mistyped digit and the account.
 */
export function ContactValueStep({
  channel,
  labels,
  defaultValues,
  busy,
  blocked,
  onSend,
  onEdit,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const copy = labels.channel(channel);
  const {
    control,
    handleSubmit,
    watch,
    formState: { isValid },
  } = useForm<ContactValueValues, any, ContactValueValues>({
    defaultValues,
    resolver: formResolver<ContactValueValues>(makeContactValueSchema(channel)),
    mode: 'onChange',
  });

  useEffect(() => {
    const sub = watch(onEdit);
    return () => sub.unsubscribe();
  }, [watch, onEdit]);

  // Asked as the number is typed, so a number another account already holds is
  // a warning beside the box and a shut button — not a refusal after the press.
  // The EMAIL box leaves `number` blank, which never leaves the device.
  const numberStatus = useSignupPhoneCheck(control, CONTACT_NUMBER_FIELDS);
  const view = contactValueStepView(channel, labels, { busy, blocked, isValid, numberStatus });
  const submit = handleSubmit(onSend);

  return (
    <YStack gap={12}>
      <Text fontSize={13} color="$muted">
        {copy.changeHint}
      </Text>
      {isPhoneChannel(channel) ? (
        <XStack gap={12} alignItems="flex-end">
          <YStack width={120}>
            <CountryCodeField
              control={control}
              name="extension"
              label={t('mweb.common.code')}
              testID="contact-change-code"
            />
          </YStack>
          <YStack flex={1}>
            <FormTextField
              control={control}
              name="number"
              label={copy.fieldLabel}
              hint={view.numberLines.hint}
              errorText={view.numberLines.error}
              keyboardType="phone-pad"
              autoComplete="tel-national"
              textContentType="telephoneNumber"
              digitsOnly
              maxLength={15}
              required
            />
          </YStack>
        </XStack>
      ) : (
        <FormTextField
          control={control}
          name="email"
          label={copy.fieldLabel}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          required
        />
      )}
      <PrimaryButton
        testID="contact-change-send"
        label={view.buttonLabel}
        loading={busy}
        disabled={view.disabled}
        onPress={submit}
      />
    </YStack>
  );
}
