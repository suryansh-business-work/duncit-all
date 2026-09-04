import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stack, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { DuncitButton } from '@duncit/buttons';
import { buildSignupStepperLabels } from '@duncit/utils';
import {
  makeWhatsappNumberSchema,
  whatsappNumberDefaults,
  type WhatsappNumberValues,
} from '@duncit/forms/schemas';
import WhatsappNumberFields from '../../forms/register/WhatsappNumberFields';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  /** The number and the tick box, on their way to the code step. */
  onSubmit: (values: WhatsappNumberValues) => void;
}

/**
 * The Google door's number step.
 *
 * Google proves an address and no phone number, so the row the email form asks
 * as step two is asked here instead — before there is an account, exactly as it
 * is on the other door.
 *
 * Nothing is sent from here: submitting hands the number to the code step,
 * which asks for the code as it opens. RN twin:
 * app/mobile-app/src/screens/SignupScreen/WhatsappNumberStep.tsx.
 */
export default function WhatsappNumberStep({ onSubmit }: Readonly<Props>) {
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
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        submit().catch(() => undefined);
      }}
    >
      <Stack spacing={1.5}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {labels.numberSubtitle}
        </Typography>
        <WhatsappNumberFields
          control={control}
          names={{
            extension: 'phoneExtension',
            number: 'phoneNumber',
            sameAsMobile: 'whatsappIsMobile',
          }}
        />
        <DuncitButton
          type="submit"
          variant="contained"
          fullWidth
          disabled={!isValid}
          endIcon={<ArrowForwardIcon />}
          data-testid="signup-number-continue"
        >
          {labels.sendCode}
        </DuncitButton>
      </Stack>
    </form>
  );
}
