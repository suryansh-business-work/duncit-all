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
  Stack,
  Typography,
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import ShareIcon from '@mui/icons-material/Share';
import { StatusChip } from '@duncit/ui';
import {
  POD_IDEA_DETAILS,
  SET_STATUS,
  DELETE_COMMENT,
  STATUS_COLOR_MAP,
} from './queries';
import IdeaCommentsList from './IdeaCommentsList';
import IdeaActionsBar from './IdeaActionsBar';

interface DetailsProps {
  id: string;
  onClose: () => void;
  onChanged: () => void;
}

export default function DetailsDialog({ id, onClose, onChanged }: Readonly<DetailsProps>) {
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

  const setStatus = async (next: string) => {
    await setStatusMut({ variables: { id, status: next } });
    await refetch();
    onChanged();
  };

  const detailsContent = idea ? (
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
      <IdeaCommentsList comments={idea.comments} onDelete={setConfirmDeleteId} />
    </>
  ) : (
    <Alert severity="warning">Idea not found.</Alert>
  );

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ pr: 6 }}>
        {idea?.title ?? 'Pod idea'}
        {idea && (
          <StatusChip
            status={idea.status}
            sx={{ ml: 1.5 }}
            fallbackColor="warning"
            colorMap={STATUS_COLOR_MAP}
          />
        )}
      </DialogTitle>
      <DialogContent dividers>
        {loading && !data ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          detailsContent
        )}
      </DialogContent>
      {idea && <IdeaActionsBar status={idea.status} onSetStatus={setStatus} onClose={onClose} />}

      <Dialog
        open={!!confirmDeleteId}
        onClose={() => (deletingComment ? undefined : setConfirmDeleteId(null))}
      >
        <DialogTitle>Delete this comment?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            This permanently removes the comment from the idea. You cannot undo this action.
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
