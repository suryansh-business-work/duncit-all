import {
  Box,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import SendIcon from '@mui/icons-material/Send';

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
  return (
    <Box sx={{ borderTop: 1, borderColor: 'divider', p: 1 }}>
      <Stack direction="row" spacing={0.5} alignItems="center">
        <IconButton onClick={onLike} color={post.liked_by_me ? 'error' : 'default'}>
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
  );
}
