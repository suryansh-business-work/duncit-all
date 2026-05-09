import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@apollo/client';
import { Box, Stack } from '@mui/material';
import ShareIcon from '@mui/icons-material/Share';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import CommentIcon from '@mui/icons-material/Comment';
import { TOGGLE_POD_LIKE } from '../pod-details-page/queries';
import ExploreActionButton from './ExploreActionButton';
import ExploreMediaCarousel from './ExploreMediaCarousel';
import ExplorePodOverlay from './ExplorePodOverlay';
import PodCommentsSheet from '../../components/PodCommentsSheet';

interface Props {
  pod: any;
  club: any;
  location: any;
  saved: boolean;
  onToggleSave: () => void;
  viewerId?: string | null;
}

export default function ExplorePodCard({
  pod,
  club,
  location,
  saved,
  onToggleSave,
  viewerId,
}: Props) {
  const navigate = useNavigate();
  const cover = club?.club_feature_images_and_videos?.[0]?.url ?? null;
  const [liked, setLiked] = useState<boolean>(!!pod.liked_by_me);
  const [likeCount, setLikeCount] = useState<number>(pod.like_count ?? 0);
  const [commentCount, setCommentCount] = useState<number>(pod.comment_count ?? 0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [toggleLike] = useMutation(TOGGLE_POD_LIKE);

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

  const share = async () => {
    const url = `${window.location.origin}/pods/${pod.id}`;
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

  return (
    <Box
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

      <Stack
        spacing={1.5}
        alignItems="center"
        sx={{
          position: 'absolute',
          right: 12,
          bottom: 'calc(80px + env(safe-area-inset-bottom))',
        }}
      >
        <ExploreActionButton
          icon={<HowToRegIcon />}
          label={`${pod.pod_attendees?.length ?? 0}${pod.no_of_spots > 0 ? `/${pod.no_of_spots}` : ''}`}
          onClick={() => navigate(`/pods/${pod.id}`)}
          tooltip="Join"
        />
        <ExploreActionButton
          icon={liked ? <FavoriteIcon /> : <FavoriteBorderIcon />}
          label={String(likeCount)}
          onClick={onLike}
          active={liked}
        />
        <ExploreActionButton
          icon={<CommentIcon />}
          label={String(commentCount)}
          onClick={() => setCommentsOpen(true)}
        />
        <ExploreActionButton
          icon={saved ? <BookmarkIcon /> : <BookmarkBorderIcon />}
          label="Save"
          onClick={onToggleSave}
          active={saved}
        />
        <ExploreActionButton icon={<ShareIcon />} label="Share" onClick={share} />
        <ExploreActionButton
          icon={<OpenInNewIcon />}
          label="Open"
          onClick={() => navigate(`/pods/${pod.id}`)}
        />
      </Stack>

      <PodCommentsSheet
        podId={pod.id}
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        viewerId={viewerId}
        onCountChange={(d) => setCommentCount((c) => Math.max(0, c + d))}
      />
    </Box>
  );
}
