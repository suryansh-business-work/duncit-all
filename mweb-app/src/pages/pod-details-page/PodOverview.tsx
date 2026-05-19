import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
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
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const hostLine = (pod.host_names ?? []).filter(Boolean).join(', ');
  const spotsTaken = pod.pod_attendees?.length ?? 0;
  const spotsTotal = pod.no_of_spots ?? 0;
  const textColor = isDark ? '#fff' : 'text.primary';
  const mutedColor = isDark ? 'rgba(255,255,255,0.62)' : 'text.secondary';
  const softBg = isDark ? 'rgba(255,255,255,0.09)' : alpha(theme.palette.background.paper, 0.72);
  const chipBg = isDark ? 'rgba(255,255,255,0.12)' : alpha(theme.palette.text.primary, 0.08);

  return (
    <Box
      sx={{
        p: 2,
        mt: -1.5,
        borderRadius: 4,
        color: textColor,
        background: isDark
          ? 'linear-gradient(145deg, #15111c 0%, #2a1926 52%, #0f172a 100%)'
          : `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.96)} 0%, ${alpha(theme.palette.primary.light, 0.16)} 52%, ${alpha(theme.palette.background.paper, 0.98)} 100%)`,
        boxShadow: isDark ? '0 18px 48px rgba(17,24,39,0.24)' : `0 18px 48px ${alpha(theme.palette.primary.dark, 0.12)}`,
        border: '1px solid',
        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'divider',
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h4" fontWeight={900} sx={{ lineHeight: 1.05 }}>
        {pod.pod_title}
      </Typography>
          {hostLine && <Typography variant="body2" sx={{ color: mutedColor, mt: 0.6 }} noWrap>Hosted by {hostLine}</Typography>}
        </Box>
        {isHost && (
          <Button size="small" variant="contained" startIcon={<AddPhotoAlternateIcon />} onClick={onAddStatus} sx={{ borderRadius: 999, bgcolor: chipBg, color: textColor, boxShadow: 'none', '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.2)' : alpha(theme.palette.primary.main, 0.14) } }}>
            Add status
          </Button>
        )}
      </Stack>
      <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
        <Chip
          label={isFree ? 'Free' : priceFormat(pod.pod_amount)}
          sx={{ fontWeight: 900, fontSize: '1rem', px: 0.5, height: 32, bgcolor: isDark ? '#fff' : alpha(theme.palette.primary.main, 0.12), color: isDark ? '#111827' : 'primary.dark' }}
        />
        <Chip
          icon={pod.pod_mode === 'VIRTUAL' ? <VideocamIcon /> : <PlaceIcon />}
          label={pod.pod_mode === 'VIRTUAL' ? 'Virtual' : 'Physical'}
          sx={{ bgcolor: chipBg, color: textColor, '& .MuiChip-icon': { color: textColor } }}
        />
        <Chip icon={<RepeatIcon />} label={pod.pod_occurrence?.replace(/_/g, ' ')} sx={{ bgcolor: chipBg, color: textColor, '& .MuiChip-icon': { color: textColor } }} />
        <TimeChip iso={pod.pod_date_time} />
      </Stack>
      <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
        <Box sx={{ flex: 1, p: 1.2, borderRadius: 3, bgcolor: softBg }}>
          <Typography variant="caption" sx={{ color: mutedColor }}>People in</Typography>
          <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1 }}>{spotsTaken}</Typography>
        </Box>
        <Box sx={{ flex: 1, p: 1.2, borderRadius: 3, bgcolor: softBg }}>
          <Typography variant="caption" sx={{ color: mutedColor }}>Spots left</Typography>
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
