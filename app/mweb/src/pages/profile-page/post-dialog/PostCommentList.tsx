import { Avatar, Box, Stack, Typography } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitIconButton } from '@duncit/buttons';
import { formatDateTime } from '../../../utils/dateFormat';
import { useTranslation } from '../../../i18n/useTranslation';

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
  const { t } = useTranslation();
  return (
    <Box data-testid="post-comment-list" sx={{ flex: 1, overflowY: 'auto', p: 1.5 }}>
      {post.caption && (
        <Stack data-testid="post-comment-list-caption" direction="row" spacing={1.5} sx={{ mb: 2 }}>
          <Avatar src={post.author?.profile_photo || undefined} alt="" sx={{ width: 32, height: 32 }}>
            {(post.author?.first_name?.[0] ?? 'U').toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="body2">
              <Typography component="span" variant="body2" sx={{
                fontWeight: 700
              }}>
                {post.author?.full_name ?? 'User'}
              </Typography>{' '}
              {post.caption}
            </Typography>
            <Typography variant="caption" sx={{
              color: "text.secondary"
            }}>
              {formatDateTime(post.created_at)}
            </Typography>
          </Box>
        </Stack>
      )}

      {sortedComments.length === 0 ? (
        <Typography
          data-testid="post-comment-list-empty"
          variant="body2"
          sx={{
            color: "text.secondary",
            textAlign: 'center',
            py: 4
          }}>
          No comments yet. Be the first to comment.
        </Typography>
      ) : (
        <Stack data-testid="post-comment-list-comments" spacing={1.5}>
          {sortedComments.map((c: any) => {
            const canRemove = c.author_id === meId || canDeletePost;
            return (
              <Stack
                key={c.id}
                data-testid={`post-comment-list-comment-${c.id}`}
                direction="row"
                spacing={1.5}
                sx={{
                  alignItems: "flex-start"
                }}
              >
                <Avatar
                  src={c.author?.profile_photo || undefined}
                  alt=""
                  sx={{ width: 28, height: 28 }}
                >
                  {(c.author?.first_name?.[0] ?? 'U').toUpperCase()}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2">
                    <Typography component="span" variant="body2" sx={{
                      fontWeight: 700
                    }}>
                      {c.author?.full_name ?? 'User'}
                    </Typography>{' '}
                    {c.text}
                  </Typography>
                  <Typography variant="caption" sx={{
                    color: "text.secondary"
                  }}>
                    {formatDateTime(c.created_at)}
                  </Typography>
                </Box>
                {canRemove && (
                  <DuncitIconButton
                    data-testid={`post-comment-list-comment-${c.id}-delete`}
                    size="small"
                    onClick={() => onDeleteComment(c.id)}
                    aria-label={t('mweb.common.deleteComment')}
                  >
                    <DeleteOutlineIcon fontSize="inherit" />
                  </DuncitIconButton>
                )}
              </Stack>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}
