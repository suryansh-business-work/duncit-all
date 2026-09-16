import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Box } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ShareIcon from '@mui/icons-material/Share';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import CommentIcon from '@mui/icons-material/Comment';
import ExploreActionRail from './ExploreActionRail';
import ExploreJoinBar from './ExploreJoinBar';
import ExploreNoAudioHint from './ExploreNoAudioHint';
import ExploreReelVideo from './ExploreReelVideo';
import ExplorePodOverlay from './ExplorePodOverlay';
import LikesListDialog from './LikesListDialog';
import PodCommentsSheet from '../../components/PodCommentsSheet';
import { usePricing } from '../../hooks/usePricing';
import { isPodExpired } from '../../utils/podStatus';
import { likersWithViewer, shareExplorePod } from './explorePodActions';
import { useExploreLike } from './useExploreLike';
import { useReelSoundAction } from './useReelSoundAction';
import { podSeatsTaken } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  pod: any;
  club: any;
  location: any;
  saved: boolean;
  savePending?: boolean;
  onToggleSave: () => void;
  viewerId?: string | null;
  /** The feed's sound choice; only the reel on screen ever plays it. */
  sound: Readonly<{ on: boolean; active: boolean; onToggle: () => void }>;
}

export default function ExplorePodCard({
  pod,
  club,
  location,
  saved,
  savePending,
  onToggleSave,
  viewerId,
  sound,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { format } = usePricing();
  // Expired pods can't be joined — the join rail + CTA become an "expired" notice.
  const expired = isPodExpired(pod.pod_date_time);
  const ctaSubtitle = pod.pod_type === 'FREE'
    ? 'Free spot'
    : `${format(pod.pod_amount)} · Confirm with UPI`;
  const { liked, likeCount, onLike } = useExploreLike(pod);
  const [commentCount, setCommentCount] = useState<number>(pod.comment_count ?? 0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [likersOpen, setLikersOpen] = useState(false);
  const soundAction = useReelSoundAction({ podId: pod.pod_id, hasAudio: pod.reel_has_audio !== false, soundOn: sound.on, onToggleSound: sound.onToggle });

  // Re-sync to the latest server count when the feed refetches (e.g. after the
  // user commented on the Pod Detail page) so the banner stays in sync.
  useEffect(() => {
    setCommentCount(pod.comment_count ?? 0);
  }, [pod.comment_count]);

  const openPod = () => {
    if (pod.club_slug && pod.pod_id) navigate(`/club/${pod.club_slug}/pod/${pod.pod_id}`);
  };

  const share = () => shareExplorePod(pod);

  const spotsSuffix = pod.no_of_spots > 0 ? `/${pod.no_of_spots}` : '';
  const joinLabel = expired ? 'Expired' : `${podSeatsTaken(pod)}${spotsSuffix}`;

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- double-tap is a pointer shortcut; the reel's Open / Join buttons are the keyboard path, and a role=button reel would nest them
    <Box
      data-testid={`reel-${pod.pod_id}`}
      onDoubleClick={openPod}
      sx={{
        position: 'relative',
        height: '100%',
        width: '100%',
        flexShrink: 0,
        scrollSnapAlign: 'start',
        bgcolor: 'common.black',
        color: 'common.white',
        overflow: 'hidden',
      }}
    >
      <ExploreReelVideo src={pod.reel_url} muted={!(soundAction.audible && sound.active)} testId={`reel-video-${pod.pod_id}`} />

      <ExplorePodOverlay pod={pod} club={club} location={location} />

      <ExploreActionRail
        actions={[
          soundAction.action,
          {
            key: 'join',
            testId: `reel-join-${pod.pod_id}`,
            icon: expired ? <InfoOutlinedIcon /> : <HowToRegIcon />,
            label: joinLabel,
            caption: joinLabel,
            ariaLabel: t('mweb.explore.join'),
            onClick: openPod,
            tooltip: expired ? 'This pod is expired.' : 'Join',
          },
          {
            key: 'like',
            testId: `reel-like-${pod.pod_id}`,
            icon: liked ? <FavoriteIcon /> : <FavoriteBorderIcon />,
            label: String(likeCount),
            caption: String(likeCount),
            ariaLabel: t('mweb.explore.like'),
            onClick: onLike,
            active: liked,
            onLabelClick: likeCount > 0 ? () => setLikersOpen(true) : undefined,
          },
          {
            key: 'comment',
            testId: `reel-comment-${pod.pod_id}`,
            icon: <CommentIcon />,
            label: String(commentCount),
            caption: String(commentCount),
            ariaLabel: t('mweb.explore.comments'),
            onClick: () => setCommentsOpen(true),
          },
          {
            key: 'save',
            testId: `reel-save-${pod.pod_id}`,
            icon: saved ? <BookmarkIcon /> : <BookmarkBorderIcon />,
            label: t('mweb.explore.save'),
            ariaLabel: t('mweb.explore.save'),
            onClick: onToggleSave,
            active: saved,
            loading: savePending,
          },
          {
            key: 'share',
            testId: `reel-share-${pod.pod_id}`,
            icon: <ShareIcon />,
            label: t('mweb.common.share'),
            ariaLabel: t('mweb.common.share'),
            onClick: share,
          },
          {
            key: 'open',
            testId: `reel-open-${pod.pod_id}`,
            icon: <OpenInNewIcon />,
            label: t('mweb.explore.open'),
            ariaLabel: t('mweb.explore.open'),
            onClick: openPod,
          },
        ]}
      />

      <ExploreNoAudioHint open={soundAction.noAudioOpen} onClose={soundAction.closeNoAudio} podId={pod.pod_id} />

      <ExploreJoinBar
        expired={expired}
        subtitle={ctaSubtitle}
        goAriaLabel={t('mweb.explore.openPodDetails')}
        onGo={openPod}
        podId={pod.pod_id}
      />

      <PodCommentsSheet
        podId={pod.id}
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        viewerId={viewerId}
        onCountChange={(d) => setCommentCount((c) => Math.max(0, c + d))}
      />

      <LikesListDialog
        open={likersOpen}
        onClose={() => setLikersOpen(false)}
        userIds={likersWithViewer(pod.liked_user_ids ?? [], viewerId, liked)}
      />
    </Box>
  );
}
