import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import ShareIcon from '@mui/icons-material/Share';
import DeleteIcon from '@mui/icons-material/Delete';
import { formatRelative } from './queries';

interface IdeaCardProps {
  idea: any;
  myId?: string;
  onOpen: () => void;
  onLike: () => void;
  onShare: () => void;
  onDelete: () => void;
  showStatus?: boolean;
}

export default function IdeaCard({
  idea,
  myId,
  onOpen,
  onLike,
  onShare,
  onDelete,
  showStatus,
}: Readonly<IdeaCardProps>) {
  const author = idea.author;
  const isMine = myId && idea.author_id === myId;
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
          <Avatar src={author?.profile_photo || undefined} sx={{ width: 36, height: 36 }}>
            {(author?.first_name?.[0] ?? author?.full_name?.[0] ?? 'U').toUpperCase()}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" fontWeight={600} noWrap>
              {author?.full_name ?? 'Member'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatRelative(idea.created_at)}
            </Typography>
          </Box>
          {showStatus && (
            <Chip
              size="small"
              label={idea.status}
              color={
                idea.status === 'APPROVED'
                  ? 'success'
                  : idea.status === 'REJECTED'
                    ? 'error'
                    : 'warning'
              }
            />
          )}
          {isMine && (
            <Tooltip title="Delete">
              <IconButton size="small" color="error" onClick={onDelete}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
        <Box sx={{ cursor: 'pointer' }} onClick={onOpen}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
            {idea.title}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              whiteSpace: 'pre-wrap',
              display: '-webkit-box',
              WebkitLineClamp: 4,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {idea.description}
          </Typography>
        </Box>
        <Divider sx={{ my: 1.5 }} />
        <Stack direction="row" spacing={2} alignItems="center">
          <Button
            size="small"
            startIcon={
              idea.liked_by_me ? (
                <FavoriteIcon fontSize="small" sx={{ color: 'error.main' }} />
              ) : (
                <FavoriteBorderIcon fontSize="small" />
              )
            }
            onClick={onLike}
            sx={{ color: idea.liked_by_me ? 'error.main' : 'text.secondary' }}
          >
            {idea.likes_count}
          </Button>
          <Button
            size="small"
            startIcon={<ChatBubbleOutlineIcon fontSize="small" />}
            onClick={onOpen}
            sx={{ color: 'text.secondary' }}
          >
            {idea.comments_count}
          </Button>
          <Button
            size="small"
            startIcon={<ShareIcon fontSize="small" />}
            onClick={onShare}
            sx={{ color: 'text.secondary' }}
          >
            {idea.shares_count}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
