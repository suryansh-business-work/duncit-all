import type { KeyboardEvent } from 'react';
import { Avatar, Box, List, ListItem, Stack, Typography } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import { DuncitIconButton } from '@duncit/buttons';
import { formatRelative } from './helpers';
import { useTranslation } from '../../i18n/useTranslation';

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
  const { t } = useTranslation();
  return (
    <List>
      {comments.map((c: any) => {
        const mine = !!viewerId && c.author_id === viewerId;
        const liked = !!c.liked_by_me;
        const authorName = c.author_name || t('mweb.podDetails.anon');
        return (
          <ListItem key={c.id} alignItems="flex-start" sx={{ gap: 1.25, '&:hover .ph-del': { opacity: 1 } }}>
            <Avatar
              src={c.author_photo || undefined}
              onClick={() => onOpenProfile(c.author_id)}
              onKeyDown={activateOnKey(() => onOpenProfile(c.author_id))}
              role="button"
              tabIndex={0}
              aria-label={t('mweb.podDetails.openProfileOf', { vars: { name: authorName } })}
              sx={{ cursor: 'pointer', flex: '0 0 auto', width: 36, height: 36, bgcolor: 'action.hover', color: 'text.primary' }}
            >
              {(c.author_name || '?').slice(0, 1).toUpperCase()}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0, px: 1.5, py: 1, borderRadius: '16px', bgcolor: 'action.hover' }}>
              <Stack direction="row" spacing={1} sx={{
                alignItems: "center"
              }}>
                <Typography
                  variant="subtitle2"
                  onClick={() => onOpenProfile(c.author_id)}
                  onKeyDown={activateOnKey(() => onOpenProfile(c.author_id))}
                  role="button"
                  tabIndex={0}
                  sx={{ cursor: 'pointer' }}
                >
                  {authorName}
                </Typography>
                <Typography variant="caption" sx={{
                  color: "text.secondary"
                }}>
                  {formatRelative(c.created_at)}
                </Typography>
              </Stack>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {c.text}
              </Typography>
            </Box>
            <Stack
              sx={{
                alignItems: "center",
                flex: '0 0 auto'
              }}>
              <DuncitIconButton
                size="small"
                aria-label={t('mweb.podDetails.likeComment')}
                onClick={() => onToggleLike(c.id)}
              >
                {liked ? (
                  <FavoriteIcon fontSize="small" color="secondary" />
                ) : (
                  <FavoriteBorderIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                )}
              </DuncitIconButton>
              {c.like_count > 0 && (
                <Typography variant="caption" color={liked ? 'secondary.main' : 'text.secondary'}>
                  {c.like_count}
                </Typography>
              )}
              {mine && (
                <DuncitIconButton
                  className="ph-del"
                  size="small"
                  aria-label={t('mweb.podDetails.deleteComment')}
                  onClick={() => onRequestDelete(c.id)}
                  sx={{ opacity: { xs: 1, md: 0 }, transition: 'opacity 150ms' }}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </DuncitIconButton>
              )}
            </Stack>
          </ListItem>
        );
      })}
    </List>
  );
}
