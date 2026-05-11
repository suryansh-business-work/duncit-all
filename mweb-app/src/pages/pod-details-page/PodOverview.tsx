import { Box, Chip, Stack, Typography } from '@mui/material';
import RepeatIcon from '@mui/icons-material/Repeat';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import HourglassBottomIcon from '@mui/icons-material/HourglassBottom';
import PodQuickStats from './PodQuickStats';

interface Props {
  pod: any;
  isFree: boolean;
  priceFormat: (amount: number) => string;
}

function TimeChip({ iso }: { iso?: string | null }) {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (Number.isNaN(ms)) return null;
  if (ms < 0) {
    return <Chip color="error" variant="filled" icon={<EventBusyIcon />} label="Pod expired" />;
  }

  const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
  const hours = Math.ceil(ms / (1000 * 60 * 60));
  const label = days > 1 ? `${days} days remaining` : hours > 1 ? `${hours} hours remaining` : 'Starting soon';

  return <Chip color={days <= 1 ? 'warning' : 'info'} icon={<HourglassBottomIcon />} label={label} />;
}

export default function PodOverview({ pod, isFree, priceFormat }: Props) {
  return (
    <Box>
      <Typography variant="h4" fontWeight={700}>
        {pod.pod_title}
      </Typography>
      <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
        <Chip color={isFree ? 'success' : 'primary'} label={isFree ? 'Free' : priceFormat(pod.pod_amount)} />
        <Chip icon={<RepeatIcon />} label={pod.pod_occurrence?.replace(/_/g, ' ')} />
        <TimeChip iso={pod.pod_date_time} />
      </Stack>
      <PodQuickStats
        views={pod.pod_hits}
        spotsTaken={pod.pod_attendees?.length ?? 0}
        spotsTotal={pod.no_of_spots ?? 0}
      />
    </Box>
  );
}
