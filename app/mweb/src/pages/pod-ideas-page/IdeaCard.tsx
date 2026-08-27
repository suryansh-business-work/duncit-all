import { Avatar, Box, Card, CardContent, Chip, Divider, Stack, Tooltip, Typography } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutlined';
import ShareIcon from '@mui/icons-material/Share';
import DeleteIcon from '@mui/icons-material/Delete';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { formatRelative } from './queries';
import { categoryPathLabel } from '../../utils/ideaCategory';
import { useTranslation } from '../../i18n/useTranslation';

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
  const { t } = useTranslation();
  const author = idea.author;
  const isMine = myId && idea.author_id === myId;
  const notApprovedColor = idea.status === 'REJECTED' ? 'error' : 'warning';
  const statusColor = idea.status === 'APPROVED' ? 'success' : notApprovedColor;
  const categoryPath = categoryPathLabel(idea);
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack
          direction="row"
          spacing={1.5}
          sx={{
            alignItems: "center",
            mb: 1
          }}>
          <Avatar src={author?.profile_photo || undefined} sx={{ width: 36, height: 36 }}>
            {(author?.first_name?.[0] ?? author?.full_name?.[0] ?? 'U').toUpperCase()}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" noWrap sx={{
              fontWeight: 600
            }}>
              {author?.full_name ?? 'Member'}
            </Typography>
            <Typography variant="caption" sx={{
              color: "text.secondary"
            }}>
              {formatRelative(idea.created_at)}
            </Typography>
          </Box>
          {showStatus && (
            <Chip size="small" label={idea.status} color={statusColor} />
          )}
          {isMine && (
            <Tooltip title={t('mweb.common.delete')}>
              <DuncitIconButton size="small" color="error" onClick={onDelete}>
                <DeleteIcon fontSize="small" />
              </DuncitIconButton>
            </Tooltip>
          )}
        </Stack>
        <Box sx={{ cursor: 'pointer' }} onClick={onOpen}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              mb: 0.5
            }}>
            {idea.title}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              whiteSpace: 'pre-wrap',
              display: '-webkit-box',
              WebkitLineClamp: 4,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}>
            {idea.description}
          </Typography>
        </Box>
        {(idea.idea_no || categoryPath) && (
          <Stack
            direction="row"
            spacing={1}
            sx={{
              alignItems: "center",
              mt: 1,
              flexWrap: 'wrap',
              gap: 0.75
            }}>
            {idea.idea_no && (
              <Chip
                size="small"
                variant="outlined"
                label={idea.idea_no}
                sx={{ fontFamily: 'monospace', fontWeight: 700 }}
              />
            )}
            {categoryPath && (
              <Chip
                size="small"
                variant="outlined"
                icon={<LocalOfferOutlinedIcon />}
                label={categoryPath}
              />
            )}
          </Stack>
        )}
        <Divider sx={{ my: 1.5 }} />
        <Stack direction="row" spacing={2} sx={{
          alignItems: "center"
        }}>
          <DuncitButton
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
          </DuncitButton>
          <DuncitButton
            size="small"
            startIcon={<ChatBubbleOutlineIcon fontSize="small" />}
            onClick={onOpen}
            sx={{ color: 'text.secondary' }}
          >
            {idea.comments_count}
          </DuncitButton>
          <DuncitButton
            size="small"
            startIcon={<ShareIcon fontSize="small" />}
            onClick={onShare}
            sx={{ color: 'text.secondary' }}
          >
            {idea.shares_count}
          </DuncitButton>
        </Stack>
      </CardContent>
    </Card>
  );
}
