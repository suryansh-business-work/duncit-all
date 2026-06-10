import { Avatar, Box, IconButton, Stack, Typography } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

interface PostCommentListProps {
  post: any;
  sortedComments: any[];
  meId: string;
  canDeletePost: boolean;
  onDeleteComment: (id: string) => void;
}

export default function PostCommentList({
  post,
  sortedComments,
  meId,
  canDeletePost,
  onDeleteComment,
}: Readonly<PostCommentListProps>) {
  return (
    <Box sx={{ flex: 1, overflowY: 'auto', p: 1.5 }}>
      {post.caption && (
        <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
          <Avatar src={post.author?.profile_photo || undefined} sx={{ width: 32, height: 32 }}>
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
            const canRemove = c.author_id === meId || canDeletePost;
            return (
              <Stack key={c.id} direction="row" spacing={1.5} alignItems="flex-start">
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
  );
}
