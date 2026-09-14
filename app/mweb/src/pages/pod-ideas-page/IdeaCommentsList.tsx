import { Avatar, Box, Stack, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { DuncitIconButton } from '@duncit/buttons';
import { formatRelative } from './queries';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  comments: any[];
  ideaAuthorId?: string;
  myId?: string;
  onDelete: (commentId: string) => void;
}

export default function IdeaCommentsList({
  comments,
  ideaAuthorId,
  myId,
  onDelete,
}: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={1.5} data-testid="idea-comments-list" sx={{ mt: 1, maxHeight: 320, overflowY: 'auto' }}>
      {comments.length === 0 && (
        <Typography variant="body2" data-testid="idea-comments-empty" sx={{
          color: "text.secondary"
        }}>
          No comments yet — be the first.
        </Typography>
      )}
      {comments.map((c: any) => {
        const canDelete = myId && (c.author_id === myId || ideaAuthorId === myId);
        return (
          <Stack key={c.id} direction="row" spacing={1.5} data-testid={`idea-comment-${c.id}`} sx={{
            alignItems: "flex-start"
          }}>
            <Avatar src={c.author?.profile_photo || undefined} alt="" sx={{ width: 32, height: 32 }}>
              {(c.author?.first_name?.[0] ?? 'U').toUpperCase()}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" spacing={1} sx={{
                alignItems: "baseline"
              }}>
                <Typography variant="body2" sx={{
                  fontWeight: 600
                }}>
                  {c.author?.full_name ?? 'Member'}
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
            {canDelete && (
              <DuncitIconButton
                size="small"
                aria-label={t('mweb.common.deleteComment')}
                onClick={() => onDelete(c.id)}
                data-testid={`idea-comment-delete-${c.id}`}
              >
                <DeleteIcon fontSize="small" />
              </DuncitIconButton>
            )}
          </Stack>
        );
      })}
    </Stack>
  );
}
