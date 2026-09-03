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
  /** Leaving without a number. The account exists and is untouched. */
  onSkip: () => void;
}

/**
 * The Google door's number step. Tamagui twin of mWeb's <WhatsappNumberStep/>.
 *
 * Google returns a finished account and no phone number, so the row the email
 * form asks as step two is asked here instead — after the account exists, which
 * is also the only moment `requestWhatsAppOtp` can be called at all.
 *
 * Nothing is sent from here: submitting hands the number to the code step,
 * which asks for the code as it opens.
 */
export function WhatsappNumberStep({ onSubmit, onSkip }: Readonly<Props>) {
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
      <WhatsappNumberFields control={control} />
      <PrimaryButton
        testID="signup-number-continue"
        label={labels.sendCode}
        disabled={!isValid}
        onPress={() => {
          submit().catch(() => undefined);
        }}
      />
      <Text
        testID="signup-skip-number"
        pressStyle={PRESS_STYLE.inline}
        fontSize={14}
        color="$muted"
        textAlign="center"
        onPress={onSkip}
      >
        {labels.skipForNow}
      </Text>
    </YStack>
  );
}
