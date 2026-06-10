import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { Button, Stack } from '@mui/material';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import CommentIcon from '@mui/icons-material/Comment';
import { TOGGLE_POD_LIKE } from './queries';
import PodCommentsSheet from '../../components/PodCommentsSheet';

interface Props {
  podId: string;
  initialLiked: boolean;
  initialLikeCount: number;
  initialCommentCount: number;
  viewerId?: string | null;
}

export default function PodSocialBar({
  podId,
  initialLiked,
  initialLikeCount,
  initialCommentCount,
  viewerId,
}: Readonly<Props>) {
  const [liked, setLiked] = useState(!!initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount || 0);
  const [commentCount, setCommentCount] = useState(initialCommentCount || 0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [toggleLike] = useMutation(TOGGLE_POD_LIKE);

  const onLike = async () => {
    const prev = liked;
    setLiked(!prev);
    setLikeCount((c) => c + (prev ? -1 : 1));
    try {
      const res = await toggleLike({ variables: { id: podId } });
      setLiked(!!res.data?.togglePodLike?.liked_by_me);
      setLikeCount(res.data?.togglePodLike?.like_count ?? likeCount);
    } catch {
      setLiked(prev);
      setLikeCount((c) => c + (prev ? 1 : -1));
    }
  };

  return (
    <>
      <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', gap: 1 }}>
        <Button
          variant={liked ? 'contained' : 'outlined'}
          color={liked ? 'error' : 'inherit'}
          startIcon={liked ? <FavoriteIcon /> : <FavoriteBorderIcon />}
          onClick={onLike}
        >
          {liked ? 'Liked' : 'Like'} · {likeCount}
        </Button>
        <Button
          variant="outlined"
          color="inherit"
          startIcon={<CommentIcon />}
          onClick={() => setCommentsOpen(true)}
        >
          Comment · {commentCount}
        </Button>
      </Stack>
      <PodCommentsSheet
        podId={podId}
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        viewerId={viewerId}
        onCountChange={(d) => setCommentCount((c) => Math.max(0, c + d))}
      />
    </>
  );
}
