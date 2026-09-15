import { Link as RouterLink } from 'react-router';
import { Avatar, Box, Card, Stack, Typography } from '@mui/material';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutlineRounded';
import FavoriteIcon from '@mui/icons-material/FavoriteRounded';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorderRounded';
import GroupsIcon from '@mui/icons-material/Groups';
import { DuncitIconButton } from '@duncit/buttons';
import { formatDistanceToNow } from 'date-fns';
import { getFeedCardHeader } from './feedHeader';
import type { FeedClub, FeedPost } from './queries';
import { useTranslation } from '../../i18n/useTranslation';

interface FeedPostCardProps {
  post: FeedPost;
  club?: FeedClub | null;
  onToggleLike: (post: FeedPost) => void;
  onOpenComments: (postId: string) => void;
}

/** The media sits inset in the card with its own 18px corners. */
const MEDIA_SX = {
  width: 'calc(100% - 24px)',
  mx: 1.5,
  maxHeight: 440,
  borderRadius: '18px',
  display: 'block',
} as const;

export default function FeedPostCard({
  post,
  club,
  onToggleLike,
  onOpenComments,
}: Readonly<FeedPostCardProps>) {
  const { t } = useTranslation();
  const header = getFeedCardHeader(post, club);
  const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: true });
  const avatarFallback = club ? (
    <GroupsIcon fontSize="small" />
  ) : (
    (header.name[0] ?? 'U').toUpperCase()
  );

  return (
    <Card data-testid={`feed-post-${post.id}`} sx={{ overflow: 'hidden' }}>
      <Stack
        data-testid={`feed-author-${post.id}`}
        direction="row"
        spacing={1.25}
        component={RouterLink}
        to={header.to}
        sx={{
          alignItems: 'center',
          minWidth: 0,
          p: 1.5,
          textDecoration: 'none',
          color: 'inherit',
        }}
      >
        <Avatar
          alt=""
          src={header.avatarUrl ?? undefined}
          sx={{ width: 40, height: 40, bgcolor: 'primary.main', color: 'primary.contrastText', fontWeight: 600 }}
        >
          {avatarFallback}
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, lineHeight: 1.2 }} noWrap>
            {header.name}
          </Typography>
          <Typography variant="caption" noWrap sx={{ color: 'text.secondary', fontWeight: 500 }}>
            {timeAgo}
          </Typography>
        </Box>
      </Stack>

      {post.media_type === 'VIDEO' ? (
        // eslint-disable-next-line jsx-a11y/media-has-caption -- user-uploaded media; no caption track exists in the data model
        <Box
          component="video"
          src={post.image_url}
          controls
          playsInline
          preload="metadata"
          sx={{ ...MEDIA_SX, bgcolor: 'common.black' }}
        />
      ) : (
        <Box
          component="img"
          src={post.image_url}
          alt={post.caption || 'post'}
          loading="lazy"
          sx={{ ...MEDIA_SX, objectFit: 'cover', bgcolor: 'action.hover' }}
        />
      )}

      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', px: 1, pt: 0.5 }}>
        <DuncitIconButton
          data-testid={`feed-like-${post.id}`}
          aria-label={post.liked_by_me ? t('mweb.a11y.unlike') : t('mweb.explore.like')}
          onClick={() => onToggleLike(post)}
          color={post.liked_by_me ? 'secondary' : 'default'}
        >
          {post.liked_by_me ? <FavoriteIcon /> : <FavoriteBorderIcon />}
        </DuncitIconButton>
        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
          {post.likes_count}
        </Typography>
        <DuncitIconButton data-testid={`feed-comment-${post.id}`} aria-label={t('mweb.common.comments')} onClick={() => onOpenComments(post.id)} sx={{ ml: 0.5 }}>
          <ChatBubbleOutlineIcon />
        </DuncitIconButton>
        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
          {post.comments_count}
        </Typography>
      </Stack>

      {post.caption && (
        <Typography variant="body2" sx={{ px: 2, pb: 1.75 }}>
          {post.caption}
        </Typography>
      )}
      {!post.caption && <Box sx={{ pb: 1 }} />}
    </Card>
  );
}
