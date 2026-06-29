import type { KeyboardEvent } from 'react';
import { Avatar, Box, IconButton, List, ListItem, Stack, Typography } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import { formatRelative } from './helpers';

const activateOnKey = (fn: () => void) => (e: KeyboardEvent) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    fn();
  }
};

interface Props {
  comments: any[];
  viewerId?: string | null;
  onToggleLike: (commentId: string) => void;
  onRequestDelete: (commentId: string) => void;
  onOpenProfile: (authorId: string) => void;
}

export default function CommentsList({
  comments,
  viewerId,
  onToggleLike,
  onRequestDelete,
  onOpenProfile,
}: Readonly<Props>) {
  return (
    <List>
      {comments.map((c: any) => {
        const mine = !!viewerId && c.author_id === viewerId;
        const liked = !!c.liked_by_me;
        return (
          <ListItem key={c.id} alignItems="flex-start" sx={{ gap: 1.25, '&:hover .ph-del': { opacity: 1 } }}>
            <Avatar
              src={c.author_photo || undefined}
              onClick={() => onOpenProfile(c.author_id)}
              onKeyDown={activateOnKey(() => onOpenProfile(c.author_id))}
              role="button"
              tabIndex={0}
              aria-label={`Open ${c.author_name || 'user'} profile`}
              sx={{ cursor: 'pointer', flex: '0 0 auto' }}
            >
              {(c.author_name || '?').slice(0, 1).toUpperCase()}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography
                  variant="subtitle2"
                  onClick={() => onOpenProfile(c.author_id)}
                  onKeyDown={activateOnKey(() => onOpenProfile(c.author_id))}
                  role="button"
                  tabIndex={0}
                  sx={{ cursor: 'pointer' }}
                >
                  {c.author_name || 'Anon'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatRelative(c.created_at)}
                </Typography>
              </Stack>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {c.text}
              </Typography>
            </Box>
            <Stack alignItems="center" sx={{ flex: '0 0 auto' }}>
              <IconButton size="small" aria-label="Like comment" onClick={() => onToggleLike(c.id)}>
                {liked ? (
                  <FavoriteIcon fontSize="small" color="primary" />
                ) : (
                  <FavoriteBorderIcon fontSize="small" />
                )}
              </IconButton>
              {c.like_count > 0 && (
                <Typography variant="caption" color={liked ? 'primary.main' : 'text.secondary'}>
                  {c.like_count}
                </Typography>
              )}
              {mine && (
                <IconButton
                  className="ph-del"
                  size="small"
                  aria-label="Delete comment"
                  onClick={() => onRequestDelete(c.id)}
                  sx={{ opacity: { xs: 1, md: 0 }, transition: 'opacity 150ms' }}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              )}
            </Stack>
          </ListItem>
        );
      })}
    </List>
  );
}
