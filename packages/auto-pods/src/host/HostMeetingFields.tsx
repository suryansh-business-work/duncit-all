import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { meetingPlatformOptions, type AutoPodHostMeeting, type AutoPodLabels } from '@duncit/utils';

export interface HostMeetingFieldsProps {
  value: AutoPodHostMeeting;
  onChange: (next: AutoPodHostMeeting) => void;
  labels: AutoPodLabels;
  /** The earliest start the pickers allow — the caller's clock, not the device's. */
  now: Date;
}

/** Where every host's claim starts: nothing typed, nothing picked. */
export const BLANK_HOST_MEETING: AutoPodHostMeeting = {
  meeting_platform: '',
  meeting_url: '',
  pod_date_time: null,
  pod_end_date_time: null,
};

/** The meeting as `hostAssignAutoPod` wants it — sent for a virtual offer only. */
export function hostMeetingInput(meeting: AutoPodHostMeeting) {
  return {
    meeting_platform: meeting.meeting_platform || null,
    meeting_url: meeting.meeting_url.trim(),
    pod_date_time: meeting.pod_date_time?.toISOString() ?? '',
    pod_end_date_time: meeting.pod_end_date_time?.toISOString() ?? '',
  };
}

/**
 * What a host brings to a VIRTUAL offer when they assign themselves: where
 * members join and when the pod runs. The template carries none of it — there
 * is no venue to fix the window — so this sits inside the host's claim dialog,
 * under the price and spots. The native sheet renders the same four fields
 * (rule 27); `autoPodHostMeetingReady` decides for both whether the claim can go.
 */
export function HostMeetingFields({ value, onChange, labels, now }: Readonly<HostMeetingFieldsProps>) {
  const platforms = meetingPlatformOptions(labels.meetingPlatformOther);
  const set = (patch: Partial<AutoPodHostMeeting>) => onChange({ ...value, ...patch });
  // The end picker opens after the start; without a start it opens after now.
  const endMin = value.pod_date_time && value.pod_date_time > now ? value.pod_date_time : now;

  return (
    <Stack spacing={1.5} data-testid="auto-pod-host-meeting">
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {labels.meetingHint}
      </Typography>
      <TextField
        select
        label={labels.meetingPlatform}
        value={value.meeting_platform}
        onChange={(event) => set({ meeting_platform: event.target.value })}
        fullWidth
        slotProps={{ htmlInput: { 'data-testid': 'auto-pod-meeting-platform' } }}
      >
        {platforms.map((platform) => (
          <MenuItem key={platform.value} value={platform.value}>
            {platform.label}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        label={labels.meetingLink}
        value={value.meeting_url}
        onChange={(event) => set({ meeting_url: event.target.value })}
        fullWidth
        required
        slotProps={{ htmlInput: { 'data-testid': 'auto-pod-meeting-link', inputMode: 'url' } }}
      />
      <DateTimePicker
        label={labels.meetingStart}
        value={value.pod_date_time}
        onChange={(date) => set({ pod_date_time: date })}
        minDateTime={now}
        slotProps={{ textField: { fullWidth: true, required: true } }}
      />
      <DateTimePicker
        label={labels.meetingEnd}
        value={value.pod_end_date_time}
        onChange={(date) => set({ pod_end_date_time: date })}
        minDateTime={endMin}
        slotProps={{ textField: { fullWidth: true, required: true } }}
      />
    </Stack>
  );
}
