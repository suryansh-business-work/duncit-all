import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import DeleteIcon from '@mui/icons-material/Delete';
import SendIcon from '@mui/icons-material/Send';
import {
  POD_IDEA_DETAILS,
  ADD_COMMENT,
  DELETE_COMMENT,
  TOGGLE_LIKE,
  formatRelative,
} from './queries';

interface DetailsProps {
  id: string;
  myId?: string;
  onClose: () => void;
  onChanged: () => void;
}

export default function IdeaDetailsDialog({ id, myId, onClose, onChanged }: DetailsProps) {
  const { data, loading, refetch } = useQuery(POD_IDEA_DETAILS, {
    variables: { id },
    fetchPolicy: 'cache-and-network',
  });
  const idea = data?.podIdea;
  const [text, setText] = useState('');
  const [addCommentMut, { loading: posting }] = useMutation(ADD_COMMENT);
  const [deleteCommentMut] = useMutation(DELETE_COMMENT);
  const [toggleLikeMut] = useMutation(TOGGLE_LIKE);

  const submit = async () => {
    const t = text.trim();
    if (!t) return;
    try {
      await addCommentMut({ variables: { id, text: t } });
      setText('');
      await refetch();
      onChanged();
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pr: 6 }}>
        {idea?.title ?? 'Pod idea'}
        <IconButton
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
          size="small"
        >
          ×
        </IconButton>
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
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
              <Avatar
                src={idea.author?.profile_photo || undefined}
                sx={{ width: 40, height: 40 }}
              >
                {(idea.author?.first_name?.[0] ?? 'U').toUpperCase()}
              </Avatar>
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  {idea.author?.full_name ?? 'Member'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatRelative(idea.created_at)}
                </Typography>
              </Box>
            </Stack>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>
              {idea.description}
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
              <Button
                size="small"
                startIcon={
                  idea.liked_by_me ? (
                    <FavoriteIcon fontSize="small" sx={{ color: 'error.main' }} />
                  ) : (
                    <FavoriteBorderIcon fontSize="small" />
                  )
                }
                onClick={async () => {
                  await toggleLikeMut({ variables: { id } });
                  await refetch();
                  onChanged();
                }}
                sx={{ color: idea.liked_by_me ? 'error.main' : 'text.secondary' }}
              >
                {idea.likes_count} like{idea.likes_count === 1 ? '' : 's'}
              </Button>
              <Typography variant="caption" color="text.secondary">
                {idea.shares_count} share{idea.shares_count === 1 ? '' : 's'}
              </Typography>
            </Stack>
            <Divider sx={{ mb: 1 }} />
            <Typography variant="overline" color="text.secondary">
              Comments ({idea.comments_count})
            </Typography>
            <Stack spacing={1.5} sx={{ mt: 1, maxHeight: 320, overflowY: 'auto' }}>
              {idea.comments.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No comments yet — be the first.
                </Typography>
              )}
              {idea.comments.map((c: any) => {
                const canDelete =
                  myId && (c.author_id === myId || idea.author_id === myId);
                return (
                  <Stack key={c.id} direction="row" spacing={1.5} alignItems="flex-start">
                    <Avatar
                      src={c.author?.profile_photo || undefined}
                      sx={{ width: 32, height: 32 }}
                    >
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
                      <IconButton
                        size="small"
                        onClick={async () => {
                          await deleteCommentMut({
                            variables: { id, commentId: c.id },
                          });
                          await refetch();
                          onChanged();
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Stack>
                );
              })}
            </Stack>
          </>
        )}
      </DialogContent>
      {idea && myId && (
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Add a comment…"
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 1000))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            disabled={posting}
          />
          <IconButton color="primary" onClick={submit} disabled={posting || !text.trim()}>
            <SendIcon />
          </IconButton>
        </DialogActions>
      )}
    </Dialog>
  );
}
