import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stack, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { DuncitButton } from '@duncit/buttons';
import { buildSignupStepperLabels, signupContactsBlockContinue } from '@duncit/utils';
import {
  googleSignupDefaults,
  makeGoogleSignupSchema,
  WHATSAPP_NUMBER_NAMES,
  type GoogleSignupValues,
} from '@duncit/forms/schemas';
import DobDateField from '../../components/DobDateField';
import WhatsappNumberFields from '../../forms/register/WhatsappNumberFields';
import { useSignupPhoneCheck } from '../../forms/register/useSignupContactCheck';
import { useTranslation } from '../../i18n/useTranslation';
import { useMinSignupAge } from '../../utils/dateFormat';

interface Props {
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
 * Nothing is sent from here: submitting hands the answers to the code step,
 * which asks for the code as it opens. RN twin:
 * app/mobile-app/src/screens/SignupScreen/GoogleDetailsStep.tsx.
 */
export default function GoogleDetailsStep({ onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const minAge = useMinSignupAge();
  const labels = buildSignupStepperLabels(t);
  const {
    control,
    handleSubmit,
    formState: { isValid },
  } = useForm<GoogleSignupValues, any, GoogleSignupValues>({
    defaultValues: googleSignupDefaults,
    resolver: zodResolver(makeGoogleSignupSchema(t, minAge)) as unknown as Resolver<
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
      <Stack spacing={1.5}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {labels.detailsSubtitle}
        </Typography>
        <WhatsappNumberFields
          control={control}
          names={WHATSAPP_NUMBER_NAMES}
          phoneStatus={phoneStatus}
        />
        <DobDateField control={control} minAge={minAge} required />
        <DuncitButton
          type="submit"
          variant="contained"
          fullWidth
          disabled={!isValid || blocked}
          endIcon={<ArrowForwardIcon />}
          data-testid="signup-number-continue"
        >
          {labels.sendCode}
        </DuncitButton>
      </Stack>
    </form>
  );
}
