import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import HourglassBottomIcon from '@mui/icons-material/HourglassBottom';
import PlaceIcon from '@mui/icons-material/Place';
import VideocamIcon from '@mui/icons-material/Videocam';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import PodQuickStats from './PodQuickStats';
import CategoryBreadcrumb from '../../components/CategoryBreadcrumb';
import { useTranslation } from '../../i18n/useTranslation';
import { podSeatsTaken } from '@duncit/utils';

interface Props {
  pod: any;
  isFree: boolean;
  isHost: boolean;
  priceFormat: (amount: number) => string;
  onAddStatus: () => void;
  /** The pod's club category as Super › Category › Sub (root-first). */
  categoryCrumbs?: readonly string[];
}

function TimeChip({ iso }: Readonly<{ iso?: string | null }>) {
  const { t } = useTranslation();
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (Number.isNaN(ms)) return null;
  if (ms < 0) {
    return (
      <Chip
        color="error"
        variant="filled"
        icon={<EventBusyIcon />}
        label={t('mweb.podDetails.podExpired')}
      />
    );
  }

  const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
  const hours = Math.ceil(ms / (1000 * 60 * 60));
  const hoursLabel =
    hours > 1
      ? t('mweb.podDetails.hoursRemaining', { vars: { hours } })
      : t('mweb.podDetails.startingSoon');
  const label =
    days > 1 ? t('mweb.podDetails.daysRemaining', { vars: { days } }) : hoursLabel;

  return <Chip color={days <= 1 ? 'warning' : 'info'} icon={<HourglassBottomIcon />} label={label} />;
}

export default function PodOverview({ pod, isFree, isHost, priceFormat, onAddStatus, categoryCrumbs = [] }: Readonly<Props>) {
  const theme = useTheme();
  const { t } = useTranslation();
  const isDark = theme.palette.mode === 'dark';
  const hostLine = (pod.host_names ?? []).filter(Boolean).join(', ');
  const modeLabel = pod.pod_mode === 'VIRTUAL' ? t('mweb.podDetails.virtual') : t('mweb.podDetails.physical');
  const spotsTaken = podSeatsTaken(pod);
  const spotsTotal = pod.no_of_spots ?? 0;
  const textColor = theme.palette.text.primary;
  const mutedColor = theme.palette.text.secondary;
  const softBg = isDark ? 'rgba(255,255,255,0.09)' : alpha(theme.palette.background.paper, 0.72);
  const chipBg = isDark ? 'rgba(255,255,255,0.12)' : alpha(theme.palette.text.primary, 0.08);

  return (
    <Box
      sx={{
        p: 2,
        mt: -1.5,
        borderRadius: '16px',
        color: textColor,
        background: isDark
          ? 'linear-gradient(145deg, #15111c 0%, #2a1926 52%, #0f172a 100%)'
          : `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.96)} 0%, ${alpha(theme.palette.primary.light, 0.16)} 52%, ${alpha(theme.palette.background.paper, 0.98)} 100%)`,
        boxShadow: isDark ? '0 18px 48px rgba(17,24,39,0.24)' : `0 18px 48px ${alpha(theme.palette.primary.dark, 0.12)}`,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h4" fontWeight={700} sx={{ lineHeight: 1.05 }}>
        {pod.pod_title}
      </Typography>
          {hostLine && <Typography variant="body2" sx={{ color: mutedColor, mt: 0.6 }} noWrap>{t('mweb.podDetails.hostedBy', { vars: { names: hostLine } })}</Typography>}
          {categoryCrumbs.length > 0 && (
            <Box sx={{ mt: 0.6, color: mutedColor }}>
              <CategoryBreadcrumb crumbs={categoryCrumbs} />
            </Box>
          )}
        </Box>
        {isHost && (
          <Button size="small" variant="contained" startIcon={<AddPhotoAlternateIcon />} onClick={onAddStatus} sx={{ borderRadius: 999, bgcolor: chipBg, color: textColor, boxShadow: 'none', '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.2)' : alpha(theme.palette.primary.main, 0.14) } }}>
            {t('mweb.podDetails.addStatus')}
          </Button>
        )}
      </Stack>
      {/* The chip row carries all three facts the tour step names, in its order:
          price, Physical/Virtual, and when it runs. */}
      <Stack
        direction="row"
        spacing={1}
        data-tour="pod-summary"
        sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}
      >
        <Chip
          label={isFree ? t('mweb.podDetails.free') : priceFormat(pod.pod_amount)}
          sx={{ fontWeight: 700, fontSize: '1rem', px: 0.5, height: 32, bgcolor: isDark ? '#fff' : alpha(theme.palette.primary.main, 0.12), color: isDark ? '#111827' : 'primary.dark' }}
        />
        <Chip
          icon={pod.pod_mode === 'VIRTUAL' ? <VideocamIcon /> : <PlaceIcon />}
          label={modeLabel}
          sx={{ bgcolor: chipBg, color: textColor, '& .MuiChip-icon': { color: textColor } }}
        />
        <TimeChip iso={pod.pod_date_time} />
      </Stack>
      <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
        <Box sx={{ flex: 1, p: 1.2, borderRadius: '16px', bgcolor: softBg }}>
          <Typography variant="caption" sx={{ color: mutedColor }}>{t('mweb.podDetails.peopleIn')}</Typography>
          <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1 }}>{spotsTaken}</Typography>
        </Box>
        <Box data-tour="pod-spots" sx={{ flex: 1, p: 1.2, borderRadius: '16px', bgcolor: softBg }}>
          <Typography variant="caption" sx={{ color: mutedColor }}>{t('mweb.podDetails.spotsLeft')}</Typography>
          <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1 }}>{Math.max(spotsTotal - spotsTaken, 0)}</Typography>
        </Box>
      </Stack>
      <PodQuickStats spotsTaken={spotsTaken} spotsTotal={spotsTotal} />
    </Box>
  );
}
