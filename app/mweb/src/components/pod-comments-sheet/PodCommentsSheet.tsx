import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, CircularProgress, Drawer, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { DuncitIconButton } from '@duncit/buttons';
import {
  POD_COMMENTS,
  ADD_POD_COMMENT,
  DELETE_POD_COMMENT,
  TOGGLE_POD_COMMENT_LIKE,
} from '../../pages/pod-details-page/queries';
import ConfirmDialog from '../ConfirmDialog';
import CommentsList from './CommentsList';
import CommentInput from './CommentInput';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  podId: string;
  open: boolean;
  onClose: () => void;
  viewerId?: string | null;
  onCountChange?: (delta: number) => void;
}

export default function PodCommentsSheet({
  podId,
  open,
  onClose,
  viewerId,
  onCountChange,
}: Readonly<Props>) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data, loading, error, refetch } = useQuery<any>(POD_COMMENTS, {
    variables: { id: podId },
    fetchPolicy: 'cache-and-network',
    skip: !open || !podId,
  });
  const [addComment, addState] = useMutation<any>(ADD_POD_COMMENT);
  const [deleteComment] = useMutation<any>(DELETE_POD_COMMENT);
  const [toggleCommentLike] = useMutation<any>(TOGGLE_POD_COMMENT_LIKE);
  const [snack, setSnack] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const comments = useMemo(() => data?.podComments ?? [], [data]);

  const onToggleLike = async (commentId: string) => {
    try {
      await toggleCommentLike({ variables: { id: podId, comment_id: commentId } });
      await refetch();
    } catch (e: any) {
      setSnack(e.message);
    }
  };

  const onConfirmDelete = async () => {
    const id = deleteId;
    setDeleteId(null);
    if (!id) return;
    await onDelete(id);
  };

  const openProfile = (authorId: string) => {
    onClose();
    navigate(`/u/${authorId}`);
  };

  const onAdd = async (values: { text: string }, helpers: any) => {
    try {
      await addComment({ variables: { id: podId, text: values.text.trim() } });
      helpers.resetForm();
      onCountChange?.(1);
      await refetch();
    } catch (e: any) {
      setSnack(e.message);
    }
  };

  const onDelete = async (commentId: string) => {
    try {
      await deleteComment({ variables: { id: podId, comment_id: commentId } });
      onCountChange?.(-1);
      await refetch();
    } catch (e: any) {
      setSnack(e.message);
    }
  };

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            height: '70vh',
            borderTopLeftRadius: '16px',
            borderTopRightRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
          },
        }
      }}
    >
      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          justifyContent: "space-between",
          px: 2,
          py: 1.5,
          borderBottom: 1,
          borderColor: 'divider'
        }}>
        <Typography variant="h6">{t('mweb.podDetails.comments')}</Typography>
        <DuncitIconButton onClick={onClose}>
          <CloseIcon />
        </DuncitIconButton>
      </Stack>

      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        {loading && !data && (
          <Stack
            sx={{
              alignItems: "center",
              p: 4
            }}>
            <CircularProgress size={24} />
          </Stack>
        )}
        {error && <Alert severity="error" sx={{ m: 2 }}>{error.message}</Alert>}
        {!loading && comments.length === 0 && (
          <Typography
            sx={{
              color: "text.secondary",
              p: 4,
              textAlign: 'center'
            }}>
            {t('mweb.podDetails.commentsEmpty')}
          </Typography>
        )}
        <CommentsList
          comments={comments}
          viewerId={viewerId}
          onToggleLike={onToggleLike}
          onRequestDelete={setDeleteId}
          onOpenProfile={openProfile}
        />
      </Box>

      <CommentInput viewerId={viewerId} posting={addState.loading} onSubmit={onAdd} />
      {snack && (
        <Alert severity="error" onClose={() => setSnack(null)}>
          {snack}
        </Alert>
      )}
      <ConfirmDialog
        open={!!deleteId}
        title={t('mweb.podDetails.deleteCommentTitle')}
        message={t('mweb.podDetails.deleteCommentBody')}
        confirmLabel={t('mweb.podDetails.delete')}
        cancelLabel={t('mweb.podDetails.cancel')}
        destructive
        onConfirm={onConfirmDelete}
        onClose={() => setDeleteId(null)}
      />
    </Drawer>
  );
}
