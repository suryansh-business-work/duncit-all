import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import ShareIcon from '@mui/icons-material/Share';
import {
  POD_IDEA_DETAILS,
  SET_STATUS,
  DELETE_COMMENT,
  statusColor,
} from './queries';

interface DetailsProps {
  id: string;
  onClose: () => void;
  onChanged: () => void;
}

export default function DetailsDialog({ id, onClose, onChanged }: DetailsProps) {
  const { data, loading, refetch } = useQuery(POD_IDEA_DETAILS, {
    variables: { id },
    fetchPolicy: 'cache-and-network',
  });
  const idea = data?.podIdea;
  const [setStatusMut] = useMutation(SET_STATUS);
  const [deleteCommentMut, { loading: deletingComment }] = useMutation(DELETE_COMMENT);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDeleteComment = async () => {
    if (!confirmDeleteId) return;
    await deleteCommentMut({ variables: { id, commentId: confirmDeleteId } });
    setConfirmDeleteId(null);
    await refetch();
    onChanged();
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ pr: 6 }}>
        {idea?.title ?? 'Pod idea'}
        {idea && (
          <Chip
            size="small"
            sx={{ ml: 1.5 }}
            label={idea.status}
            color={statusColor(idea.status) as any}
          />
        )}
      </DialogTitle>
      <DialogContent dividers>
        {loading && !data ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : !idea ? (
          <Alert severity="warning">Idea not found.</Alert>
        ) : (
          <>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
              <Avatar
                src={idea.author?.profile_photo || undefined}
                sx={{ width: 40, height: 40 }}
              >
                {(idea.author?.full_name?.[0] ?? 'U').toUpperCase()}
              </Avatar>
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  {idea.author?.full_name ?? 'Member'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {idea.author?.email ?? ''} · {new Date(idea.created_at).toLocaleString()}
                </Typography>
              </Box>
            </Stack>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>
              {idea.description}
            </Typography>
            <Stack direction="row" spacing={3} sx={{ mb: 2, color: 'text.secondary' }}>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <FavoriteIcon fontSize="small" />
                <Typography variant="body2">{idea.likes_count} likes</Typography>
              </Stack>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <ChatBubbleOutlineIcon fontSize="small" />
                <Typography variant="body2">{idea.comments_count} comments</Typography>
              </Stack>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <ShareIcon fontSize="small" />
                <Typography variant="body2">{idea.shares_count} shares</Typography>
              </Stack>
            </Stack>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="overline" color="text.secondary">
              Comments
            </Typography>
            <Stack spacing={1.5} sx={{ mt: 1 }}>
              {idea.comments.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No comments yet.
                </Typography>
              )}
              {idea.comments.map((c: any) => (
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
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => setConfirmDeleteId(c.id)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
            </Stack>
          </>
        )}
      </DialogContent>
      {idea && (
        <DialogActions>
          {idea.status !== 'PENDING' && (
            <Button
              onClick={async () => {
                await setStatusMut({ variables: { id, status: 'PENDING' } });
                await refetch();
                onChanged();
              }}
            >
              Reset to Pending
            </Button>
          )}
          {idea.status !== 'REJECTED' && (
            <Button
              color="warning"
              onClick={async () => {
                await setStatusMut({ variables: { id, status: 'REJECTED' } });
                await refetch();
                onChanged();
              }}
            >
              Reject
            </Button>
          )}
          {idea.status !== 'APPROVED' && (
            <Button
              variant="contained"
              color="success"
              onClick={async () => {
                await setStatusMut({ variables: { id, status: 'APPROVED' } });
                await refetch();
                onChanged();
              }}
            >
              Approve
            </Button>
          )}
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      )}
      <Dialog
        open={!!confirmDeleteId}
        onClose={() => (deletingComment ? undefined : setConfirmDeleteId(null))}
      >
        <DialogTitle>Delete this comment?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            This permanently removes the comment from the idea. You cannot undo this
            action.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteId(null)} disabled={deletingComment}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteComment}
            color="error"
            variant="contained"
            disabled={deletingComment}
          >
            {deletingComment ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
}
