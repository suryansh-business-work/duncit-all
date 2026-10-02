import { Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import { DuncitRoundButton } from '@duncit/buttons';
import StatusOptionsMenu from '../StatusOptionsMenu';
import { useTranslation } from '../../../i18n/useTranslation';

interface StatusViewerActionsProps {
  isVideo: boolean;
  muted: boolean;
  onToggleMute: () => void;
  currentId?: string;
  onToggleLike?: (slideId: string) => void;
  liked: boolean;
  likeCount: number;
  toggleLike: () => void;
  onViewers?: (slideId: string) => void;
  hasMenu: boolean;
  onDelete?: (slideId: string) => void;
  onReport?: (slideId: string) => void;
  onClose: () => void;
}

/** Mute, like, viewers, 3-dot menu and close — the right side of the header. */
export default function StatusViewerActions({
  isVideo,
  muted,
  onToggleMute,
  currentId,
  onToggleLike,
  liked,
  likeCount,
  toggleLike,
  onViewers,
  hasMenu,
  onDelete,
  onReport,
  onClose,
}: Readonly<StatusViewerActionsProps>) {
  const { t } = useTranslation();
  return (
    <>
      {isVideo && (
        <DuncitRoundButton
          tone="overlay"
          onClick={onToggleMute}
          aria-label={muted ? t('mweb.status.unmuteVideo') : t('mweb.status.muteVideo')}
          data-testid="status-mute"
        >
          {muted ? <VolumeOffIcon /> : <VolumeUpIcon />}
        </DuncitRoundButton>
      )}
      {onToggleLike && currentId && (
        <Stack
          direction="row"
          spacing={0.25}
          sx={{
            alignItems: "center",
            color: '#fff'
          }}>
          <DuncitRoundButton
            tone="overlay"
            onClick={toggleLike}
            aria-label={liked ? t('mweb.a11y.unlikeStory') : t('mweb.a11y.likeStory')}
            data-testid="status-like"
            sx={{ color: liked ? 'secondary.main' : '#fff' }}
          >
            {liked ? <FavoriteIcon /> : <FavoriteBorderIcon />}
          </DuncitRoundButton>
          {likeCount > 0 && (
            <Typography variant="caption" sx={{ fontWeight: 600, minWidth: 12 }}>
              {likeCount}
            </Typography>
          )}
        </Stack>
      )}
      {onViewers && currentId && (
        <DuncitRoundButton
          tone="overlay"
          onClick={() => onViewers(currentId)}
          aria-label={t('mweb.common.seeWhoViewedThisStory')}
          data-testid="status-viewers"
        >
          <VisibilityIcon />
        </DuncitRoundButton>
      )}
      {/* Keyed by slide: an open menu closes when the story moves on. */}
      {hasMenu && currentId && (
        <StatusOptionsMenu key={currentId} slideId={currentId} onDelete={onDelete} onReport={onReport} />
      )}
      <DuncitRoundButton data-testid="status-close" tone="overlay" onClick={onClose} aria-label={t('mweb.common.closeStatus')}>
        <CloseIcon />
      </DuncitRoundButton>
    </>
  );
}
