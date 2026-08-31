import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Text, XStack, YStack } from 'tamagui';
import {
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
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  channel: ContactChannel;
  labels: ContactChangeLabels;
  defaultValues: ContactDraft;
  busy: boolean;
  onSend: (draft: ContactDraft) => void;
}

/**
 * Step one: the new address or number. Tamagui twin of mWeb's
 * <ContactValueStep/>.
 *
 * A real form (rule 10) rather than a bare box, because this is the value a
 * code is about to be sent to — a typo caught here costs nothing, and one
 * caught after the send costs the person a wait and a wasted code.
 */
export function ContactValueStep({
  channel,
  labels,
  defaultValues,
  busy,
  onSend,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const copy = labels.channel(channel);
  const {
    control,
    handleSubmit,
    formState: { isValid },
  } = useForm<ContactValueValues, any, ContactValueValues>({
    defaultValues,
    resolver: zodResolver(makeContactValueSchema(channel)) as unknown as Resolver<
      ContactValueValues,
      any,
      ContactValueValues
    >,
    mode: 'onChange',
  });

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
              keyboardType="phone-pad"
              digitsOnly
              maxLength={15}
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
        />
      )}
      <PrimaryButton
        testID="contact-change-send"
        label={busy ? labels.sending : labels.sendCode}
        loading={busy}
        disabled={busy || !isValid}
        onPress={submit}
      />
    </YStack>
  );
}
