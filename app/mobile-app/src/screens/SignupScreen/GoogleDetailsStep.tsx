import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Text, YStack } from 'tamagui';
import {
  buildSignupStepperLabels,
  signupContactsBlockContinue,
  SOCIAL_AUTH_COPY,
  type SocialProvider,
} from '@duncit/utils';
import {
  googleSignupDefaults,
  makeGoogleSignupSchema,
  WHATSAPP_NUMBER_NAMES,
  type GoogleSignupValues,
} from '@duncit/forms/schemas';

import { FormTextField } from '@/components/FormTextField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { DobDateField } from '@/forms/account-edit/DobDateField';
import { WhatsappNumberFields } from '@/forms/signup';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useSignupPhoneCheck } from '@/hooks/useSignupContactCheck';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  /** Which door this step is finishing — the subtitle names it. */
  provider: SocialProvider;
  /** Apple carried no name on this attempt, so the step asks it. */
  askName: boolean;
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
 * Apple rides the same step, and asks the name as well when Apple did not share
 * one this time — it only ever shares it on the first authorisation.
 *
 * Nothing is sent from here: submitting hands the answers to the code step,
 * which asks for the code as it opens.
 */
export function GoogleDetailsStep({ provider, askName, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const { minSignupAge } = useAppSettings();
  const labels = buildSignupStepperLabels(t);
  const {
    control,
    handleSubmit,
    formState: { isValid },
  } = useForm<GoogleSignupValues, any, GoogleSignupValues>({
    defaultValues: googleSignupDefaults,
    resolver: zodResolver(makeGoogleSignupSchema(t, minSignupAge, askName)) as unknown as Resolver<
      GoogleSignupValues,
      any,
      GoogleSignupValues
    >,
    mode: 'onChange',
  });

  const submit = handleSubmit((values) => onSubmit(values));

  // The number asks the server as it is typed — a taken one is a correction
  // here, not a refusal after a code has gone out — and Send code waits on it.
  const phoneStatus = useSignupPhoneCheck(control, WHATSAPP_NUMBER_NAMES);
  const blocked = signupContactsBlockContinue([phoneStatus]);

  return (
    <YStack gap={16}>
      <Text fontSize={14} color="$muted">
        {t(SOCIAL_AUTH_COPY[provider].detailsSubtitle)}
      </Text>
      {askName ? (
        <FormTextField
          control={control}
          name="name"
          label={t('mweb.signup.nameLabel')}
          placeholder={t('mweb.signup.namePlaceholder')}
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
          required
        />
      ) : null}
      <WhatsappNumberFields
        control={control}
        names={WHATSAPP_NUMBER_NAMES}
        phoneStatus={phoneStatus}
      />
      <DobDateField control={control} minAge={minSignupAge} />
      <PrimaryButton
        testID="signup-number-continue"
        label={labels.sendCode}
        disabled={!isValid || blocked}
        onPress={() => {
          if (blocked) return;
          submit().catch(() => undefined);
        }}
      />
    </YStack>
  );
}
