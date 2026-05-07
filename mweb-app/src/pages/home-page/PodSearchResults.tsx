import {
  Avatar,
  Box,
  CircularProgress,
  MenuItem,
  Stack,
  Typography,
} from '@mui/material';
import EventIcon from '@mui/icons-material/Event';

interface Props {
  loading: boolean;
  pods: any[];
  onSelect: (podId: string) => void;
}

const formatPodSchedule = (value?: string | null) => {
  if (!value) return 'Date not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
};

const spotsLeftLabel = (pod: any) => {
  const total = Number(pod.no_of_spots) || 0;
  if (!total) return 'Open spots';
  const joined = Array.isArray(pod.pod_attendees) ? pod.pod_attendees.length : 0;
  const left = Math.max(total - joined, 0);
  return left === 1 ? '1 spot left' : `${left} spots left`;
};

export default function PodSearchResults({ loading, pods, onSelect }: Props) {
  return (
    <Box
      sx={{
        mt: 1,
        maxHeight: 238,
        overflowY: 'auto',
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
        bgcolor: 'background.paper',
      }}
    >
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 1.5 }}>
          <CircularProgress size={18} />
        </Box>
      )}
      {!loading && pods.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ py: 1, textAlign: 'center' }}>
          No pods found
        </Typography>
      )}
      {pods.slice(0, 6).map((pod: any) => (
        <MenuItem key={pod.id} dense onClick={() => onSelect(pod.id)} sx={{ px: 1, py: 0.75 }}>
          <Stack direction="row" spacing={1.25} alignItems="center" sx={{ width: '100%', minWidth: 0 }}>
            <Avatar
              variant="rounded"
              src={pod.pod_images_and_videos?.[0]?.url}
              sx={{ width: 44, height: 44, flex: '0 0 auto' }}
            >
              <EventIcon fontSize="small" />
            </Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="body2" fontWeight={700} noWrap sx={{ lineHeight: 1.25 }}>
                {pod.pod_title}
              </Typography>
              <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.25 }}>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {formatPodSchedule(pod.pod_date_time)}
                </Typography>
                <Box sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: 'text.disabled', flex: '0 0 auto' }} />
                <Typography variant="caption" color="primary.main" fontWeight={700} noWrap>
                  {spotsLeftLabel(pod)}
                </Typography>
              </Stack>
            </Box>
          </Stack>
        </MenuItem>
      ))}
    </Box>
  );
}