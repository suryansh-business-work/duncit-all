import { Box, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import EventIcon from '@mui/icons-material/Event';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import GroupIcon from '@mui/icons-material/GroupOutlined';
import { DuncitIconButton } from '@duncit/buttons';
import { useNavigate } from 'react-router';
import SeeAllCard from './SeeAllCard';
import PodCardMedia from './PodCardMedia';
import { usePricing } from '../../hooks/usePricing';
import { useTranslation } from '../../i18n/useTranslation';
import { podUrl } from '../../utils/seoUrls';
import { podSeatsTaken } from '@duncit/utils';
import { formatDateTime } from '../../utils/dateFormat';

interface HomeFeaturedPodsProps {
  pods: any[];
  /** Full "happening nearby" count — a trailing See-all card appears when the
   * rail is capped below it. */
  totalCount: number;
  /** True while a vibe chip / sheet filter narrows the rail: the full page is
   * unfiltered, so the card drops its count and its jump-to-index. */
  filtered: boolean;
  /** The category chip over the image (mock: "Sports"). */
  categoryLabelOf?: (pod: any) => string | null;
  /** Save state + toggle; omit to hide the save buttons (signed-out). */
  savedOf?: (podDocId: string) => boolean;
  /** True while THAT pod's toggle is in flight — its icon becomes a spinner. */
  savingOf?: (podDocId: string) => boolean;
  onToggleSave?: (podDocId: string) => void;
}

function formatPodDate(value?: string | null) {
  return formatDateTime(value) || '—';
}

export default function HomeFeaturedPods({
  pods,
  totalCount,
  filtered,
  categoryLabelOf,
  savedOf,
  savingOf,
  onToggleSave,
}: Readonly<HomeFeaturedPodsProps>) {
  const navigate = useNavigate();
  const { format } = usePricing();
  const { t } = useTranslation();
  if (pods.length === 0) return null;

  return (
    <Box
      sx={{
        mx: { xs: -1.25, sm: -2 },
        px: { xs: 1.25, sm: 2 },
        overflowX: 'auto',
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
      }}
    >
      <Stack direction="row" spacing={1.4} sx={{ width: 'max-content', pb: 0.75 }}>
        {pods.map((pod) => {
          const attendees = podSeatsTaken(pod);
          const spotsLeft = pod.no_of_spots > 0 ? Math.max(0, pod.no_of_spots - attendees) : 0;
          const spotsSuffix = pod.no_of_spots > 0 ? `/${pod.no_of_spots}` : '';
          let spotsText = `${attendees}${spotsSuffix}`;
          if (spotsLeft === 1) spotsText = t('mweb.home.spotsLeftOne');
          else if (spotsLeft > 1) spotsText = t('mweb.home.spotsLeftMany', { count: spotsLeft });
          const categoryLabel = categoryLabelOf?.(pod);
          const saved = savedOf?.(pod.id) ?? false;
          const saving = savingOf?.(pod.id) ?? false;
          // Hoisted: a spinner-or-icon choice inline would nest ternaries (S3358).
          const savedIcon = saved ? <BookmarkIcon fontSize="small" /> : <BookmarkBorderIcon fontSize="small" />;
          const saveButtonContent = saving ? <CircularProgress size={18} color="inherit" /> : savedIcon;
          const isFree = pod.pod_type === 'FREE';
          return (
            <Box
              key={pod.id}
              // A div with button semantics, NOT component="button": the
              // save-heart is itself a <button>, and button-in-button is
              // invalid HTML that React warns about.
              role="button"
              tabIndex={0}
              aria-label={pod.pod_title}
              onClick={() => navigate(podUrl(pod.club_slug, pod.pod_id))}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  navigate(podUrl(pod.club_slug, pod.pod_id));
                }
              }}
              sx={{
                width: { xs: 'min(86vw, 340px)', sm: 340 },
                height: 252,
                flex: '0 0 auto',
                p: 0,
                border: 0,
                borderRadius: '20px',
                overflow: 'hidden',
                position: 'relative',
                textAlign: 'left',
                bgcolor: 'grey.900',
                cursor: 'pointer',
                scrollSnapAlign: 'start',
                boxShadow: '0 18px 42px rgba(15,23,42,0.20)',
              }}
            >
              <PodCardMedia media={pod.pod_images_and_videos?.[0]} title={pod.pod_title} />
              {categoryLabel && (
                <Chip
                  size="small"
                  label={categoryLabel}
                  sx={{
                    position: 'absolute',
                    top: 12,
                    left: 12,
                    height: 26,
                    fontWeight: 600,
                    color: 'common.white',
                    bgcolor: 'rgba(9,7,18,0.62)',
                    backdropFilter: 'blur(6px)',
                  }}
                />
              )}
              {onToggleSave && (
                <DuncitIconButton
                  aria-label={saved ? t('mweb.home.savedPod') : t('mweb.home.savePod')}
                  aria-pressed={saved}
                  disabled={saving}
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleSave(pod.id);
                  }}
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    color: saved ? 'primary.main' : 'common.white',
                    bgcolor: 'rgba(9,7,18,0.35)',
                    backdropFilter: 'blur(6px)',
                    '&:hover': { bgcolor: 'rgba(9,7,18,0.5)' },
                    // Disabled only while the toggle is in flight — keep it
                    // legible on the image instead of MUI's grey-on-dark.
                    '&.Mui-disabled': { color: 'common.white', bgcolor: 'rgba(9,7,18,0.35)' },
                  }}
                >
                  {saveButtonContent}
                </DuncitIconButton>
              )}
              {/* Semi-transparent info panel (mock) — the image reads through. */}
              <Stack
                spacing={0.4}
                sx={{
                  position: 'absolute',
                  left: 12,
                  right: 12,
                  bottom: 12,
                  p: 1.4,
                  borderRadius: '14px',
                  bgcolor: (theme) =>
                    alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.78 : 0.8),
                  backdropFilter: 'blur(10px)',
                  border: '1px solid',
                  borderColor: (theme) =>
                    theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.65)',
                }}
              >
                <Stack
                  direction="row"
                  spacing={0.75}
                  useFlexGap
                  sx={{
                    alignItems: "center",
                    flexWrap: "wrap"
                  }}>
                  <Stack
                    direction="row"
                    spacing={0.5}
                    sx={{
                      alignItems: "center",
                      minWidth: 0
                    }}>
                    <EventIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
                    <Typography
                      variant="caption"
                      noWrap
                      sx={{
                        color: "text.secondary",
                        fontWeight: 600
                      }}>
                      {formatPodDate(pod.pod_date_time)}
                    </Typography>
                  </Stack>
                  {attendees > 0 && (
                    <Chip
                      size="small"
                      label={t('mweb.home.joiningNow', { count: attendees })}
                      sx={{ height: 20, bgcolor: 'rgba(34,197,94,0.18)', color: 'success.main', fontWeight: 700 }}
                    />
                  )}
                </Stack>
                <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.1, fontSize: '1.3rem' }} noWrap>
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
                    spacing={0.5}
                    sx={{
                      alignItems: "center",
                      minWidth: 0
                    }}>
                    <GroupIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
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
              </Stack>
            </Box>
          );
        })}
        {totalCount > pods.length && (
          <SeeAllCard
            count={filtered ? undefined : totalCount - pods.length}
            width={200}
            onClick={() =>
              navigate(filtered ? '/happening-nearby' : `/happening-nearby?from=${pods.length}`)
            }
          />
        )}
      </Stack>
    </Box>
  );
}
