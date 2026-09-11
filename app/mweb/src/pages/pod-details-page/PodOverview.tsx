import { Box, Chip, Stack, Typography } from '@mui/material';
import { alpha, useTheme, type Theme } from '@mui/material/styles';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import HourglassBottomIcon from '@mui/icons-material/HourglassBottom';
import PlaceIcon from '@mui/icons-material/Place';
import VideocamIcon from '@mui/icons-material/Videocam';
import CategoryIcon from '@mui/icons-material/CategoryOutlined';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import { DuncitButton } from '@duncit/buttons';
import PodQuickStats from './PodQuickStats';
import CategoryBreadcrumb from '../../components/CategoryBreadcrumb';
import PodMetaRow from '../../components/pod-details/PodMetaRow';
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

type Tone = 'error' | 'warning' | 'info';

/** A calm tonal pill: the tone tints the fill and the icon, the text stays ink. */
const toneChipSx = (theme: Theme, tone: Tone) => ({
  bgcolor: alpha(theme.palette[tone].main, 0.12),
  color: 'text.primary',
  '& .MuiChip-icon': { color: `${tone}.main` },
});

function TimeChip({ iso }: Readonly<{ iso?: string | null }>) {
  const { t } = useTranslation();
  const theme = useTheme();
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (Number.isNaN(ms)) return null;
  if (ms < 0) {
    return (
      <Chip
        icon={<EventBusyIcon />}
        label={t('mweb.podDetails.podExpired')}
        sx={toneChipSx(theme, 'error')}
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

  return (
    <Chip
      icon={<HourglassBottomIcon />}
      label={label}
      sx={toneChipSx(theme, days <= 1 ? 'warning' : 'info')}
    />
  );
}

/**
 * The pod's title block: the title, who hosts it, what kind of pod it is, the
 * facts the tour's first step names (price · mode · when) and how full it is.
 * Sits on the page ground rather than in a card. Native twin: details/PodInfo.
 */
export default function PodOverview({ pod, isFree, isHost, priceFormat, onAddStatus, categoryCrumbs = [] }: Readonly<Props>) {
  const { t } = useTranslation();
  const hostLine = (pod.host_names ?? []).filter(Boolean).join(', ');
  const modeLabel = pod.pod_mode === 'VIRTUAL' ? t('mweb.podDetails.virtual') : t('mweb.podDetails.physical');
  const spotsTaken = podSeatsTaken(pod);
  const spotsTotal = pod.no_of_spots ?? 0;

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography component="h1" sx={{ fontSize: 24, fontWeight: 600, lineHeight: 1.2 }}>
            {pod.pod_title}
          </Typography>
          {hostLine && (
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }} noWrap>
              {t('mweb.podDetails.hostedBy', { vars: { names: hostLine } })}
            </Typography>
          )}
        </Box>
        {isHost && (
          <DuncitButton
            size="small"
            startIcon={<AddPhotoAlternateIcon />}
            onClick={onAddStatus}
            sx={{ flexShrink: 0, minHeight: 36, bgcolor: 'background.paper', color: 'text.primary', '&:hover': { bgcolor: 'background.paper' } }}
          >
            {t('mweb.podDetails.addStatus')}
          </DuncitButton>
        )}
      </Stack>
      {categoryCrumbs.length > 0 && (
        <PodMetaRow icon={<CategoryIcon />}>
          <CategoryBreadcrumb crumbs={categoryCrumbs} />
        </PodMetaRow>
      )}
      {/* The chip row carries all three facts the tour step names, in its order:
          price, Physical/Virtual, and when it runs. */}
      <Stack direction="row" data-tour="pod-summary" sx={{ flexWrap: 'wrap', gap: 1 }}>
        <Chip
          label={isFree ? t('mweb.podDetails.free') : priceFormat(pod.pod_amount)}
          sx={(theme) => ({
            fontWeight: 700,
            bgcolor: alpha(theme.palette.primary.main, 0.12),
            color: 'primary.main',
          })}
        />
        <Chip
          icon={pod.pod_mode === 'VIRTUAL' ? <VideocamIcon /> : <PlaceIcon />}
          label={modeLabel}
          sx={{ bgcolor: 'background.paper', color: 'text.primary', '& .MuiChip-icon': { color: 'text.primary' } }}
        />
        <TimeChip iso={pod.pod_date_time} />
      </Stack>
      <PodQuickStats spotsTaken={spotsTaken} spotsTotal={spotsTotal} />
    </Stack>
  );
}
