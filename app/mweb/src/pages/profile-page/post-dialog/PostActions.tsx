import { Box, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutlined';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import SendIcon from '@mui/icons-material/Send';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '../../../i18n/useTranslation';

interface PostActionsProps {
  post: any;
  comment: string;
  setComment: (v: string) => void;
  onLike: () => void;
  onSend: () => void;
  submitting: boolean;
}

export default function PostActions({
  post,
  comment,
  setComment,
  onLike,
  onSend,
  submitting,
}: Readonly<PostActionsProps>) {
  const { t } = useTranslation();
  return (
    <Box sx={{ borderTop: 1, borderColor: 'divider', p: 1 }}>
      <Stack direction="row" spacing={0.5} sx={{
        alignItems: "center"
      }}>
        <DuncitIconButton onClick={onLike} color={post.liked_by_me ? 'error' : 'default'}>
          {post.liked_by_me ? <FavoriteIcon /> : <FavoriteBorderIcon />}
        </DuncitIconButton>
        <DuncitIconButton>
          <ChatBubbleOutlineIcon />
        </DuncitIconButton>
      </Stack>
      <Typography
        variant="subtitle2"
        sx={{
          fontWeight: 700,
          px: 1
        }}>
        {post.likes_count} {post.likes_count === 1 ? 'like' : 'likes'}
      </Typography>
      <TextField
        fullWidth
        size="small"
        variant="standard"
        placeholder={t('mweb.common.addAComment')}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSend();
          }
        }}
        sx={{ px: 1, mt: 0.5 }}
        slotProps={{
          input: {
            disableUnderline: true,
            endAdornment: (
              <InputAdornment position="end">
                <DuncitIconButton
                  onClick={onSend}
                  disabled={!comment.trim() || submitting}
                  color="primary"
                >
                  <SendIcon fontSize="small" />
                </DuncitIconButton>
              </InputAdornment>
            ),
          }
        }}
      />
    </Box>
  );
}
