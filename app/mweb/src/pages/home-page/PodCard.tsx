import { Box, Card } from '@mui/material';
import { usePricing } from '../../hooks/usePricing';
import { useTranslation } from '../../i18n/useTranslation';
import PodCardMedia from './PodCardMedia';
import PodCardInfo from './PodCardInfo';
import { PodCategoryPill, PodDatePill, PodSaveButton } from './PodCardOverlays';
import { podSeatsTaken } from '@duncit/utils';
import { formatDateTime } from '../../utils/dateFormat';

/** Every pod card's footprint — the same numbers native's PodCard draws (rule
 * 27). The height is fixed so a rail's cards line up whatever their text. */
const CARD_WIDTH = 268;
const CARD_HEIGHT = 240;

/**
 * The event card: a white card with the pod's image on top (the date pill and
 * the save button over it, the category at its foot), then who is coming, the
 * title with the price beside it, and the host/place line. The whole card
 * opens the pod.
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
  /** The pod's club's category name — the pill over the image. */
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
  const hostText = hostName ? t('mweb.podDetails.hostedBy', { vars: { names: hostName } }) : '';
  const spotsTaken = podSeatsTaken(pod);
  const spotsLeft = pod.no_of_spots > 0 ? Math.max(0, pod.no_of_spots - spotsTaken) : 0;
  const spotsSuffix = pod.no_of_spots > 0 ? `/${pod.no_of_spots}` : '';
  let spotsText = `${spotsTaken}${spotsSuffix}`;
  if (spotsLeft === 1) spotsText = t('mweb.home.spotsLeftOne');
  else if (spotsLeft > 1) spotsText = t('mweb.home.spotsLeftMany', { count: spotsLeft });
  const joiningText = spotsTaken > 0 ? t('mweb.home.joiningNow', { count: spotsTaken }) : '';
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
        width: CARD_WIDTH,
        minWidth: CARD_WIDTH,
        maxWidth: CARD_WIDTH,
        height: CARD_HEIGHT,
        flex: '0 0 auto',
        p: 1,
        display: 'flex',
        flexDirection: 'column',
        scrollSnapAlign: 'start',
        cursor: 'pointer',
        transition: 'transform 180ms ease',
        '&:hover': { transform: 'translateY(-2px)' },
      }}
    >
      <Box
        sx={{
          position: 'relative',
          flex: 1,
          minHeight: 0,
          borderRadius: '18px',
          overflow: 'hidden',
          bgcolor: 'action.hover',
        }}
      >
        <PodCardMedia media={pod.pod_images_and_videos?.[0]} title={pod.pod_title} />
        <PodDatePill text={dateText} />
        {categoryLabel && <PodCategoryPill label={categoryLabel} />}
        {onToggleSave && (
          <PodSaveButton
            saved={saved}
            saving={saving}
            label={saved ? t('mweb.home.savedPod') : t('mweb.home.savePod')}
            onToggle={onToggleSave}
          />
        )}
      </Box>
      <PodCardInfo
        title={pod.pod_title}
        price={isFree ? t('mweb.slots.free') : format(pod.pod_amount)}
        joiningText={joiningText}
        spotsText={spotsText}
        subText={[hostText, placeText].filter(Boolean).join(' · ')}
      />
    </Card>
  );
}
