import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Avatar,
  Box,
  CircularProgress,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import {
  POD_COMMENTS,
  ADD_POD_COMMENT,
  DELETE_POD_COMMENT,
} from '../pages/pod-details-page/queries';

interface Props {
  podId: string;
  open: boolean;
  onClose: () => void;
  viewerId?: string | null;
  onCountChange?: (delta: number) => void;
}

const commentSchema = Yup.object({
  text: Yup.string().trim().required('Required').max(1000, 'Max 1000 chars'),
});

const formatRelative = (iso: string) => {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString();
};

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
        <IconButton onClick={onClose}><CloseIcon /></IconButton>
      </Stack>

      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        {loading && !data && (
          <Stack alignItems="center" sx={{ p: 4 }}><CircularProgress size={24} /></Stack>
        )}
        {error && <Alert severity="error" sx={{ m: 2 }}>{error.message}</Alert>}
        {!loading && comments.length === 0 && (
          <Typography sx={{ p: 4, textAlign: 'center' }} color="text.secondary">
            Be the first to comment.
          </Typography>
        )}
        <List>
          {comments.map((c: any) => (
            <ListItem
              key={c.id}
              alignItems="flex-start"
              secondaryAction={
                viewerId && c.author_id === viewerId ? (
                  <IconButton edge="end" onClick={() => onDelete(c.id)} size="small">
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                ) : null
              }
            >
              <ListItemAvatar>
                <Avatar src={c.author_photo || undefined}>
                  {(c.author_name || '?').slice(0, 1).toUpperCase()}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="subtitle2">
                      {c.author_name || 'Anon'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatRelative(c.created_at)}
                    </Typography>
                  </Stack>
                }
                secondary={
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {c.text}
                  </Typography>
                }
              />
            </ListItem>
          ))}
        </List>
      </Box>

      <Formik
        initialValues={{ text: '' }}
        validationSchema={commentSchema}
        onSubmit={onAdd}
      >
        {({ values, handleChange, errors, touched }) => (
          <Form>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{
                p: 1.5,
                borderTop: 1,
                borderColor: 'divider',
                pb: 'calc(env(safe-area-inset-bottom) + 12px)',
              }}
            >
              <TextField
                name="text"
                value={values.text}
                onChange={handleChange}
                fullWidth
                size="small"
                placeholder={viewerId ? 'Add a comment…' : 'Sign in to comment'}
                disabled={!viewerId}
                error={touched.text && !!errors.text}
                helperText={touched.text && errors.text}
              />
              <IconButton
                color="primary"
                type="submit"
                disabled={!viewerId || addState.loading || !values.text.trim()}
              >
                <SendIcon />
              </IconButton>
            </Stack>
          </Form>
        )}
      </Formik>
      {snack && <Alert severity="error" onClose={() => setSnack(null)}>{snack}</Alert>}
    </Drawer>
  );
}
