import { Card, Chip, IconButton, Stack, Typography } from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import GroupIcon from '@mui/icons-material/GroupOutlined';
import PersonIcon from '@mui/icons-material/PersonOutline';
import PlaceIcon from '@mui/icons-material/PlaceOutlined';
import { usePricing } from '../../hooks/usePricing';
import { useTranslation } from '../../i18n/useTranslation';
import PodCardMedia from './PodCardMedia';

/**
 * Image-first pod card (mock): full-bleed media, the category chip and heart
 * overlaid on top, and a translucent info panel — date, big title, spots left
 * and the price pill — floating over the bottom. The whole card opens the pod.
 */
export default function PodCard({
  pod,
  onOpen,
  hostName,
  categoryLabel,
  saved,
  onToggleSave,
  showPlace = true,
}: Readonly<{
  pod: any;
  onOpen: () => void;
  hostName?: string | null;
  /** The pod's club's category name — the chip over the image. */
  categoryLabel?: string | null;
  /** Heart state; omit both to hide the heart (e.g. signed-out rails). */
  saved?: boolean;
  onToggleSave?: () => void;
  showPlace?: boolean;
}>) {
  const isFree = pod.pod_type === 'FREE';
  const { format } = usePricing();
  const { t } = useTranslation();
  const placeText = showPlace ? [pod.place_label, pod.place_detail].filter(Boolean).join(' - ') : '';
  const spotsTaken = pod.pod_attendees?.length ?? 0;
  const spotsLeft = pod.no_of_spots > 0 ? Math.max(0, pod.no_of_spots - spotsTaken) : 0;
  const spotsSuffix = pod.no_of_spots > 0 ? `/${pod.no_of_spots}` : '';
  let spotsText = `${spotsTaken}${spotsSuffix}`;
  if (spotsLeft === 1) spotsText = t('mweb.home.spotsLeftOne');
  else if (spotsLeft > 1) spotsText = t('mweb.home.spotsLeftMany', { count: spotsLeft });
  const dateText = pod.pod_date_time
    ? new Date(pod.pod_date_time).toLocaleString(undefined, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
      })
    : '—';

  return (
    <Card
      onClick={onOpen}
      role="button"
      tabIndex={0}
      aria-label={pod.pod_title}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen();
        }
      }}
      sx={{
        minWidth: 268,
        maxWidth: 268,
        height: 250,
        flex: '0 0 auto',
        scrollSnapAlign: 'start',
        position: 'relative',
        borderRadius: '20px',
        cursor: 'pointer',
        overflow: 'hidden',
        boxShadow: '0 18px 42px rgba(9,7,18,0.22)',
        border: 1,
        borderColor: 'divider',
        transition: 'transform 180ms ease, box-shadow 180ms ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 22px 48px rgba(255,79,115,0.20)',
        },
      }}
    >
      <PodCardMedia media={pod.pod_images_and_videos?.[0]} title={pod.pod_title} />

      {categoryLabel && (
        <Chip
          size="small"
          icon={<EventIcon sx={{ fontSize: 13, color: 'inherit !important' }} />}
          label={categoryLabel}
          sx={{
            position: 'absolute',
            top: 10,
            left: 10,
            height: 26,
            fontWeight: 600,
            color: 'common.white',
            bgcolor: 'rgba(9,7,18,0.62)',
            backdropFilter: 'blur(6px)',
          }}
        />
      )}

      {onToggleSave && (
        <IconButton
          aria-label={saved ? t('mweb.home.savedPod') : t('mweb.home.savePod')}
          aria-pressed={saved}
          onClick={(event) => {
            event.stopPropagation();
            onToggleSave();
          }}
          sx={{
            position: 'absolute',
            top: 6,
            right: 6,
            color: saved ? 'primary.main' : 'common.white',
            bgcolor: 'rgba(9,7,18,0.35)',
            backdropFilter: 'blur(6px)',
            '&:hover': { bgcolor: 'rgba(9,7,18,0.5)' },
          }}
        >
          {saved ? <FavoriteIcon fontSize="small" /> : <FavoriteBorderIcon fontSize="small" />}
        </IconButton>
      )}

      {/* The mock's white info box, kept translucent so the image reads through;
       * dark mode swaps to a translucent surface tone. */}
      <Stack
        spacing={0.4}
        sx={{
          position: 'absolute',
          left: 10,
          right: 10,
          bottom: 10,
          p: 1.25,
          borderRadius: '14px',
          bgcolor: (theme) =>
            theme.palette.mode === 'dark' ? 'rgba(17,26,46,0.78)' : 'rgba(255,255,255,0.80)',
          backdropFilter: 'blur(10px)',
          border: '1px solid',
          borderColor: (theme) =>
            theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.65)',
        }}
      >
        <Stack direction="row" spacing={0.5} alignItems="center">
          <EventIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }} noWrap>
            {dateText}
          </Typography>
        </Stack>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            lineHeight: 1.15,
            fontSize: '1.15rem',
            display: '-webkit-box',
            WebkitLineClamp: 1,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {pod.pod_title}
        </Typography>
        <Stack direction="row" spacing={0.75} alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={0.4} alignItems="center" sx={{ minWidth: 0 }}>
            <GroupIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }} noWrap>
              {spotsText}
            </Typography>
          </Stack>
          <Chip
            size="small"
            label={isFree ? t('mweb.slots.free') : format(pod.pod_amount)}
            color={isFree ? 'success' : 'primary'}
            sx={{ height: 24, fontWeight: 700, flex: '0 0 auto' }}
          />
        </Stack>
        {placeText && (
          <Stack direction="row" spacing={0.4} alignItems="center" sx={{ minWidth: 0 }}>
            <PlaceIcon sx={{ fontSize: 13, color: 'text.secondary', flex: '0 0 auto' }} />
            <Typography variant="caption" color="text.secondary" noWrap>
              {placeText}
            </Typography>
          </Stack>
        )}
        {hostName && (
          <Stack direction="row" spacing={0.4} alignItems="center" sx={{ minWidth: 0 }}>
            <PersonIcon sx={{ fontSize: 13, color: 'text.secondary', flex: '0 0 auto' }} />
            <Typography variant="caption" color="text.secondary" noWrap>
              {hostName}
            </Typography>
          </Stack>
        )}
      </Stack>
    </Card>
  );
}
