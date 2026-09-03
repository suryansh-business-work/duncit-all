import { format } from 'date-fns';
import { Input, Text, YStack } from 'tamagui';
import { meetingPlatformOptions, type AutoPodHostMeeting, type AutoPodLabels } from '@duncit/utils';

import { ChipSelectField } from '@/components/create-pod/ChipSelectField';
import { DateTimeField } from '@/components/create-pod/DateTimeField';
import { useDateFormat } from '@/hooks/useDateFormat';

interface Props {
  value: AutoPodHostMeeting;
  onChange: (next: AutoPodHostMeeting) => void;
  labels: AutoPodLabels;
  /** The earliest start the pickers allow — the app's clock, not the device's. */
  now: Date;
}

const inputStyle = {
  size: '$4',
  backgroundColor: '$surface',
  color: '$color',
  placeholderTextColor: '$muted',
  borderColor: '$borderColor',
} as const;

/**
 * What a host brings to a VIRTUAL offer when they assign themselves: where
 * members join and when the pod runs. The template carries none of it — there
 * is no venue to fix a virtual pod's window — so these sit inside the host's
 * claim sheet, under the price and spots.
 *
 * The Tamagui twin of `@duncit/auto-pods`' `HostMeetingFields` (rule 27): same
 * four fields in the same order, and `autoPodHostMeetingReady` decides for both
 * whether the claim may go.
 */
export function HostMeetingFields({ value, onChange, labels, now }: Readonly<Props>) {
  const fmt = useDateFormat();
  const platforms = meetingPlatformOptions(labels.meetingPlatformOther);
  const set = (patch: Partial<AutoPodHostMeeting>) => onChange({ ...value, ...patch });
  // The end picker opens after the start; without a start it opens after now.
  const endMin = value.pod_date_time && value.pod_date_time > now ? value.pod_date_time : now;
  // The native date field speaks TEXT, in the admin-configured input pattern
  // it also parses back (rule 11) — the same round trip Create a Pod makes.
  const asText = (date: Date | null) => (date ? format(date, fmt.dateTimeInputFormat) : '');

  return (
    <YStack gap={10} testID="auto-pod-host-meeting">
      <Text fontSize={12.5} color="$muted">
        {labels.meetingHint}
      </Text>

      <ChipSelectField
        label={labels.meetingPlatform}
        options={[...platforms]}
        value={value.meeting_platform}
        onChange={(next) => set({ meeting_platform: next })}
        testID="auto-pod-meeting-platform"
      />

      <Input
        testID="auto-pod-meeting-link"
        {...inputStyle}
        value={value.meeting_url}
        onChangeText={(text) => set({ meeting_url: text })}
        placeholder={labels.meetingLink}
        aria-label={labels.meetingLink}
        keyboardType="url"
        autoCapitalize="none"
      />

      <DateTimeField
        label={labels.meetingStart}
        required
        value={asText(value.pod_date_time)}
        onChange={(text) => set({ pod_date_time: fmt.parseDateTime(text) })}
        minDateTime={now}
        testID="auto-pod-meeting-start"
      />
      <DateTimeField
        label={labels.meetingEnd}
        required
        value={asText(value.pod_end_date_time)}
        onChange={(text) => set({ pod_end_date_time: fmt.parseDateTime(text) })}
        minDateTime={endMin}
        testID="auto-pod-meeting-end"
      />
    </YStack>
  );
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
