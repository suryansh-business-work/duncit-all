import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import RepeatIcon from '@mui/icons-material/Repeat';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import HourglassBottomIcon from '@mui/icons-material/HourglassBottom';
import PlaceIcon from '@mui/icons-material/Place';
import VideocamIcon from '@mui/icons-material/Videocam';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import PodQuickStats from './PodQuickStats';

interface Props {
  pod: any;
  isFree: boolean;
  isHost: boolean;
  priceFormat: (amount: number) => string;
  onAddStatus: () => void;
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

export default function PodOverview({ pod, isFree, isHost, priceFormat, onAddStatus }: Props) {
  const hostLine = (pod.host_names ?? []).filter(Boolean).join(', ');
  const spotsTaken = pod.pod_attendees?.length ?? 0;
  const spotsTotal = pod.no_of_spots ?? 0;

  return (
    <Box
      sx={{
        p: 2,
        mt: -1.5,
        borderRadius: 4,
        color: '#fff',
        background: 'linear-gradient(145deg, #15111c 0%, #2a1926 52%, #0f172a 100%)',
        boxShadow: '0 18px 48px rgba(17,24,39,0.24)',
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.62)', letterSpacing: 0 }}>
            Locked in
          </Typography>
          <Typography variant="h4" fontWeight={900} sx={{ lineHeight: 1.05 }}>
        {pod.pod_title}
      </Typography>
          {hostLine && <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.72)', mt: 0.6 }} noWrap>Hosted by {hostLine}</Typography>}
        </Box>
        {isHost && (
          <Button size="small" variant="contained" startIcon={<AddPhotoAlternateIcon />} onClick={onAddStatus} sx={{ borderRadius: 999, bgcolor: 'rgba(255,255,255,0.14)', color: '#fff', boxShadow: 'none', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } }}>
            Add status
          </Button>
        )}
      </Stack>
      <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
        <Chip
          label={isFree ? 'Free' : priceFormat(pod.pod_amount)}
          sx={{ fontWeight: 900, fontSize: '1rem', px: 0.5, height: 32, bgcolor: '#fff', color: '#111827' }}
        />
        <Chip
          icon={pod.pod_mode === 'VIRTUAL' ? <VideocamIcon /> : <PlaceIcon />}
          label={pod.pod_mode === 'VIRTUAL' ? 'Virtual' : 'Physical'}
          sx={{ bgcolor: 'rgba(255,255,255,0.12)', color: '#fff', '& .MuiChip-icon': { color: '#fff' } }}
        />
        <Chip icon={<RepeatIcon />} label={pod.pod_occurrence?.replace(/_/g, ' ')} sx={{ bgcolor: 'rgba(255,255,255,0.12)', color: '#fff', '& .MuiChip-icon': { color: '#fff' } }} />
        <TimeChip iso={pod.pod_date_time} />
      </Stack>
      <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
        <Box sx={{ flex: 1, p: 1.2, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.09)' }}>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.62)' }}>People in</Typography>
          <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1 }}>{spotsTaken}</Typography>
        </Box>
        <Box sx={{ flex: 1, p: 1.2, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.09)' }}>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.62)' }}>Spots left</Typography>
          <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1 }}>{Math.max(spotsTotal - spotsTaken, 0)}</Typography>
        </Box>
      </Stack>
      <PodQuickStats
        views={pod.pod_hits}
        spotsTaken={spotsTaken}
        spotsTotal={spotsTotal}
      />
    </Box>
  );
}
