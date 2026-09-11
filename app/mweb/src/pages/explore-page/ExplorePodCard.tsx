import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useMutation } from '@apollo/client/react';
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
import { TOGGLE_POD_LIKE } from '../pod-details-page/queries';
import ExploreActionRail from './ExploreActionRail';
import ExploreJoinBar from './ExploreJoinBar';
import ExploreReelVideo from './ExploreReelVideo';
import ExplorePodOverlay from './ExplorePodOverlay';
import LikesListDialog from './LikesListDialog';
import PodCommentsSheet from '../../components/PodCommentsSheet';
import { usePricing } from '../../hooks/usePricing';
import { isPodExpired } from '../../utils/podStatus';
import { likersWithViewer, shareExplorePod } from './explorePodActions';
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
}

export default function ExplorePodCard({
  pod,
  club,
  location,
  saved,
  savePending,
  onToggleSave,
  viewerId,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { format } = usePricing();
  // Expired pods can't be joined — the join rail + CTA become an "expired" notice.
  const expired = isPodExpired(pod.pod_date_time);
  const ctaSubtitle = pod.pod_type === 'FREE'
    ? 'Free spot'
    : `${format(pod.pod_amount)} · Confirm with UPI`;
  const [liked, setLiked] = useState<boolean>(!!pod.liked_by_me);
  const [likeCount, setLikeCount] = useState<number>(pod.like_count ?? 0);
  const [commentCount, setCommentCount] = useState<number>(pod.comment_count ?? 0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [likersOpen, setLikersOpen] = useState(false);
  const [toggleLike] = useMutation<any>(TOGGLE_POD_LIKE);

  // Re-sync to the latest server values when the feed refetches (e.g. after the
  // user liked/commented on the Pod Detail page) so the banner stays in sync.
  useEffect(() => {
    setLiked(!!pod.liked_by_me);
    setLikeCount(pod.like_count ?? 0);
    setCommentCount(pod.comment_count ?? 0);
  }, [pod.liked_by_me, pod.like_count, pod.comment_count]);

  const onLike = async () => {
    const prev = liked;
    setLiked(!prev);
    setLikeCount((c) => c + (prev ? -1 : 1));
    try {
      const res = await toggleLike({ variables: { id: pod.id } });
      setLiked(!!res.data?.togglePodLike?.liked_by_me);
      setLikeCount(res.data?.togglePodLike?.like_count ?? likeCount);
    } catch {
      setLiked(prev);
      setLikeCount((c) => c + (prev ? 1 : -1));
    }
  };

  const openPod = () => {
    if (pod.club_slug && pod.pod_id) navigate(`/club/${pod.club_slug}/pod/${pod.pod_id}`);
  };

  const share = () => shareExplorePod(pod);

  const spotsSuffix = pod.no_of_spots > 0 ? `/${pod.no_of_spots}` : '';
  const joinLabel = expired ? 'Expired' : `${podSeatsTaken(pod)}${spotsSuffix}`;

  return (
    <Box
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
      <ExploreReelVideo src={pod.reel_url} />

      <ExplorePodOverlay pod={pod} club={club} location={location} />

      <ExploreActionRail
        actions={[
          {
            key: 'join',
            icon: expired ? <InfoOutlinedIcon /> : <HowToRegIcon />,
            label: joinLabel,
            caption: joinLabel,
            ariaLabel: t('mweb.explore.join'),
            onClick: openPod,
            tooltip: expired ? 'This pod is expired.' : 'Join',
          },
          {
            key: 'like',
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
            icon: <CommentIcon />,
            label: String(commentCount),
            caption: String(commentCount),
            ariaLabel: t('mweb.explore.comments'),
            onClick: () => setCommentsOpen(true),
          },
          {
            key: 'save',
            icon: saved ? <BookmarkIcon /> : <BookmarkBorderIcon />,
            label: t('mweb.explore.save'),
            ariaLabel: t('mweb.explore.save'),
            onClick: onToggleSave,
            active: saved,
            loading: savePending,
          },
          {
            key: 'share',
            icon: <ShareIcon />,
            label: t('mweb.common.share'),
            ariaLabel: t('mweb.common.share'),
            onClick: share,
          },
          {
            key: 'open',
            icon: <OpenInNewIcon />,
            label: t('mweb.explore.open'),
            ariaLabel: t('mweb.explore.open'),
            onClick: openPod,
          },
        ]}
      />

      <ExploreJoinBar
        expired={expired}
        subtitle={ctaSubtitle}
        goAriaLabel={t('mweb.explore.openPodDetails')}
        onGo={openPod}
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
