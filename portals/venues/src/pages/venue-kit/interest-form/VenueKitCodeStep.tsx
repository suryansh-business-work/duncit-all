import { Alert, Stack, TextField } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { toDigits } from '@duncit/regex';
import { useTranslation } from '@duncit/shell';

interface VenueKitCodeStepProps {
  /** What the last code request said: where it went, or the test code. */
  note: string;
  value: string;
  error?: string;
  onChange: (code: string) => void;
  onVerify: () => void;
  onResend: () => void;
  verifying: boolean;
  resending: boolean;
  verifyLabel: string;
  testId: string;
}

/** One "type the code we sent" row: the note, a six-digit box, Verify and Send a new code. */
export default function VenueKitCodeStep(props: Readonly<VenueKitCodeStepProps>) {
  const { t } = useTranslation();
  const { note, value, error, onChange, onVerify, onResend, verifying, resending, verifyLabel, testId } = props;
  return (
    <Stack spacing={1.5}>
      <Alert severity="info" role="status">
        {note}
      </Alert>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'flex-start' } }}>
        <TextField
          size="small"
          label={t('venueKit.form.codeLabel')}
          value={value}
          onChange={(event) => onChange(toDigits(event.target.value).slice(0, 6))}
          autoComplete="one-time-code"
          error={Boolean(error)}
          helperText={error}
          slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 6, 'data-testid': `${testId}-input` } }}
        />
        <DuncitButton variant="contained" onClick={onVerify} loading={verifying} data-testid={`${testId}-verify`}>
          {verifyLabel}
        </DuncitButton>
        <DuncitButton variant="text" onClick={onResend} loading={resending} data-testid={`${testId}-resend`}>
          {t('venueKit.form.resend')}
        </DuncitButton>
      </Stack>
    </Stack>
  );
}
