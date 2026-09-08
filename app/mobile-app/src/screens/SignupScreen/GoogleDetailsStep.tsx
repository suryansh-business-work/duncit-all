import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Text, YStack } from 'tamagui';
import { buildSignupStepperLabels } from '@duncit/utils';
import {
  googleSignupDefaults,
  makeGoogleSignupSchema,
  type GoogleSignupValues,
} from '@duncit/forms/schemas';

import { PrimaryButton } from '@/components/PrimaryButton';
import { DobDateField } from '@/forms/account-edit/DobDateField';
import { WhatsappNumberFields } from '@/forms/signup';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  /** The number, the tick box and the date of birth, on their way to the code step. */
  onSubmit: (values: GoogleSignupValues) => void;
}

/**
 * The Google door's own step. Tamagui twin of mWeb's <GoogleDetailsStep/>.
 *
 * Google proves an address and nothing else — no number a code can go to, and
 * no birthday the joining age can be checked on — so the two things the email
 * form asks on its first two steps are asked here instead, before there is an
 * account, exactly as they are on the other door.
 *
 * Nothing is sent from here: submitting hands the answers to the code step,
 * which asks for the code as it opens.
 */
export function GoogleDetailsStep({ onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const { minSignupAge } = useAppSettings();
  const labels = buildSignupStepperLabels(t);
  const {
    control,
    handleSubmit,
    formState: { isValid },
  } = useForm<GoogleSignupValues, any, GoogleSignupValues>({
    defaultValues: googleSignupDefaults,
    resolver: zodResolver(makeGoogleSignupSchema(t, minSignupAge)) as unknown as Resolver<
      GoogleSignupValues,
      any,
      GoogleSignupValues
    >,
    mode: 'onChange',
  });

  const submit = handleSubmit((values) => onSubmit(values));

  return (
    <YStack gap={16}>
      <Text fontSize={13} color="$muted">
        {labels.detailsSubtitle}
      </Text>
      <WhatsappNumberFields
        control={control}
        names={{
          extension: 'phoneExtension',
          number: 'phoneNumber',
          sameAsMobile: 'whatsappIsMobile',
        }}
      />
      <DobDateField control={control} minAge={minSignupAge} />
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
