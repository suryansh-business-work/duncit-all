import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stack, Typography } from '@mui/material';
import PersonOutlineIcon from '@mui/icons-material/PersonOutlined';
import { DuncitButton } from '@duncit/buttons';
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
import DobDateField from '../../components/DobDateField';
import RhfTextField from '../../forms/components/RhfTextField';
import { startIcon } from '../../forms/register/fieldProps';
import WhatsappNumberFields from '../../forms/register/WhatsappNumberFields';
import { useSignupPhoneCheck } from '../../forms/register/useSignupContactCheck';
import { useTranslation } from '../../i18n/useTranslation';
import { useMinSignupAge } from '../../utils/dateFormat';

interface Props {
  /** Which door this step is finishing — the subtitle names it. */
  provider: SocialProvider;
  /** Apple carried no name on this attempt, so the step asks it. */
  askName: boolean;
  /** The number, the tick box and the date of birth, on their way to the code step. */
  onSubmit: (values: GoogleSignupValues) => void;
}

/**
 * The Google door's own step.
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
 * which asks for the code as it opens. RN twin:
 * app/mobile-app/src/screens/SignupScreen/GoogleDetailsStep.tsx.
 */
export default function GoogleDetailsStep({ provider, askName, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const minAge = useMinSignupAge();
  const labels = buildSignupStepperLabels(t);
  const {
    control,
    handleSubmit,
    formState: { isValid },
  } = useForm<GoogleSignupValues, any, GoogleSignupValues>({
    defaultValues: googleSignupDefaults,
    resolver: zodResolver(makeGoogleSignupSchema(t, minAge, askName)) as unknown as Resolver<
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
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (blocked) return;
        submit().catch(() => undefined);
      }}
    >
      <Stack spacing={2}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t(SOCIAL_AUTH_COPY[provider].detailsSubtitle)}
        </Typography>
        {askName && (
          <RhfTextField
            control={control}
            name="name"
            label={t('mweb.signup.nameLabel')}
            required
            placeholder={t('mweb.signup.namePlaceholder')}
            autoComplete="name"
            size="small"
            slotProps={{
              inputLabel: { shrink: true },
              input: startIcon(<PersonOutlineIcon fontSize="small" />),
            }}
          />
        )}
        <WhatsappNumberFields
          control={control}
          names={WHATSAPP_NUMBER_NAMES}
          phoneStatus={phoneStatus}
        />
        <DobDateField control={control} minAge={minAge} required />
        <DuncitButton
          type="submit"
          variant="contained"
          size="large"
          fullWidth
          disabled={!isValid || blocked}
          data-testid="signup-number-continue"
        >
          {labels.sendCode}
        </DuncitButton>
      </Stack>
    </form>
  );
}
