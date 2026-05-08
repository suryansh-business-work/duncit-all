import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@apollo/client';
import { Box, Chip, Stack, Typography } from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';
import EventIcon from '@mui/icons-material/Event';
import PlaceIcon from '@mui/icons-material/Place';
import ShareIcon from '@mui/icons-material/Share';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import CommentIcon from '@mui/icons-material/Comment';
import { usePricing } from '../../hooks/usePricing';
import { TOGGLE_POD_LIKE } from '../pod-details-page/queries';
import ExploreActionButton from './ExploreActionButton';
import ExploreMediaCarousel from './ExploreMediaCarousel';
import PodCommentsSheet from '../../components/PodCommentsSheet';

interface Props {
  pod: any;
  club: any;
  location: any;
  saved: boolean;
  onToggleSave: () => void;
  viewerId?: string | null;
}

export default function ExplorePodCard({ pod, club, location, saved, onToggleSave, viewerId }: Props) {
  const navigate = useNavigate();
  const { format } = usePricing();
  const isFree = pod.pod_type?.includes('FREE');
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

      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.85) 100%)',
          pointerEvents: 'none',
        }}
      />

      <Stack
        sx={{
          position: 'absolute',
          left: 16,
          right: 80,
          bottom: 'calc(72px + env(safe-area-inset-bottom))',
        }}
        spacing={1}
      >
        {club && (
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ cursor: 'pointer' }}
            onClick={() => navigate(`/clubs/${club.id}`)}
          >
            <GroupsIcon fontSize="small" />
            <Typography variant="subtitle2" fontWeight={700}>
              {club.club_name}
            </Typography>
          </Stack>
        )}
        <Typography variant="h6" fontWeight={700}>{pod.pod_title}</Typography>
        {pod.pod_description && (
          <Typography
            variant="body2"
            sx={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              opacity: 0.9,
            }}
          >
            {pod.pod_description}
          </Typography>
        )}
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Chip
            size="small"
            label={isFree ? 'Free' : format(pod.pod_amount)}
            color={isFree ? 'success' : 'primary'}
            sx={{ color: 'common.white' }}
          />
          {pod.pod_date_time && (
            <Chip
              size="small"
              icon={<EventIcon sx={{ color: 'common.white !important' }} />}
              label={new Date(pod.pod_date_time).toLocaleString(undefined, {
                day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
              })}
              sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'common.white' }}
            />
          )}
          {(location?.location_name || pod.zone_name) && (
            <Chip
              size="small"
              icon={<PlaceIcon sx={{ color: 'common.white !important' }} />}
              label={[location?.location_name, pod.zone_name].filter(Boolean).join(' · ')}
              sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'common.white' }}
            />
          )}
        </Stack>
      </Stack>

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
