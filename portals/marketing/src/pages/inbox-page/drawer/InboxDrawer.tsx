import { useId, useState } from 'react';
import { Box, Divider, Drawer, Stack, Tooltip, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import { useUserData } from '@duncit/user-context';
import LeadOwnerDialog from '../../leads-page/drawer/LeadOwnerDialog';
import { canPickOwner } from '../../leads-page/roles';
import { PLATFORM_LABEL } from '../../social-accounts-page/copy';
import { FALLBACK_REPLY_MAX } from '../copy';
import type { InboxComment, SocialReplyCapability } from '../queries';
import { InboxReplyForm } from '../reply-form';
import InboxCommentDetails from './InboxCommentDetails';
import InboxReplies from './InboxReplies';
import InboxWorkBar from './InboxWorkBar';
import { useInboxActions } from './useInboxActions';

interface Props {
  /** The comment to show; null when closed. */
  comment: InboxComment | null;
  capabilities: readonly SocialReplyCapability[];
  onClose: () => void;
  /** The server's copy after an action — the queue and the cards behind the drawer should read again too. */
  onChanged: (comment: InboxComment) => void;
}

/** One comment, opened: what was said, who has it, what was answered, and the box to answer it. */
export default function InboxDrawer({ comment, capabilities, onClose, onChanged }: Readonly<Props>) {
  const { t } = useTranslation();
  const titleId = useId();
  const { user } = useUserData();
  const [picking, setPicking] = useState(false);
  const actions = useInboxActions(comment?.id ?? '', onChanged);
  const capability = capabilities.find((item) => item.platform === comment?.platform);
  const blockedReason =
    capability && !capability.can_reply && comment
      ? t('marketing.inbox.cannotReply', {
          vars: { network: t(PLATFORM_LABEL[comment.platform]), permission: capability.missing_permission ?? '' },
        })
      : null;

  return (
    <Drawer
      anchor="right"
      open={!!comment}
      onClose={onClose}
      slotProps={{ paper: { 'aria-labelledby': titleId, sx: { width: { xs: '100%', md: 600 } } } }}
    >
      <Stack spacing={2} sx={{ p: 2 }} data-testid="inbox-drawer">
        <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography id={titleId} variant="h6" component="h2" sx={{ wordBreak: 'break-word' }}>
              {comment?.author_name || comment?.author_handle || t('marketing.inbox.detailsTitle')}
            </Typography>
          </Box>
          <Tooltip title={t('shell.common.close')}>
            <DuncitIconButton onClick={onClose}>
              <CloseIcon />
            </DuncitIconButton>
          </Tooltip>
        </Stack>
        {comment && (
          <>
            <InboxCommentDetails comment={comment} />
            <InboxWorkBar
              comment={comment}
              userId={user?.user_id ?? null}
              canPick={canPickOwner(user?.roles)}
              busy={actions.busy}
              onAssign={actions.assign}
              onPick={() => setPicking(true)}
              onStatus={actions.setStatus}
            />
            <Divider />
            <InboxReplies replies={comment.replies} />
            <InboxReplyForm
              key={comment.id}
              max={capability?.max_length ?? FALLBACK_REPLY_MAX}
              blockedReason={blockedReason}
              busy={actions.busy}
              suggesting={actions.suggesting}
              onSuggest={actions.suggest}
              onSend={actions.reply}
            />
            {picking && (
              <LeadOwnerDialog
                ownerUserId={comment.assigned_user_id}
                title={t('marketing.inbox.assignTitle')}
                busy={actions.busy}
                onClose={() => setPicking(false)}
                onSave={actions.assign}
              />
            )}
          </>
        )}
      </Stack>
    </Drawer>
  );
}
