import { Avatar, Box, IconButton, Stack, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { formatRelative } from './queries';

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
  return (
    <Stack spacing={1.5} sx={{ mt: 1, maxHeight: 320, overflowY: 'auto' }}>
      {comments.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No comments yet — be the first.
        </Typography>
      )}
      {comments.map((c: any) => {
        const canDelete = myId && (c.author_id === myId || ideaAuthorId === myId);
        return (
          <Stack key={c.id} direction="row" spacing={1.5} alignItems="flex-start">
            <Avatar src={c.author?.profile_photo || undefined} sx={{ width: 32, height: 32 }}>
              {(c.author?.first_name?.[0] ?? 'U').toUpperCase()}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" spacing={1} alignItems="baseline">
                <Typography variant="body2" fontWeight={600}>
                  {c.author?.full_name ?? 'Member'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatRelative(c.created_at)}
                </Typography>
              </Stack>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {c.text}
              </Typography>
            </Box>
            {canDelete && (
              <IconButton size="small" onClick={() => onDelete(c.id)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            )}
          </Stack>
        );
      })}
    </Stack>
  );
}
