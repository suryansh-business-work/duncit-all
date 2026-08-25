import {
  Avatar,
  Box,
  Divider,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { formatDateTime } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';

interface Props {
  comments: any[];
  onDelete: (commentId: string) => void;
}

export default function IdeaCommentsList({ comments, onDelete }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <>
      <Divider sx={{ mb: 2 }} />
      <Typography variant="overline" sx={{
        color: "text.secondary"
      }}>
        {t('admin.podIdeas.colComments')}
      </Typography>
      <Stack spacing={1.5} sx={{ mt: 1 }}>
        {comments.length === 0 && (
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            No comments yet.
          </Typography>
        )}
        {comments.map((c) => (
          <Stack key={c.id} direction="row" spacing={1.5} sx={{
            alignItems: "flex-start"
          }}>
            <Avatar sx={{ width: 32, height: 32 }}>
              {(c.author?.full_name?.[0] ?? 'U').toUpperCase()}
            </Avatar>
            <Box sx={{ flex: 1 }}>
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
                  {formatDateTime(c.created_at)}
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
