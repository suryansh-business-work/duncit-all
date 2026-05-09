import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  CircularProgress,
  Drawer,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import {
  POD_COMMENTS,
  ADD_POD_COMMENT,
  DELETE_POD_COMMENT,
} from '../../pages/pod-details-page/queries';
import CommentsList from './CommentsList';
import CommentInput from './CommentInput';

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
}: Props) {
  const { data, loading, error, refetch } = useQuery(POD_COMMENTS, {
    variables: { id: podId },
    fetchPolicy: 'cache-and-network',
    skip: !open || !podId,
  });
  const [addComment, addState] = useMutation(ADD_POD_COMMENT);
  const [deleteComment] = useMutation(DELETE_POD_COMMENT);
  const [snack, setSnack] = useState<string | null>(null);

  const comments = useMemo(() => data?.podComments ?? [], [data]);

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
      PaperProps={{
        sx: {
          height: '70vh',
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}
      >
        <Typography variant="h6">Comments</Typography>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Stack>

      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        {loading && !data && (
          <Stack alignItems="center" sx={{ p: 4 }}>
            <CircularProgress size={24} />
          </Stack>
        )}
        {error && <Alert severity="error" sx={{ m: 2 }}>{error.message}</Alert>}
        {!loading && comments.length === 0 && (
          <Typography sx={{ p: 4, textAlign: 'center' }} color="text.secondary">
            Be the first to comment.
          </Typography>
        )}
        <CommentsList comments={comments} viewerId={viewerId} onDelete={onDelete} />
      </Box>

      <CommentInput viewerId={viewerId} posting={addState.loading} onSubmit={onAdd} />
      {snack && (
        <Alert severity="error" onClose={() => setSnack(null)}>
          {snack}
        </Alert>
      )}
    </Drawer>
  );
}
