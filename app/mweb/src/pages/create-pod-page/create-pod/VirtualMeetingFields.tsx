import { Controller } from 'react-hook-form';
import { Stack, TextField, Typography } from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { formatDurationBetween, useDateFormat } from '../../../utils/dateFormat';
import { requiredLabel } from '../../../forms/components/requiredLabel';
import type { CreatePodForm } from './create-pod.types';

/** Virtual-pod branch of Step 3: meeting platform/link/notes + start/end pickers.
 * The schedule is entered by hand since there is no venue calendar to book. */
export default function VirtualMeetingFields({ form }: Readonly<{ form: CreatePodForm }>) {
  const {
    control,
    register,
    watch,
    getValues,
    formState: { errors },
  } = form;
  const { dateFormat, timeFormat } = useDateFormat();
  const dateTimeFormat = `${dateFormat} ${timeFormat}`;
  const duration = formatDurationBetween(watch('pod_date_time'), watch('pod_end_date_time'));

  return (
    <Stack spacing={2}>
      <TextField
        label="Meeting platform"
        fullWidth
        {...register('meeting_platform')}
        error={!!errors.meeting_platform}
        helperText={errors.meeting_platform?.message ?? 'e.g. Google Meet, Zoom'}
      />
      <TextField
        label={requiredLabel('Meeting link', true)}
        fullWidth
        {...register('meeting_url')}
        error={!!errors.meeting_url}
        helperText={errors.meeting_url?.message ?? 'Attendees join through this link'}
      />
      <TextField label="Meeting notes" fullWidth multiline minRows={2} {...register('meeting_notes')} />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <Controller
          control={control}
          name="pod_date_time"
          render={({ field }) => (
            <DateTimePicker
              label={requiredLabel('Start date & time', true)}
              value={field.value}
              onChange={field.onChange}
              format={dateTimeFormat}
              minDateTime={new Date()}
              slotProps={{
                textField: {
                  fullWidth: true,
                  error: !!errors.pod_date_time,
                  helperText: errors.pod_date_time?.message,
                },
              }}
            />
          )}
        />
        <Controller
          control={control}
          name="pod_end_date_time"
          render={({ field }) => (
            <DateTimePicker
              label="End date & time"
              value={field.value}
              onChange={field.onChange}
              format={dateTimeFormat}
              minDateTime={getValues('pod_date_time') ?? new Date()}
              slotProps={{
                textField: {
                  fullWidth: true,
                  error: !!errors.pod_end_date_time,
                  helperText: errors.pod_end_date_time?.message,
                },
              }}
            />
          )}
        />
      </Stack>
      {duration && (
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
          Total duration: {duration}
        </Typography>
      )}
    </Stack>
  );
}
