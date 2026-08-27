import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import type { ContactChangeLabels } from '@duncit/utils';
import RhfTextField from '../../../forms/components/RhfTextField';
import { contactOtpSchema, type ContactOtpValues } from './contact-change.types';

interface Props {
  labels: ContactChangeLabels;
  /** Where the live code went, named back to the person who asked for it. */
  sentTo: string;
  /** Echoed back only while no transport is wired for this channel. */
  testCode: string | null;
  busy: boolean;
  onVerify: (otp: string) => void;
  onEditValue: () => void;
}

const otpInput = { inputMode: 'numeric' as const, maxLength: 6 };

/**
 * Step two: the code that proves the value typed in step one.
 *
 * "Change this" goes back rather than closing, because the commonest reason a
 * code never arrives is that the number was wrong — and a dialog that can only
 * be abandoned makes the person start the whole thing again.
 */
export default function ContactOtpStep({
  labels,
  sentTo,
  testCode,
  busy,
  onVerify,
  onEditValue,
}: Readonly<Props>) {
  const {
    control,
    handleSubmit,
    formState: { isValid },
  } = useForm<ContactOtpValues>({
    defaultValues: { otp: '' },
    resolver: zodResolver(contactOtpSchema),
    mode: 'onChange',
  });

  const submit = handleSubmit((values) => onVerify(values.otp));

  return (
    <form noValidate onSubmit={submit}>
      <Stack spacing={1.5}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {labels.codeSentTo(sentTo)}
        </Typography>
        {testCode && <Alert severity="info">{labels.testCode(testCode)}</Alert>}
        <RhfTextField
          control={control}
          name="otp"
          label={labels.codeLabel}
          size="small"
          autoFocus
          slotProps={{ inputLabel: { shrink: true }, htmlInput: otpInput }}
        />
        <Stack direction="row" spacing={1}>
          <DuncitButton type="button" variant="outlined" color="inherit" onClick={onEditValue}>
            {labels.editValue}
          </DuncitButton>
          <DuncitButton type="submit" variant="contained" disabled={busy || !isValid}>
            {busy ? labels.verifying : labels.verifyAndSave}
          </DuncitButton>
        </Stack>
      </Stack>
    </form>
  );
}
