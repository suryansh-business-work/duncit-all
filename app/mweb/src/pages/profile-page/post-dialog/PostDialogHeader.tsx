import { Avatar, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ShareIcon from '@mui/icons-material/Share';
import { sharePost } from '../../../utils/share';

interface PostDialogHeaderProps {
  post: any;
  canDelete: boolean;
  onClose: () => void;
  onRequestDelete: () => void;
}

export default function PostDialogHeader({
  post,
  canDelete,
  onClose,
  onRequestDelete,
}: Readonly<PostDialogHeaderProps>) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1.5}
      sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider' }}
    >
      <Avatar src={post.author?.profile_photo || undefined} sx={{ width: 32, height: 32 }}>
        {(post.author?.first_name?.[0] ?? 'U').toUpperCase()}
      </Avatar>
      <Typography variant="subtitle2" fontWeight={700} sx={{ flex: 1 }}>
        {post.author?.full_name ?? 'User'}
      </Typography>
      <Tooltip title="Share post">
        <IconButton
          size="small"
          aria-label="Share post"
          onClick={() => sharePost(post.id, post.author?.full_name ?? 'Post')}
        >
          <ShareIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      {canDelete && (
        <Tooltip title="Delete post">
          <IconButton size="small" onClick={onRequestDelete}>
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
      <IconButton size="small" onClick={onClose}>
        <CloseIcon fontSize="small" />
      </IconButton>
    </Stack>
  );
}
