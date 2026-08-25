import { Card, Chip, CircularProgress, IconButton, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import EventIcon from '@mui/icons-material/Event';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import GroupIcon from '@mui/icons-material/GroupOutlined';
import PersonIcon from '@mui/icons-material/PersonOutlined';
import PlaceIcon from '@mui/icons-material/PlaceOutlined';
import { usePricing } from '../../hooks/usePricing';
import { useTranslation } from '../../i18n/useTranslation';
import PodCardMedia from './PodCardMedia';
import { podSeatsTaken } from '@duncit/utils';
import { formatDateTime } from '../../utils/dateFormat';

/**
 * Image-first pod card (mock): full-bleed media, the category chip and the save
 * button overlaid on top, and a translucent info panel — date, big title, spots
 * left and the price pill — floating over the bottom. The whole card opens the
 * pod.
 */
export default function PodCard({
  pod,
  onOpen,
  hostName,
  categoryLabel,
  saved,
  saving,
  onToggleSave,
  showPlace = true,
}: Readonly<{
  pod: any;
  onOpen: () => void;
  hostName?: string | null;
  /** The pod's club's category name — the chip over the image. */
  categoryLabel?: string | null;
  /** Save state; omit both to hide the button (e.g. signed-out rails). */
  saved?: boolean;
  /** The toggle is in flight for THIS pod — the icon becomes a spinner. */
  saving?: boolean;
  onToggleSave?: () => void;
  showPlace?: boolean;
}>) {
  const isFree = pod.pod_type === 'FREE';
  const { format } = usePricing();
  const { t } = useTranslation();
  const placeText = showPlace ? [pod.place_label, pod.place_detail].filter(Boolean).join(' - ') : '';
  const spotsTaken = podSeatsTaken(pod);
  const spotsLeft = pod.no_of_spots > 0 ? Math.max(0, pod.no_of_spots - spotsTaken) : 0;
  const spotsSuffix = pod.no_of_spots > 0 ? `/${pod.no_of_spots}` : '';
  let spotsText = `${spotsTaken}${spotsSuffix}`;
  if (spotsLeft === 1) spotsText = t('mweb.home.spotsLeftOne');
  else if (spotsLeft > 1) spotsText = t('mweb.home.spotsLeftMany', { count: spotsLeft });
  // Hoisted out of the JSX: a spinner-or-icon choice inline would nest ternaries
  // in a prop (S3358).
  const savedIcon = saved ? <BookmarkIcon fontSize="small" /> : <BookmarkBorderIcon fontSize="small" />;
  const saveButtonContent = saving ? <CircularProgress size={18} color="inherit" /> : savedIcon;
  const dateText = formatDateTime(pod.pod_date_time) || '—';

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
          disabled={saving}
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
            // Disabled only while the toggle is in flight — keep it legible on
            // the image instead of MUI's grey-on-dark.
            '&.Mui-disabled': { color: 'common.white', bgcolor: 'rgba(9,7,18,0.35)' },
          }}
        >
          {saveButtonContent}
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
            alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.78 : 0.8),
          backdropFilter: 'blur(10px)',
          border: '1px solid',
          borderColor: (theme) =>
            theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.65)',
        }}
      >
        <Stack direction="row" spacing={0.5} sx={{
          alignItems: "center"
        }}>
          <EventIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
          <Typography
            variant="caption"
            noWrap
            sx={{
              color: "text.secondary",
              fontWeight: 600
            }}>
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
        <Stack
          direction="row"
          spacing={0.75}
          sx={{
            alignItems: "center",
            justifyContent: "space-between"
          }}>
          <Stack
            direction="row"
            spacing={0.4}
            sx={{
              alignItems: "center",
              minWidth: 0
            }}>
            <GroupIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
            <Typography
              variant="caption"
              noWrap
              sx={{
                color: "text.secondary",
                fontWeight: 600
              }}>
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
          <Stack
            direction="row"
            spacing={0.4}
            sx={{
              alignItems: "center",
              minWidth: 0
            }}>
            <PlaceIcon sx={{ fontSize: 13, color: 'text.secondary', flex: '0 0 auto' }} />
            <Typography variant="caption" noWrap sx={{
              color: "text.secondary"
            }}>
              {placeText}
            </Typography>
          </Stack>
        )}
        {hostName && (
          <Stack
            direction="row"
            spacing={0.4}
            sx={{
              alignItems: "center",
              minWidth: 0
            }}>
            <PersonIcon sx={{ fontSize: 13, color: 'text.secondary', flex: '0 0 auto' }} />
            <Typography variant="caption" noWrap sx={{
              color: "text.secondary"
            }}>
              {hostName}
            </Typography>
          </Stack>
        )}
      </Stack>
    </Card>
  );
}
