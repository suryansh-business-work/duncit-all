import { Controller, type Control } from 'react-hook-form';
import { Alert, TextField } from '@mui/material';
import type { PodAttendanceLabels } from '@duncit/utils';
import type { AttendanceOtpValues } from '../otp.form';

interface Props {
  control: Control<AttendanceOtpValues, any, AttendanceOtpValues>;
  labels: PodAttendanceLabels;
  /** The stubbed delivery's code, shown because nothing is actually sent yet. */
  testCode: string;
  /** Why the last check of the code was refused, if it was. */
  verifyError?: Readonly<{ message: string }>;
}

/** The second step: type back the code the attendee was sent. */
export default function OtpCodeField({ control, labels, testCode, verifyError }: Readonly<Props>) {
  return (
    <>
      {testCode && <Alert severity="info">{labels.otpTestCode(testCode)}</Alert>}
      <Controller
        control={control}
        name="code"
        render={({ field, fieldState }) => (
          <TextField
            {...field}
            label={labels.otpCode}
            size="small"
            fullWidth
            data-testid="attendance-otp-code"
            error={!!fieldState.error}
            helperText={fieldState.error?.message}
            slotProps={{
              htmlInput: { inputMode: 'numeric', maxLength: 6 }
            }}
          />
        )}
      />
      {verifyError && <Alert severity="error">{verifyError.message}</Alert>}
    </>
  );
}
