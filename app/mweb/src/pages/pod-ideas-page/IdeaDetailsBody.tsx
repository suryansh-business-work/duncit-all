import {
  Alert,
  Avatar,
  Box,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import { DuncitButton } from '@duncit/buttons';
import { formatRelative } from './queries';
import IdeaCommentsList from './IdeaCommentsList';
import { useTranslation } from '../../i18n/useTranslation';

interface BodyProps {
  loading: boolean;
  hasData: boolean;
  idea: any;
  myId?: string;
  onDelete: (commentId: string) => void;
  onToggleLike: () => void;
}

/** The idea details dialog's body: author, description, like/share counts and
 * the comment thread. Native twin: pod-ideas/IdeaDetailsBody. */
export default function IdeaDetailsBody({
  loading,
  hasData,
  idea,
  myId,
  onDelete,
  onToggleLike,
}: Readonly<BodyProps>) {
  const { t } = useTranslation();
  if (loading && !hasData) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!idea) {
    return <Alert severity="warning">{t('mweb.podIdeas.ideaNotFound')}</Alert>;
  }

  return (
    <>
      <Stack
        direction="row"
        spacing={1.5}
        sx={{
          alignItems: "center",
          mb: 1.5
        }}>
        <Avatar
          src={idea.author?.profile_photo || undefined}
          sx={{ width: 40, height: 40 }}
        >
          {(idea.author?.first_name?.[0] ?? 'U').toUpperCase()}
        </Avatar>
        <Box>
          <Typography variant="body2" sx={{
            fontWeight: 600
          }}>
            {idea.author?.full_name ?? 'Member'}
          </Typography>
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>
            {formatRelative(idea.created_at)}
          </Typography>
        </Box>
      </Stack>
      <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>
        {idea.description}
      </Typography>
      <Stack
        direction="row"
        spacing={2}
        sx={{
          alignItems: "center",
          mb: 2
        }}>
        <DuncitButton
          size="small"
          startIcon={
            idea.liked_by_me ? (
              <FavoriteIcon fontSize="small" sx={{ color: 'secondary.main' }} />
            ) : (
              <FavoriteBorderIcon fontSize="small" />
            )
          }
          onClick={onToggleLike}
          sx={{ color: idea.liked_by_me ? 'secondary.main' : 'text.secondary' }}
        >
          {idea.likes_count} like{idea.likes_count === 1 ? '' : 's'}
        </DuncitButton>
        <Typography variant="caption" sx={{
          color: "text.secondary"
        }}>
          {idea.shares_count} share{idea.shares_count === 1 ? '' : 's'}
        </Typography>
      </Stack>
      <Divider sx={{ mb: 1 }} />
      <Typography variant="overline" sx={{
        color: "text.secondary",
        fontWeight: 600
      }}>
        Comments ({idea.comments_count})
      </Typography>
      <IdeaCommentsList
        comments={idea.comments}
        ideaAuthorId={idea.author_id}
        myId={myId}
        onDelete={onDelete}
      />
    </>
  );
}
