import { Link as RouterLink } from 'react-router-dom';
import { Avatar, Box, Card, Chip, IconButton, Stack, Typography } from '@mui/material';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import GroupsIcon from '@mui/icons-material/Groups';
import { formatDistanceToNow } from 'date-fns';
import { getFeedCardHeader } from './feedHeader';
import type { FeedClub, FeedPost } from './queries';

interface FeedPostCardProps {
  post: FeedPost;
  club?: FeedClub | null;
  onToggleLike: (post: FeedPost) => void;
  onOpenComments: (postId: string) => void;
}

export default function FeedPostCard({
  post,
  club,
  onToggleLike,
  onOpenComments,
}: Readonly<FeedPostCardProps>) {
  const header = getFeedCardHeader(post, club);
  const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: true });
  const avatarFallback = club ? (
    <GroupsIcon fontSize="small" />
  ) : (
    (header.name[0] ?? 'U').toUpperCase()
  );

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 4,
        overflow: 'hidden',
        bgcolor: 'background.paper',
        boxShadow: '0 18px 42px rgba(9,7,18,0.14)',
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ p: 1.25 }}>
        <Stack
          direction="row"
          alignItems="center"
          spacing={1.25}
          component={RouterLink}
          to={header.to}
          sx={{ minWidth: 0, flex: 1, textDecoration: 'none', color: 'inherit' }}
        >
          <Avatar
            src={header.avatarUrl ?? undefined}
            sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}
          >
            {avatarFallback}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 900, lineHeight: 1.15 }} noWrap>
              {header.name}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }} noWrap>
              {timeAgo}
            </Typography>
          </Box>
        </Stack>
        {post.kind === 'STORY' && (
          <Chip size="small" color="secondary" label="STORY" sx={{ height: 22, fontWeight: 900 }} />
        )}
      </Stack>

      {post.media_type === 'VIDEO' ? (
        <Box
          component="video"
          src={post.image_url}
          controls
          playsInline
          preload="metadata"
          sx={{ width: '100%', maxHeight: 440, bgcolor: 'common.black', display: 'block' }}
        />
      ) : (
        <Box
          component="img"
          src={post.image_url}
          alt={post.caption || 'post'}
          loading="lazy"
          sx={{
            width: '100%',
            maxHeight: 440,
            objectFit: 'cover',
            display: 'block',
            bgcolor: 'action.hover',
          }}
        />
      )}

      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ px: 0.75, py: 0.25 }}>
        <IconButton
          aria-label={post.liked_by_me ? 'Unlike' : 'Like'}
          onClick={() => onToggleLike(post)}
          color={post.liked_by_me ? 'error' : 'default'}
        >
          {post.liked_by_me ? <FavoriteIcon /> : <FavoriteBorderIcon />}
        </IconButton>
        <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
          {post.likes_count}
        </Typography>
        <IconButton aria-label="Comments" onClick={() => onOpenComments(post.id)} sx={{ ml: 0.5 }}>
          <ChatBubbleOutlineIcon />
        </IconButton>
        <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
          {post.comments_count}
        </Typography>
      </Stack>

      {post.caption && (
        <Typography variant="body2" sx={{ px: 1.5, pb: 1.25 }}>
          {post.caption}
        </Typography>
      )}
    </Card>
  );
}
