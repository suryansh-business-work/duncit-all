import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Text, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';
import { buildSignupStepperLabels } from '@duncit/utils';
import {
  makeWhatsappNumberSchema,
  whatsappNumberDefaults,
  type WhatsappNumberValues,
} from '@duncit/forms/schemas';

import { PrimaryButton } from '@/components/PrimaryButton';
import { WhatsappNumberFields } from '@/forms/signup';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  /** The number and the tick box, on their way to the code step. */
  onSubmit: (values: WhatsappNumberValues) => void;
}

/**
 * The Google door's number step. Tamagui twin of mWeb's <WhatsappNumberStep/>.
 *
 * Google proves an address and no phone number, so the row the email form asks
 * as step two is asked here instead — before there is an account, exactly as it
 * is on the other door.
 *
 * Nothing is sent from here: submitting hands the number to the code step,
 * which asks for the code as it opens.
 */
export function WhatsappNumberStep({ onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const labels = buildSignupStepperLabels(t);
  const {
    control,
    handleSubmit,
    formState: { isValid },
  } = useForm<WhatsappNumberValues, any, WhatsappNumberValues>({
    defaultValues: whatsappNumberDefaults,
    resolver: zodResolver(makeWhatsappNumberSchema(t)) as unknown as Resolver<
      WhatsappNumberValues,
      any,
      WhatsappNumberValues
    >,
    mode: 'onChange',
  });

  const submit = handleSubmit((values) => onSubmit(values));

  return (
    <YStack gap={16}>
      <Text fontSize={13} color="$muted">
        {labels.numberSubtitle}
      </Text>
      <WhatsappNumberFields
        control={control}
        names={{
          extension: 'phoneExtension',
          number: 'phoneNumber',
          sameAsMobile: 'whatsappIsMobile',
        }}
      />
      <PrimaryButton
        testID="signup-number-continue"
        label={labels.sendCode}
        disabled={!isValid}
        onPress={() => {
          submit().catch(() => undefined);
        }}
      />
    </YStack>
  );
}
