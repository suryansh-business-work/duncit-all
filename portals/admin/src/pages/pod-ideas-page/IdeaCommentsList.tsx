import {
  Avatar,
  Box,
  Divider,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

interface Props {
  comments: any[];
  onDelete: (commentId: string) => void;
}

export default function IdeaCommentsList({ comments, onDelete }: Readonly<Props>) {
  return (
    <>
      <Divider sx={{ mb: 2 }} />
      <Typography variant="overline" color="text.secondary">
        Comments
      </Typography>
      <Stack spacing={1.5} sx={{ mt: 1 }}>
        {comments.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            No comments yet.
          </Typography>
        )}
        {comments.map((c) => (
          <Stack key={c.id} direction="row" spacing={1.5} alignItems="flex-start">
            <Avatar sx={{ width: 32, height: 32 }}>
              {(c.author?.full_name?.[0] ?? 'U').toUpperCase()}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Stack direction="row" spacing={1} alignItems="baseline">
                <Typography variant="body2" fontWeight={600}>
                  {c.author?.full_name ?? 'Member'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {new Date(c.created_at).toLocaleString()}
                </Typography>
              </Stack>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {c.text}
              </Typography>
            </Box>
            <IconButton size="small" color="error" onClick={() => onDelete(c.id)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Stack>
        ))}
      </Stack>
    </>
  );
}
