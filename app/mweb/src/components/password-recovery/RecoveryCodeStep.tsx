import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Link, Stack, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { DuncitButton } from '@duncit/buttons';
import type { PasswordRecoveryLabels } from '@duncit/utils';
import RhfTextField from '../../forms/components/RhfTextField';
import { recoveryCodeSchema, type RecoveryCodeValues } from './recovery.types';

interface Props {
  labels: PasswordRecoveryLabels;
  /** Where the code went, named back to the person who asked for it. */
  destination: string;
  /** How long the code lasts, as the server reported it. */
  expiresInMinutes: number;
  /** Echoed back only while no medium could really carry the code. */
  testCode: string | null;
  busy: boolean;
  resending: boolean;
  /** Seconds left on the cooldown; 0 when another code may be asked for. */
  resendIn: number;
  onVerify: (otp: string) => void;
  onResend: () => void;
}

const otpInput = { inputMode: 'numeric' as const, maxLength: 6 };

/**
 * Step two: the code.
 *
 * Its own step rather than a box beside the new password, so a wrong code is
 * reported before anybody has typed a password twice — and so the attempt limit
 * behind it is spent on the thing it is protecting.
 */
export default function RecoveryCodeStep({
  labels,
  destination,
  expiresInMinutes,
  testCode,
  busy,
  resending,
  resendIn,
  onVerify,
  onResend,
}: Readonly<Props>) {
  const {
    control,
    handleSubmit,
    formState: { isValid },
  } = useForm<RecoveryCodeValues, any, RecoveryCodeValues>({
    defaultValues: { otp: '' },
    resolver: zodResolver(recoveryCodeSchema) as unknown as Resolver<
      RecoveryCodeValues,
      any,
      RecoveryCodeValues
    >,
    mode: 'onChange',
  });

  const submit = handleSubmit((values) => onVerify(values.otp));
  const resendLabel = resendIn > 0 ? labels.resendIn(resendIn) : labels.resend;

  return (
    <form noValidate onSubmit={submit}>
      <Stack spacing={1.5}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {labels.codeSubtitle(destination)}
        </Typography>
        {testCode && <Alert severity="info">{labels.testCode(testCode)}</Alert>}
        <RhfTextField
          control={control}
          name="otp"
          label={labels.codeLabel}
          required
          autoFocus
          autoComplete="one-time-code"
          hint={labels.codeExpiry(expiresInMinutes)}
          size="small"
          slotProps={{ inputLabel: { shrink: true }, htmlInput: otpInput }}
        />
        <DuncitButton
          type="submit"
          variant="contained"
          size="large"
          endIcon={<ArrowForwardIcon />}
          disabled={busy || !isValid}
          sx={{ borderRadius: '16px', py: 1.25, fontWeight: 700, textTransform: 'none' }}
        >
          {busy ? labels.verifying : labels.verify}
        </DuncitButton>
        <Stack direction="row" spacing={0.6} sx={{ justifyContent: 'center' }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {labels.didntGetIt}
          </Typography>
          <Link
            component="button"
            type="button"
            onClick={onResend}
            disabled={resending || resendIn > 0}
            underline="hover"
            variant="body2"
          >
            {resending ? labels.resending : resendLabel}
          </Link>
        </Stack>
      </Stack>
    </form>
  );
}
