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
import { REQUEST_SIGNUP_OTP, VERIFY_SIGNUP_OTP } from './queries';

interface Props {
  /** The dial code and number the step before this one settled. */
  extension: string;
  number: string;
  /** The address the same signup is about to use, checked alongside the number. */
  email?: string;
  /** True while the proof is being spent on the account. */
  creating: boolean;
  /** The proof of the number, on its way to the door that creates the account. */
  onVerified: (whatsappToken: string) => void;
}

const otpInput = { inputMode: 'numeric' as const, maxLength: 6 };

/**
 * Step four — the WhatsApp code, and the end of signup.
 *
 * Both mutations here are PUBLIC, because there is no account yet: this step is
 * what decides whether there will be one. Proving the code returns a one-shot
 * token, and the flow spends it on `register` (or `signupWithGoogle`) straight
 * away. There is deliberately no way past this screen — leaving it leaves
 * nothing behind, which is the point.
 */
export default function VerifyWhatsappStep({
  extension,
  number,
  email,
  creating,
  onVerified,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const labels = buildSignupStepperLabels(t);
  const [requestOtp, { loading: sending }] = useMutation<any>(REQUEST_SIGNUP_OTP);
  const [verifyOtp, { loading: proving }] = useMutation<any>(VERIFY_SIGNUP_OTP);
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
      const res = await requestOtp({
        variables: { ext: extension, num: number, email: email ?? null },
      });
      setTestCode(res.data?.requestSignupWhatsAppOtp?.dev_otp ?? null);
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
      const res = await verifyOtp({
        variables: { ext: extension, num: number, otp: values.otp },
      });
      const proof = res.data?.verifySignupWhatsAppOtp?.whatsapp_token;
      if (proof) onVerified(proof);
    } catch (e) {
      setError(parseApiError(e));
    }
  });

  const busy = proving || creating;
  // Decided above the JSX (S3358): proving the code and spending it are two
  // waits in a row, and they say different things.
  let buttonLabel = labels.verify;
  if (proving) buttonLabel = labels.verifying;
  else if (creating) buttonLabel = labels.creating;

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
          disabled={busy || !isValid}
          endIcon={<ArrowForwardIcon />}
          data-testid="signup-verify"
        >
          {buttonLabel}
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
      </Stack>
    </form>
  );
}
