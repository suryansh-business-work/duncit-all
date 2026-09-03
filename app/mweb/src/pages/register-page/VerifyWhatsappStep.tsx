import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Link, Stack, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { DuncitButton } from '@duncit/buttons';
import { buildSignupStepperLabels } from '@duncit/utils';
import { makeContactOtpSchema, type ContactOtpValues } from '@duncit/forms/schemas';
import RhfTextField from '../../forms/components/RhfTextField';
import { useTranslation } from '../../i18n/useTranslation';
import { parseApiError } from '../../utils/parseApiError';
import { REQUEST_OTP, SKIP, VERIFY_OTP } from '../signup-whatsapp-page/queries';

interface Props {
  /** The dial code and number the step before this one settled. */
  extension: string;
  number: string;
  /**
   * The signup tick box. A proven number is written to the account's phone as
   * well when it is on; when it is off the profile phone stays blank, because
   * the person has said their mobile number is a different one.
   */
  alsoMobile: boolean;
  /** Where a verified — or skipped — number leads. */
  onDone: () => void;
}

const otpInput = { inputMode: 'numeric' as const, maxLength: 6 };

/**
 * Step four — the WhatsApp code.
 *
 * It can only run here, after `register`: both mutations authenticate the
 * caller, so the account has to exist before a code can be asked for. The
 * token is already stored by the time this mounts, which is what makes them
 * authorised without the person having "logged in" yet.
 *
 * Skipping is allowed and leaves the account exactly as it is — the number is
 * simply unverified, which is what `skipWhatsAppOtp` records.
 */
export default function VerifyWhatsappStep({
  extension,
  number,
  alsoMobile,
  onDone,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const labels = buildSignupStepperLabels(t);
  const [requestOtp, { loading: sending }] = useMutation<any>(REQUEST_OTP);
  const [verifyOtp, { loading: verifying }] = useMutation<any>(VERIFY_OTP);
  const [skip] = useMutation<any>(SKIP);
  const [error, setError] = useState<string | null>(null);
  const [testCode, setTestCode] = useState<string | null>(null);
  /** The first send is automatic; this stops React's double-effect sending twice. */
  const asked = useRef(false);

  const {
    control,
    handleSubmit,
    formState: { isValid },
  } = useForm<ContactOtpValues, any, ContactOtpValues>({
    defaultValues: { otp: '' },
    resolver: zodResolver(makeContactOtpSchema(t)) as unknown as Resolver<
      ContactOtpValues,
      any,
      ContactOtpValues
    >,
    mode: 'onChange',
  });

  const send = async () => {
    setError(null);
    try {
      const res = await requestOtp({ variables: { ext: extension, num: number } });
      setTestCode(res.data?.requestWhatsAppOtp?.dev_otp ?? null);
    } catch (e) {
      setError(parseApiError(e));
    }
  };

  /* The code goes out as the step opens: the person has just typed the number
     two steps ago, so making them press "Send" first is a click that asks
     nothing. */
  useEffect(() => {
    if (asked.current) return;
    asked.current = true;
    send().catch(() => undefined);
    // Deliberately once per mount — `send` closes over the number, which does
    // not change while this step is showing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = handleSubmit(async (values) => {
    setError(null);
    try {
      await verifyOtp({
        variables: { ext: extension, num: number, otp: values.otp, alsoMobile },
      });
      onDone();
    } catch (e) {
      setError(parseApiError(e));
    }
  });

  const skipStep = async () => {
    // A failure here changes nothing about the account, so the person is let
    // through either way rather than trapped on a step they chose to leave.
    await skip().catch(() => undefined);
    onDone();
  };

  return (
    <form noValidate onSubmit={submit}>
      <Stack spacing={1.5}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {labels.codeSentTo(`${extension} ${number}`.trim())}
        </Typography>
        {testCode && <Alert severity="info">{labels.testCode(testCode)}</Alert>}
        <RhfTextField
          control={control}
          name="otp"
          label={t('mweb.resetPassword.otpLabel')}
          required
          autoFocus
          autoComplete="one-time-code"
          size="small"
          slotProps={{ inputLabel: { shrink: true }, htmlInput: otpInput }}
        />
        {error && <Alert severity="error">{error}</Alert>}
        <DuncitButton
          type="submit"
          variant="contained"
          fullWidth
          disabled={verifying || !isValid}
          endIcon={<ArrowForwardIcon />}
          data-testid="signup-verify"
        >
          {verifying ? labels.verifying : labels.verify}
        </DuncitButton>
        <Stack direction="row" spacing={0.6} sx={{ justifyContent: 'center' }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {labels.didntGetIt}
          </Typography>
          <Link
            component="button"
            type="button"
            disabled={sending}
            onClick={() => {
              send().catch(() => undefined);
            }}
            underline="hover"
            variant="body2"
          >
            {sending ? labels.sending : labels.resend}
          </Link>
        </Stack>
        <Link
          component="button"
          type="button"
          onClick={() => {
            skipStep().catch(() => undefined);
          }}
          underline="hover"
          variant="body2"
          data-testid="signup-skip-whatsapp"
          sx={{ alignSelf: 'center' }}
        >
          {labels.skipForNow}
        </Link>
      </Stack>
    </form>
  );
}
