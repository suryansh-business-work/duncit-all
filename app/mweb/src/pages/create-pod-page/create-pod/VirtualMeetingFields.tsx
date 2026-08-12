import { Controller } from 'react-hook-form';
import { addMinutes } from 'date-fns';
import { Stack, TextField, Typography } from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { formatDurationBetween, useDateFormat } from '../../../utils/dateFormat';
import { requiredLabel } from '../../../forms/components/requiredLabel';
import { useTranslation } from '../../../i18n/useTranslation';
import { MIN_POD_DURATION_MINUTES } from './create-pod.form';
import type { CreatePodForm } from './create-pod.types';

/** Virtual-pod branch of Step 3: meeting platform/link/notes + start/end pickers.
 * The schedule is entered by hand since there is no venue calendar to book. */
export default function VirtualMeetingFields({ form }: Readonly<{ form: CreatePodForm }>) {
  const {
    control,
    register,
    watch,
    formState: { errors },
  } = form;
  const { dateFormat, timeFormat } = useDateFormat();
  const { t } = useTranslation();
  const dateTimeFormat = `${dateFormat} ${timeFormat}`;
  const startDateTime = watch('pod_date_time');
  const duration = formatDurationBetween(startDateTime, watch('pod_end_date_time'));
  // The end picker only opens times after the start — the first 30 minutes are
  // blocked too, since that is the minimum pod length. Native twin.
  const minEndDateTime = startDateTime
    ? addMinutes(startDateTime, MIN_POD_DURATION_MINUTES)
    : new Date();

  return (
    <Stack spacing={2}>
      <TextField
        label={t('mweb.createPod.meetingPlatform')}
        fullWidth
        {...register('meeting_platform')}
        error={!!errors.meeting_platform}
        helperText={errors.meeting_platform?.message ?? t('mweb.createPod.meetingPlatformHint')}
      />
      <TextField
        label={requiredLabel(t('mweb.createPod.meetingLink'), true)}
        fullWidth
        {...register('meeting_url')}
        error={!!errors.meeting_url}
        helperText={errors.meeting_url?.message ?? t('mweb.createPod.meetingLinkHint')}
      />
      <TextField label={t('mweb.createPod.meetingNotes')} fullWidth multiline minRows={2} {...register('meeting_notes')} />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <Controller
          control={control}
          name="pod_date_time"
          render={({ field }) => (
            <DateTimePicker
              label={requiredLabel(t('mweb.createPod.startDateTime'), true)}
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
              label={t('mweb.createPod.endDateTime')}
              value={field.value}
              onChange={field.onChange}
              format={dateTimeFormat}
              minDateTime={minEndDateTime}
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
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
          {t('mweb.createPod.totalDuration', { vars: { duration } })}
        </Typography>
      )}
    </Stack>
  );
}
