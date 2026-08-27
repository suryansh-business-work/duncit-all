import { useEffect, useState } from 'react';
import { useMutation } from '@apollo/client';
import { Stack } from '@mui/material';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import CommentIcon from '@mui/icons-material/Comment';
import { DuncitButton } from '@duncit/buttons';
import { TOGGLE_POD_LIKE } from './queries';
import PodCommentsSheet from '../../components/PodCommentsSheet';
import { useTranslation } from '../../i18n/useTranslation';

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
  const { t } = useTranslation();
  const [liked, setLiked] = useState(!!initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount || 0);
  const [commentCount, setCommentCount] = useState(initialCommentCount || 0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [toggleLike] = useMutation(TOGGLE_POD_LIKE);

  // Re-sync when the pod refetches so likes/comments made on the Explore feed
  // are reflected here too.
  useEffect(() => {
    setLiked(!!initialLiked);
    setLikeCount(initialLikeCount || 0);
    setCommentCount(initialCommentCount || 0);
  }, [initialLiked, initialLikeCount, initialCommentCount]);

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

  const likeLabel = liked
    ? t('mweb.podDetails.likedCount', { vars: { count: likeCount } })
    : t('mweb.podDetails.likeCount', { vars: { count: likeCount } });

  return (
    <>
      <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', gap: 1 }}>
        <DuncitButton
          variant={liked ? 'contained' : 'outlined'}
          color={liked ? 'error' : 'inherit'}
          startIcon={liked ? <FavoriteIcon /> : <FavoriteBorderIcon />}
          onClick={onLike}
        >
          {likeLabel}
        </DuncitButton>
        <DuncitButton
          variant="outlined"
          color="inherit"
          startIcon={<CommentIcon />}
          onClick={() => setCommentsOpen(true)}
        >
          {t('mweb.podDetails.commentCount', { vars: { count: commentCount } })}
        </DuncitButton>
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
