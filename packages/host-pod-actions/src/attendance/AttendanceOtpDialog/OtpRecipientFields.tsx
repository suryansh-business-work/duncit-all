import { Controller, type Control } from 'react-hook-form';
import { Stack, TextField } from '@mui/material';
import type { PodAttendanceLabels } from '@duncit/utils';
import MediumPicker from '../MediumPicker';
import type { AttendanceOtpValues } from '../otp.form';

interface Props {
  control: Control<AttendanceOtpValues, any, AttendanceOtpValues>;
  labels: PodAttendanceLabels;
}

/** Who the code goes to, and over which channel — confirmed before it is sent. */
export default function OtpRecipientFields({ control, labels }: Readonly<Props>) {
  return (
    <>
      <Controller
        control={control}
        name="name"
        render={({ field, fieldState }) => (
          <TextField
            {...field}
            label={labels.otpName}
            size="small"
            fullWidth
            data-testid="attendance-otp-name"
            error={!!fieldState.error}
            helperText={fieldState.error?.message}
          />
        )}
      />
      <Stack direction="row" spacing={1}>
        <Controller
          control={control}
          name="extension"
          render={({ field, fieldState }) => (
            <TextField
              {...field}
              label={labels.otpExtension}
              size="small"
              sx={{ width: 120 }}
              data-testid="attendance-otp-extension"
              error={!!fieldState.error}
              helperText={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="number"
          render={({ field, fieldState }) => (
            <TextField
              {...field}
              label={labels.otpPhone}
              size="small"
              fullWidth
              data-testid="attendance-otp-number"
              error={!!fieldState.error}
              helperText={fieldState.error?.message}
            />
          )}
        />
      </Stack>

      <Controller
        control={control}
        name="mediums"
        render={({ field, fieldState }) => (
          <MediumPicker
            labels={labels}
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
          />
        )}
      />
    </>
  );
}
