import { useId } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import { SOCIAL_SCHEDULED_POST, type SocialScheduledPost } from '../publish.queries';
import ScheduledPostCard from './ScheduledPostCard';

interface Props {
  /** The Duncit post picked on the calendar; null when closed. */
  postId: string | null;
  onEdit: (post: SocialScheduledPost) => void;
  onClose: () => void;
}

/** A calendar entry opened: the same card the lists show, with the same actions. */
export default function PlannedPostDialog({ postId, onEdit, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const titleId = useId();
  const { data, loading, error } = useQuery<{ socialScheduledPost: SocialScheduledPost }>(SOCIAL_SCHEDULED_POST, {
    variables: { id: postId ?? '' },
    skip: !postId,
    fetchPolicy: 'cache-and-network',
  });
  const post = data?.socialScheduledPost;

  const edit = (picked: SocialScheduledPost) => {
    onClose();
    onEdit(picked);
  };

  return (
    <Dialog open={!!postId} onClose={onClose} fullWidth maxWidth="md" aria-labelledby={titleId}>
      <DialogTitle id={titleId}>{t('marketing.social.plannedPost')}</DialogTitle>
      <DialogContent>
        {loading && !post && <LinearProgress />}
        {error && <Alert severity="error">{parseApiError(error)}</Alert>}
        {post && <ScheduledPostCard post={post} onEdit={edit} onRemoved={onClose} />}
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose}>{t('shell.common.close')}</DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
