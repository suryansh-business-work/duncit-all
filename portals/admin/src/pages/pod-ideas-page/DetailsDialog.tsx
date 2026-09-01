import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  Alert,
  Avatar,
  Box,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutlined';
import ShareIcon from '@mui/icons-material/Share';
import { DuncitButton } from '@duncit/buttons';
import { StatusChip } from '@duncit/ui';
import {
  POD_IDEA_DETAILS,
  SET_STATUS,
  DELETE_COMMENT,
  STATUS_COLOR_MAP,
} from './queries';
import IdeaCommentsList from './IdeaCommentsList';
import IdeaActionsBar from './IdeaActionsBar';
import { formatDateTime } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';

interface DetailsProps {
  id: string;
  onClose: () => void;
  onChanged: () => void;
}

export default function DetailsDialog({ id, onClose, onChanged }: Readonly<DetailsProps>) {
  const { t } = useTranslation();
  const { data, loading, refetch } = useQuery<any>(POD_IDEA_DETAILS, {
    variables: { id },
    fetchPolicy: 'cache-and-network',
  });
  const idea = data?.podIdea;
  const [setStatusMut] = useMutation<any>(SET_STATUS);
  const [deleteCommentMut, { loading: deletingComment }] = useMutation<any>(DELETE_COMMENT);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDeleteComment = async () => {
    /* v8 ignore next -- unreachable: the Delete button only exists inside the
       confirm Dialog below, which MUI fully unmounts while confirmDeleteId is
       falsy, so this handler is never invoked with a falsy id */
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
      <Stack
        direction="row"
        spacing={1.5}
        sx={{
          alignItems: "center",
          mb: 2
        }}>
        <Avatar
          src={idea.author?.profile_photo || undefined}
          sx={{ width: 40, height: 40 }}
        >
          {(idea.author?.full_name?.[0] ?? 'U').toUpperCase()}
        </Avatar>
        <Box>
          <Typography variant="body2" sx={{
            fontWeight: 600
          }}>
            {idea.author?.full_name ?? 'Member'}
          </Typography>
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>
            {idea.author?.email ?? ''} · {formatDateTime(idea.created_at)}
          </Typography>
        </Box>
      </Stack>
      <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>
        {idea.description}
      </Typography>
      <Stack direction="row" spacing={3} sx={{ mb: 2, color: 'text.secondary' }}>
        <Stack direction="row" spacing={0.5} sx={{
          alignItems: "center"
        }}>
          <FavoriteIcon fontSize="small" />
          <Typography variant="body2">{idea.likes_count} likes</Typography>
        </Stack>
        <Stack direction="row" spacing={0.5} sx={{
          alignItems: "center"
        }}>
          <ChatBubbleOutlineIcon fontSize="small" />
          <Typography variant="body2">{idea.comments_count} comments</Typography>
        </Stack>
        <Stack direction="row" spacing={0.5} sx={{
          alignItems: "center"
        }}>
          <ShareIcon fontSize="small" />
          <Typography variant="body2">{idea.shares_count} shares</Typography>
        </Stack>
      </Stack>
      <IdeaCommentsList comments={idea.comments} onDelete={setConfirmDeleteId} />
    </>
  ) : (
    <Alert severity="warning">{t('admin.podIdeas.notFound')}</Alert>
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
        <DialogTitle>{t('admin.podIdeas.deleteComment')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            This permanently removes the comment from the idea. You cannot undo this action.
          </Typography>
        </DialogContent>
        <DialogActions>
          <DuncitButton onClick={() => setConfirmDeleteId(null)} disabled={deletingComment}>
            {t('shell.common.cancel')}
          </DuncitButton>
          <DuncitButton
            onClick={handleDeleteComment}
            color="error"
            variant="contained"
            disabled={deletingComment}
          >
            {deletingComment ? 'Deleting…' : t('shell.common.delete')}
          </DuncitButton>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
}
