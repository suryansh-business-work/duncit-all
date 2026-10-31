import { Link as RouterLink } from 'react-router';
import { Stack } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ReplayIcon from '@mui/icons-material/Replay';
import RuleIcon from '@mui/icons-material/Rule';
import SendIcon from '@mui/icons-material/Send';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import type { SocialScheduledPost } from '../publish.queries';
import { usePublishActions } from './usePublishActions';

/** A post parked for a manager can still be edited — the server reopens its approval. */
const EDITABLE = new Set(['DRAFT', 'PENDING_APPROVAL', 'SCHEDULED']);
const RETRYABLE = new Set(['FAILED', 'PARTIAL']);

interface Props {
  post: SocialScheduledPost;
  onEdit: (post: SocialScheduledPost) => void;
  /** Called after the post is deleted, so a dialog around the card can close. */
  onRemoved?: () => void;
}

/** What can be done with a post in its current state, as a column of buttons beside its card. */
export default function ScheduledPostActions({ post, onEdit, onRemoved }: Readonly<Props>) {
  const { t } = useTranslation();
  const actions = usePublishActions();

  const remove = async () => {
    if (await actions.remove(post)) onRemoved?.();
  };

  return (
    <Stack direction={{ xs: 'row', sm: 'column' }} spacing={1} useFlexGap sx={{ flexShrink: 0, flexWrap: 'wrap', alignItems: 'stretch' }}>
      {post.status === 'PENDING_APPROVAL' && (
        <DuncitButton size="small" variant="outlined" startIcon={<RuleIcon />} component={RouterLink} to="/approvals" data-testid="social-open-approvals">
          {t('marketing.social.openApprovals')}
        </DuncitButton>
      )}
      {EDITABLE.has(post.status) && (
        <DuncitButton size="small" variant="outlined" startIcon={<EditOutlinedIcon />} onClick={() => onEdit(post)}>
          {t('shell.common.edit')}
        </DuncitButton>
      )}
      {post.status === 'SCHEDULED' && (
        <DuncitButton size="small" variant="outlined" startIcon={<SendIcon />} onClick={() => actions.shareNow(post)}>
          {t('marketing.social.shareNow')}
        </DuncitButton>
      )}
      {RETRYABLE.has(post.status) && (
        <DuncitButton size="small" variant="outlined" startIcon={<ReplayIcon />} onClick={() => actions.retry(post)}>
          {t('marketing.social.retryFailed')}
        </DuncitButton>
      )}
      {post.status !== 'PUBLISHING' && (
        <DuncitButton size="small" color="error" startIcon={<DeleteOutlineIcon />} onClick={remove}>
          {t('shell.common.delete')}
        </DuncitButton>
      )}
    </Stack>
  );
}
