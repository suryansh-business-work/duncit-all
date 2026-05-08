import { Stack, Typography } from '@mui/material';
import PodLocationMap from '../../pages/pod-details-page/PodLocationMap';

interface Props {
  pod: any;
  locationName?: string | null;
}

const formatStart = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString(undefined, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : '\u2014';

const formatEnd = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
      })
    : '';

export default function PodMapSection({ pod, locationName }: Props) {
  return (
    <Stack spacing={1.5}>
      <Stack spacing={0.25}>
        <Typography variant="caption" color="text.secondary">
          When
        </Typography>
        <Typography variant="body2" fontWeight={500}>
          {formatStart(pod.pod_date_time)}
          {pod.pod_end_date_time
            ? `  \u2192  ${formatEnd(pod.pod_end_date_time)}`
            : ''}
        </Typography>
      </Stack>
      <Stack spacing={0.25}>
        <Typography variant="caption" color="text.secondary">
          Where
        </Typography>
        <Typography variant="body2" fontWeight={500}>
          {locationName ?? '\u2014'}
          {pod.zone_name ? ` \u00b7 ${pod.zone_name}` : ''}
        </Typography>
      </Stack>
      <PodLocationMap locationName={locationName} zoneName={pod.zone_name} />
    </Stack>
  );
}
