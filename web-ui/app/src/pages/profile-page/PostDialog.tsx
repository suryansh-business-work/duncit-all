import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Avatar,
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SendIcon from '@mui/icons-material/Send';
import {
  POST_DETAILS,
  TOGGLE_LIKE,
  ADD_COMMENT,
  DELETE_POST,
  DELETE_COMMENT,
} from './queries';

interface Props {
  postId: string | null;
  meId: string;
  onClose: () => void;
  onDeleted: () => void;
}

export default function PostDialog({ postId, meId, onClose, onDeleted }: Props) {
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

  const onDeletePost = async () => {
    if (!post) return;
    if (!window.confirm('Delete this post?')) return;
    try {
      await deletePost({ variables: { id: post.id } });
      onDeleted();
    } catch {
      /* ignore */
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

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogContent sx={{ p: 0 }}>
        {loading && !post ? (
          <Stack alignItems="center" sx={{ p: 6 }}>
            <CircularProgress />
          </Stack>
        ) : !post ? (
          <Box sx={{ p: 4 }}>
            <Alert severity="warning">Post not found.</Alert>
          </Box>
        ) : (
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            sx={{ minHeight: { md: 520 }, bgcolor: 'background.paper' }}
          >
            <Box
              sx={{
                flex: { md: 1.4 },
                bgcolor: 'common.black',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                maxHeight: { xs: 360, md: 'auto' },
              }}
            >
              <Box
                component="img"
                src={post.image_url}
                alt={post.caption || 'post'}
                sx={{
                  maxWidth: '100%',
                  maxHeight: { xs: 360, md: '80vh' },
                  objectFit: 'contain',
                }}
              />
            </Box>

            <Stack
              sx={{
                flex: 1,
                minWidth: { md: 320 },
                maxWidth: { md: 420 },
                borderLeft: { md: 1 },
                borderColor: { md: 'divider' },
              }}
            >
              <Stack
                direction="row"
                alignItems="center"
                spacing={1.5}
                sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider' }}
              >
                <Avatar
                  src={post.author?.profile_photo || undefined}
                  sx={{ width: 32, height: 32 }}
                >
                  {(post.author?.first_name?.[0] ?? 'U').toUpperCase()}
                </Avatar>
                <Typography variant="subtitle2" fontWeight={700} sx={{ flex: 1 }}>
                  {post.author?.full_name ?? 'User'}
                </Typography>
                {canDelete && (
                  <Tooltip title="Delete post">
                    <IconButton size="small" onClick={onDeletePost}>
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                <IconButton size="small" onClick={onClose}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Stack>

              <Box sx={{ flex: 1, overflowY: 'auto', p: 1.5 }}>
                {post.caption && (
                  <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
                    <Avatar
                      src={post.author?.profile_photo || undefined}
                      sx={{ width: 32, height: 32 }}
                    >
                      {(post.author?.first_name?.[0] ?? 'U').toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography variant="body2">
                        <Typography component="span" fontWeight={700} variant="body2">
                          {post.author?.full_name ?? 'User'}
                        </Typography>{' '}
                        {post.caption}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(post.created_at).toLocaleString()}
                      </Typography>
                    </Box>
                  </Stack>
                )}

                {sortedComments.length === 0 ? (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ textAlign: 'center', py: 4 }}
                  >
                    No comments yet. Be the first to comment.
                  </Typography>
                ) : (
                  <Stack spacing={1.5}>
                    {sortedComments.map((c: any) => {
                      const canRemove = c.author_id === meId || canDelete;
                      return (
                        <Stack
                          key={c.id}
                          direction="row"
                          spacing={1.5}
                          alignItems="flex-start"
                        >
                          <Avatar
                            src={c.author?.profile_photo || undefined}
                            sx={{ width: 28, height: 28 }}
                          >
                            {(c.author?.first_name?.[0] ?? 'U').toUpperCase()}
                          </Avatar>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body2">
                              <Typography component="span" fontWeight={700} variant="body2">
                                {c.author?.full_name ?? 'User'}
                              </Typography>{' '}
                              {c.text}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(c.created_at).toLocaleString()}
                            </Typography>
                          </Box>
                          {canRemove && (
                            <IconButton size="small" onClick={() => onDeleteComment(c.id)}>
                              <DeleteOutlineIcon fontSize="inherit" />
                            </IconButton>
                          )}
                        </Stack>
                      );
                    })}
                  </Stack>
                )}
              </Box>

              <Box sx={{ borderTop: 1, borderColor: 'divider', p: 1 }}>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <IconButton
                    onClick={onLike}
                    color={post.liked_by_me ? 'error' : 'default'}
                  >
                    {post.liked_by_me ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                  </IconButton>
                  <IconButton>
                    <ChatBubbleOutlineIcon />
                  </IconButton>
                </Stack>
                <Typography variant="subtitle2" fontWeight={700} sx={{ px: 1 }}>
                  {post.likes_count} {post.likes_count === 1 ? 'like' : 'likes'}
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  variant="standard"
                  placeholder="Add a comment…"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      onSend();
                    }
                  }}
                  sx={{ px: 1, mt: 0.5 }}
                  InputProps={{
                    disableUnderline: true,
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={onSend}
                          disabled={!comment.trim() || submitting}
                          color="primary"
                        >
                          <SendIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
            </Stack>
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}
