import { Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import type { InboxComment, SocialInboxStatus } from '../queries';

interface Props {
  comment: InboxComment;
  /** The signed-in person, for Assign to me; null when unknown. */
  userId: string | null;
  /** The owner picker lists everybody with access — only some roles may read that list. */
  canPick: boolean;
  busy: boolean;
  onAssign: (userId: string | null) => Promise<boolean>;
  onPick: () => void;
  onStatus: (status: SocialInboxStatus) => Promise<boolean>;
}

/** Who has the comment, and the ways to close it or put it back in the queue. */
export default function InboxWorkBar({ comment, userId, canPick, busy, onAssign, onPick, onStatus }: Readonly<Props>) {
  const { t } = useTranslation();
  const mine = userId !== null && comment.assigned_user_id === userId;
  const open = comment.status === 'OPEN';
  return (
    <Stack spacing={1} data-testid="inbox-work">
      <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography variant="subtitle2">{t('marketing.inbox.assignee')}</Typography>
        <Typography variant="body2" data-testid="inbox-assignee">
          {comment.assigned_name || t('marketing.inbox.nobody')}
        </Typography>
        {userId && !mine && (
          <DuncitButton size="small" onClick={() => onAssign(userId)} disabled={busy} data-testid="inbox-assign-me">
            {t('marketing.inbox.assignToMe')}
          </DuncitButton>
        )}
        {canPick && (
          <DuncitButton size="small" onClick={onPick} disabled={busy} data-testid="inbox-assign-pick">
            {t('marketing.inbox.change')}
          </DuncitButton>
        )}
      </Stack>
      <Stack direction="row" spacing={1}>
        {open ? (
          <>
            <DuncitButton size="small" variant="outlined" onClick={() => onStatus('DONE')} disabled={busy} data-testid="inbox-done">
              {t('marketing.inbox.markDone')}
            </DuncitButton>
            <DuncitButton size="small" variant="outlined" onClick={() => onStatus('SPAM')} disabled={busy} data-testid="inbox-spam">
              {t('marketing.inbox.markSpam')}
            </DuncitButton>
          </>
        ) : (
          <DuncitButton size="small" variant="outlined" onClick={() => onStatus('OPEN')} disabled={busy} data-testid="inbox-reopen">
            {t('marketing.inbox.reopen')}
          </DuncitButton>
        )}
      </Stack>
    </Stack>
  );
}
