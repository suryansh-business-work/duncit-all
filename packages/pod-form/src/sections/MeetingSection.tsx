import { useState } from 'react';
import { Button, CircularProgress, InputAdornment, MenuItem, Stack, TextField, Tooltip } from '@mui/material';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import DateTimeField from '../components/DateTimeField';
import { usePodFormData } from '../context';
import type { PodFormValues } from '../types';

export default function MeetingSection() {
  const { meetingPlatforms, onGenerateMeetingLink, dateTimeFormat } = usePodFormData();
  const { control, register, getValues, setValue, formState: { errors } } = useFormContext<PodFormValues>();
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const startDateTime = useWatch({ control, name: 'pod_date_time' });
  const meetingPlatform = useWatch({ control, name: 'meeting_platform' });
  const now = new Date();
  const endMin = startDateTime && startDateTime > now ? startDateTime : now;

  const handleAutoGenerate = async () => {
    const platform = getValues('meeting_platform');
    /* v8 ignore next -- defensive: the generate button only renders when these conditions already pass */
    if (!onGenerateMeetingLink || !platform || platform === 'OTHER') return;
    setGenerating(true);
    setGenerateError(null);
    try {
      const url = await onGenerateMeetingLink({
        platform,
        title: getValues('pod_title') || 'Duncit Pod',
        /* v8 ignore next -- defensive: the generate button requires a start date/time */
        startISO: (getValues('pod_date_time') ?? new Date()).toISOString(),
        endISO: getValues('pod_end_date_time')?.toISOString(),
      });
      setValue('meeting_url', url, { shouldValidate: true });
    } catch (error: any) {
      setGenerateError(error?.message ?? 'Could not generate meeting link');
    } finally {
      setGenerating(false);
    }
  };

  const canAutoGenerate =
    !!onGenerateMeetingLink && !!meetingPlatform && meetingPlatform !== 'OTHER' && !!startDateTime;

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <DateTimeField control={control} name="pod_date_time" label="Start date & time" minDateTime={now} required format={dateTimeFormat} />
        <DateTimeField control={control} name="pod_end_date_time" label="End date & time" minDateTime={endMin} format={dateTimeFormat} />
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        {meetingPlatforms ? (
          <TextField
            select
            label="Meeting platform"
            value={meetingPlatform || ''}
            onChange={(event) => setValue('meeting_platform', event.target.value, { shouldValidate: true })}
            fullWidth
            error={!!errors.meeting_platform}
            helperText={errors.meeting_platform?.message || 'Pick a platform to auto-generate a link.'}
          >
            {meetingPlatforms.map((platform) => (
              <MenuItem key={platform.value} value={platform.value}>
                {platform.label}
              </MenuItem>
            ))}
          </TextField>
        ) : (
          <TextField
            label="Meeting platform"
            fullWidth
            error={!!errors.meeting_platform}
            helperText={errors.meeting_platform?.message}
            {...register('meeting_platform')}
          />
        )}
        <Controller
          control={control}
          name="meeting_url"
          render={({ field, fieldState }) => (
            <TextField
              {...field}
              label="Meeting link"
              fullWidth
              required
              placeholder="https://meet.google.com/..."
              error={!!fieldState.error || !!generateError}
              helperText={fieldState.error?.message || generateError || 'Visible to joined members only.'}
              InputProps={{
                endAdornment: canAutoGenerate ? (
                  <InputAdornment position="end">
                    <Tooltip title="Auto-generate meeting link">
                      <Button
                        size="small"
                        onClick={handleAutoGenerate}
                        disabled={generating}
                        startIcon={generating ? <CircularProgress size={14} /> : <AutoFixHighIcon fontSize="small" />}
                      >
                        {generating ? 'Generating…' : 'Generate'}
                      </Button>
                    </Tooltip>
                  </InputAdornment>
                ) : undefined,
              }}
            />
          )}
        />
      </Stack>
      <TextField
        label="Meeting notes"
        fullWidth
        multiline
        minRows={3}
        error={!!errors.meeting_notes}
        helperText={errors.meeting_notes?.message || 'Password, agenda, joining instructions, or moderator notes.'}
        {...register('meeting_notes')}
      />
    </Stack>
  );
}
