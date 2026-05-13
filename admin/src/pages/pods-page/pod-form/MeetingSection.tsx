import { useState } from 'react';
import {
  Button,
  CircularProgress,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
} from '@mui/material';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import { useFormikContext } from 'formik';
import DateTimeField from '../../../components/DateTimeField';
import { generateMeetingLink, MEETING_PLATFORMS } from '../meeting-platforms';
import type { PodForm } from '../queries';

export default function MeetingSection() {
  const { values, errors, touched, handleChange, setFieldValue } = useFormikContext<PodForm>();
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const err = (key: keyof PodForm) => !!touched[key] && !!errors[key];
  const help = (key: keyof PodForm) => (touched[key] ? (errors[key] as string) : undefined);
  const now = new Date();
  const endMin = values.pod_date_time && new Date(values.pod_date_time) > now
    ? new Date(values.pod_date_time)
    : now;

  const handleAutoGenerate = async () => {
    if (!values.meeting_platform || values.meeting_platform === 'OTHER') return;
    setGenerating(true);
    setGenerateError(null);
    try {
      const url = await generateMeetingLink({
        platform: values.meeting_platform,
        title: values.pod_title || 'Duncit Pod',
        startISO: values.pod_date_time || new Date().toISOString(),
        endISO: values.pod_end_date_time || undefined,
      });
      setFieldValue('meeting_url', url);
    } catch (error: any) {
      setGenerateError(error?.message ?? 'Could not generate meeting link');
    } finally {
      setGenerating(false);
    }
  };

  const canAutoGenerate =
    !!values.meeting_platform &&
    values.meeting_platform !== 'OTHER' &&
    !!values.pod_date_time;

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <DateTimeField
          label="Start date & time"
          value={values.pod_date_time}
          onChange={(iso) => setFieldValue('pod_date_time', iso)}
          minDateTime={now}
          required
          error={err('pod_date_time')}
          helperText={help('pod_date_time')}
        />
        <DateTimeField
          label="End date & time"
          value={values.pod_end_date_time}
          onChange={(iso) => setFieldValue('pod_end_date_time', iso)}
          minDateTime={endMin}
          error={err('pod_end_date_time')}
          helperText={help('pod_end_date_time')}
        />
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          select
          label="Meeting platform"
          name="meeting_platform"
          value={values.meeting_platform || ''}
          onChange={handleChange}
          fullWidth
          error={err('meeting_platform')}
          helperText={help('meeting_platform') || 'Pick a platform to auto-generate a link.'}
        >
          {MEETING_PLATFORMS.map((platform) => (
            <MenuItem key={platform.value} value={platform.value}>
              {platform.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Meeting link"
          name="meeting_url"
          value={values.meeting_url}
          onChange={handleChange}
          fullWidth
          required
          placeholder="https://meet.google.com/..."
          error={err('meeting_url') || !!generateError}
          helperText={help('meeting_url') || generateError || 'Visible to joined members only.'}
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
      </Stack>
      <TextField
        label="Meeting notes"
        name="meeting_notes"
        value={values.meeting_notes}
        onChange={handleChange}
        fullWidth
        multiline
        minRows={3}
        error={err('meeting_notes')}
        helperText={help('meeting_notes') || 'Password, agenda, joining instructions, or moderator notes.'}
      />
    </Stack>
  );
}
