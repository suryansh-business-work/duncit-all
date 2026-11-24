import { useEffect, useId, useRef, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Box, Chip, Divider, Drawer, LinearProgress, Stack, Tooltip, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { notify } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import { useUserData } from '@duncit/user-context';
import LeadOwnerDialog from '../../leads-page/drawer/LeadOwnerDialog';
import { canPickOwner } from '../../leads-page/roles';
import { PLATFORM_LABEL } from '../../social-accounts-page/copy';
import { MARK_SOCIAL_CONVERSATION_READ, SOCIAL_CONVERSATION, type SocialConversationThread } from '../dm.queries';
import InboxWorkBar from '../drawer/InboxWorkBar';
import { InboxReplyForm } from '../reply-form';
import ConversationMessages from './ConversationMessages';
import WindowNotice from './WindowNotice';
import { useConversationActions } from './useConversationActions';

interface Props {
  /** The conversation to open; null when closed. */
  conversationId: string | null;
  onClose: () => void;
  /** Something changed on the server — the queue and the cards behind the drawer should read again. */
  onChanged: () => void;
}

type Translate = ReturnType<typeof useTranslation>['t'];

/** Why Send is off for this conversation, or null when it may go. The server checks the same, and has the last word. */
function blockedReasonOf(thread: SocialConversationThread, t: Translate): string | null {
  if (thread.missing_permission) return t('marketing.inbox.dmNeedsPermission', { vars: { permission: thread.missing_permission } });
  if (thread.conversation.window_state === 'CLOSED') return t('marketing.inbox.dmWindowClosed');
  return null;
}

/** One DM conversation, opened: the thread, Meta's window, who has it, the lead it belongs to, and the box to answer. */
export default function ConversationDrawer({ conversationId, onClose, onChanged }: Readonly<Props>) {
  const { t } = useTranslation();
  const titleId = useId();
  const { user } = useUserData();
  const [picking, setPicking] = useState(false);
  const { data, loading, error, refetch } = useQuery<{ socialConversation: SocialConversationThread }>(SOCIAL_CONVERSATION, {
    variables: { id: conversationId ?? '' },
    skip: !conversationId,
    fetchPolicy: 'network-only',
  });
  const [markRead] = useMutation(MARK_SOCIAL_CONVERSATION_READ);
  const thread = data?.socialConversation;
  const conversation = thread?.conversation;
  const changed = () => {
    onChanged();
    refetch().catch((err: unknown) => notify(parseApiError(err), 'error'));
  };
  const actions = useConversationActions(conversationId ?? '', changed);
  const readFor = useRef<string | null>(null);

  // Opening a conversation reads it — once per conversation, and only when something is unread.
  useEffect(() => {
    if (!conversation || conversation.unread_count === 0 || readFor.current === conversation.id) return;
    readFor.current = conversation.id;
    markRead({ variables: { id: conversation.id } }).then(onChanged, (err: unknown) => notify(parseApiError(err), 'error'));
  }, [conversation, markRead, onChanged]);

  const who = conversation ? conversation.participant.name || conversation.participant.username : '';
  return (
    <Drawer
      anchor="right"
      open={!!conversationId}
      onClose={onClose}
      slotProps={{ paper: { 'aria-labelledby': titleId, sx: { width: { xs: '100%', md: 600 } } } }}
    >
      <Stack spacing={2} sx={{ p: 2 }} data-testid="dm-drawer">
        <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography id={titleId} variant="h6" component="h2" sx={{ wordBreak: 'break-word' }}>
              {who || t('marketing.inbox.dmTitle')}
            </Typography>
            {conversation && (
              <Typography variant="body2" color="text.secondary">
                {[conversation.participant.username ? `@${conversation.participant.username}` : '', t(PLATFORM_LABEL[conversation.platform]), conversation.account_name]
                  .filter(Boolean)
                  .join(' · ')}
              </Typography>
            )}
          </Box>
          <Tooltip title={t('shell.common.close')}>
            <DuncitIconButton onClick={onClose}>
              <CloseIcon />
            </DuncitIconButton>
          </Tooltip>
        </Stack>
        {loading && !thread && <LinearProgress />}
        {error && <Alert severity="error">{parseApiError(error)}</Alert>}
        {thread && conversation && (
          <>
            <WindowNotice conversation={conversation} />
            <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              {conversation.ig_lead_id && <Chip size="small" color="primary" label={t('marketing.inbox.dmIgLead')} data-testid="dm-ig-lead" />}
              {conversation.marketing_lead_id ? (
                <Chip size="small" color="primary" label={t('marketing.inbox.dmMarketingLead')} data-testid="dm-marketing-lead" />
              ) : (
                <DuncitButton size="small" startIcon={<PersonAddIcon />} onClick={actions.createLead} disabled={actions.busy} data-testid="dm-create-lead">
                  {t('marketing.inbox.dmCreateLead')}
                </DuncitButton>
              )}
            </Stack>
            <InboxWorkBar
              item={conversation}
              userId={user?.user_id ?? null}
              canPick={canPickOwner(user?.roles)}
              busy={actions.busy}
              onAssign={actions.assign}
              onPick={() => setPicking(true)}
              onStatus={actions.setStatus}
            />
            <Divider />
            <ConversationMessages messages={thread.messages} />
            <InboxReplyForm
              key={conversation.id}
              max={thread.max_length}
              blockedReason={blockedReasonOf(thread, t)}
              busy={actions.busy}
              suggesting={actions.suggesting}
              onSuggest={actions.suggest}
              onSend={actions.send}
            />
            {picking && (
              <LeadOwnerDialog
                ownerUserId={conversation.assigned_user_id}
                title={t('marketing.inbox.dmAssignTitle')}
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
