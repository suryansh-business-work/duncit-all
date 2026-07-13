import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Alert, Box, CircularProgress, Dialog, DialogContent, Stack } from '@mui/material';
import ConfirmDialog from '../../../components/ConfirmDialog';
import {
  ADD_COMMENT,
  DELETE_COMMENT,
  DELETE_POST,
  POST_DETAILS,
  TOGGLE_LIKE,
} from '../queries';
import PostActions from './PostActions';
import PostCommentList from './PostCommentList';
import PostDialogHeader from './PostDialogHeader';
import PostMediaPane from './PostMediaPane';

interface Props {
  postId: string | null;
  meId: string;
  onClose: () => void;
  onDeleted: () => void;
}

export default function PostDialog({ postId, meId, onClose, onDeleted }: Readonly<Props>) {
  const open = !!postId;
  const { data, loading } = useQuery(POST_DETAILS, {
    variables: { id: postId },
    skip: !postId,
    fetchPolicy: 'cache-and-network',
  });
  const [toggleLike] = useMutation(TOGGLE_LIKE);
  const [addComment] = useMutation(ADD_COMMENT);
  const [deleteComment] = useMutation(DELETE_COMMENT);
  const [deletePost] = useMutation(DELETE_POST);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmPostOpen, setConfirmPostOpen] = useState(false);
  const [deletingPost, setDeletingPost] = useState(false);

  const post = data?.post;
  const canDelete = post?.author_id === meId;

  const sortedComments = useMemo(
    () =>
      (post?.comments ?? [])
        .slice()
        .sort(
          (a: any, b: any) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        ),
    [post]
  );

  const onLike = async () => {
    if (!post) return;
    try {
      await toggleLike({ variables: { id: post.id } });
    } catch {
      /* ignore */
    }
  };

  /** Double-tap likes only (never unlikes), reusing the existing toggle. */
  const likeOnDoubleTap = () => {
    if (post && !post.liked_by_me) onLike();
  };

  const onSend = async () => {
    if (!post || !comment.trim()) return;
    setSubmitting(true);
    try {
      await addComment({ variables: { id: post.id, text: comment.trim() } });
      setComment('');
    } catch {
      /* ignore */
    } finally {
      setSubmitting(false);
    }
  };

  const performDeletePost = async () => {
    if (!post) return;
    setDeletingPost(true);
    try {
      await deletePost({ variables: { id: post.id } });
      setConfirmPostOpen(false);
      onDeleted();
    } catch {
      /* ignore */
    } finally {
      setDeletingPost(false);
    }
  };

  const onDeleteComment = async (commentId: string) => {
    if (!post) return;
    try {
      await deleteComment({ variables: { id: post.id, commentId } });
    } catch {
      /* ignore */
    }
  };

  const postBody = post ? (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      sx={{ minHeight: { md: 520 }, bgcolor: 'background.paper' }}
    >
      <PostMediaPane
        imageUrl={post.image_url}
        caption={post.caption}
        onDoubleTapLike={likeOnDoubleTap}
      />

      <Stack
        sx={{
          flex: 1,
          minWidth: { md: 320 },
          maxWidth: { md: 420 },
          borderLeft: { md: 1 },
          borderColor: { md: 'divider' },
        }}
      >
        <PostDialogHeader
          post={post}
          canDelete={canDelete}
          onClose={onClose}
          onRequestDelete={() => setConfirmPostOpen(true)}
        />

        <PostCommentList
          post={post}
          sortedComments={sortedComments}
          meId={meId}
          canDeletePost={canDelete}
          onDeleteComment={onDeleteComment}
        />

        <PostActions
          post={post}
          comment={comment}
          setComment={setComment}
          onLike={onLike}
          onSend={onSend}
          submitting={submitting}
        />
      </Stack>
    </Stack>
  ) : (
    <Box sx={{ p: 4 }}>
      <Alert severity="warning">Post not found.</Alert>
    </Box>
  );

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogContent sx={{ p: 0 }}>
        {loading && !post ? (
          <Stack alignItems="center" sx={{ p: 6 }}>
            <CircularProgress />
          </Stack>
        ) : (
          postBody
        )}
      </DialogContent>
      <ConfirmDialog
        open={confirmPostOpen}
        title="Delete this post?"
        message="This will permanently remove the post and all its comments."
        confirmLabel="Delete"
        destructive
        busy={deletingPost}
        onConfirm={performDeletePost}
        onClose={() => !deletingPost && setConfirmPostOpen(false)}
      />
    </Dialog>
  );
}
