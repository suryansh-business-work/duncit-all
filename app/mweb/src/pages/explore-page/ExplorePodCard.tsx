import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@apollo/client';
import { Box, Button, Stack, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import FlashOnIcon from '@mui/icons-material/FlashOn';
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
import ExploreMediaCarousel from './ExploreMediaCarousel';
import ExplorePodOverlay from './ExplorePodOverlay';
import LikesListDialog from './LikesListDialog';
import PodCommentsSheet from '../../components/PodCommentsSheet';
import { usePricing } from '../../hooks/usePricing';
import { isPodExpired } from '../../utils/podStatus';

interface Props {
  pod: any;
  club: any;
  location: any;
  saved: boolean;
  savePending?: boolean;
  onToggleSave: () => void;
  viewerId?: string | null;
}

/** Reconcile the cached likers with the viewer's own optimistic like so a
 * just-liked pod shows the viewer instead of a stale "No likes yet". */
function likersWithViewer(ids: string[], viewerId: string | null | undefined, liked: boolean): string[] {
  if (!viewerId) return ids;
  const has = ids.includes(viewerId);
  if (liked && !has) return [...ids, viewerId];
  if (!liked && has) return ids.filter((id) => id !== viewerId);
  return ids;
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
  const navigate = useNavigate();
  const { format } = usePricing();
  const cover = club?.club_feature_images_and_videos?.[0]?.url ?? null;
  // Expired pods can't be joined — the join rail + CTA become an "expired" notice.
  const expired = isPodExpired(pod.pod_date_time);
  const ctaSubtitle = pod.pod_type?.includes('FREE')
    ? 'Free spot'
    : `${format(pod.pod_amount)} · Confirm with UPI`;
  const [liked, setLiked] = useState<boolean>(!!pod.liked_by_me);
  const [likeCount, setLikeCount] = useState<number>(pod.like_count ?? 0);
  const [commentCount, setCommentCount] = useState<number>(pod.comment_count ?? 0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [likersOpen, setLikersOpen] = useState(false);
  const [toggleLike] = useMutation(TOGGLE_POD_LIKE);

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

  const share = async () => {
    const url = pod.club_slug && pod.pod_id
      ? `${window.location.origin}/club/${pod.club_slug}/pod/${pod.pod_id}`
      : `${window.location.origin}/explore`;
    const shareData = {
      title: pod.pod_title,
      text: pod.pod_description?.slice(0, 100) ?? pod.pod_title,
      url,
    };
    try {
      if (navigator.share) await navigator.share(shareData);
      else await navigator.clipboard.writeText(url);
    } catch {
      /* user cancelled */
    }
  };

  const spotsSuffix = pod.no_of_spots > 0 ? `/${pod.no_of_spots}` : '';

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
      <ExploreMediaCarousel
        media={pod.pod_images_and_videos ?? []}
        fallbackUrl={cover}
        alt={pod.pod_title}
      />

      <ExplorePodOverlay pod={pod} club={club} location={location} />

      <ExploreActionRail
        actions={[
          {
            key: 'join',
            icon: expired ? <InfoOutlinedIcon /> : <HowToRegIcon />,
            label: expired ? 'Expired' : `${pod.pod_attendees?.length ?? 0}${spotsSuffix}`,
            onClick: openPod,
            tooltip: expired ? 'This pod is expired.' : 'Join',
          },
          {
            key: 'like',
            icon: liked ? <FavoriteIcon /> : <FavoriteBorderIcon />,
            label: String(likeCount),
            onClick: onLike,
            active: liked,
            onLabelClick: likeCount > 0 ? () => setLikersOpen(true) : undefined,
          },
          {
            key: 'comment',
            icon: <CommentIcon />,
            label: String(commentCount),
            onClick: () => setCommentsOpen(true),
          },
          {
            key: 'save',
            icon: saved ? <BookmarkIcon /> : <BookmarkBorderIcon />,
            label: 'Save',
            onClick: onToggleSave,
            active: saved,
            loading: savePending,
          },
          { key: 'share', icon: <ShareIcon />, label: 'Share', onClick: share },
          { key: 'open', icon: <OpenInNewIcon />, label: 'Open', onClick: openPod },
        ]}
      />

      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        sx={{
          position: 'absolute',
          left: 10,
          right: 10,
          bottom: 'var(--duncit-bottom-nav-overlay-offset, 88px)',
          p: 0.75,
          borderRadius: 3,
          bgcolor: 'rgba(0,0,0,0.42)',
          border: '1px solid rgba(255,255,255,0.12)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: 'primary.main', display: 'grid', placeItems: 'center' }}>
          {expired ? <InfoOutlinedIcon sx={{ fontSize: 19 }} /> : <FlashOnIcon sx={{ fontSize: 19 }} />}
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 900, lineHeight: 1.1 }} noWrap>
            {expired ? 'This pod is expired' : 'Join in 2 taps'}
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.82 }} noWrap>
            {expired ? 'You can still view the pod details.' : ctaSubtitle}
          </Typography>
        </Box>
        {!expired && (
          <Button
            variant="contained"
            endIcon={<ArrowForwardIcon />}
            onClick={() => pod.club_slug && pod.pod_id && navigate(`/club/${pod.club_slug}/pod/${pod.pod_id}`)}
            sx={{ minWidth: 48, borderRadius: 2.5, px: 1.2 }}
            aria-label="Open pod details"
          >
            Go
          </Button>
        )}
      </Stack>

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
