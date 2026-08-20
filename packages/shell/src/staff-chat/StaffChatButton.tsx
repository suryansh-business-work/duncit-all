import { useCallback, useEffect } from 'react';
import { useTranslation } from '../i18n/useTranslation';
import { useQuery } from '@apollo/client';
import { Badge, IconButton, Tooltip } from '@mui/material';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import { readToken, useShellRuntime } from '../lib/runtime';
import { STAFF_UNREAD } from './queries';
import { useStaffSocket } from './useStaffSocket';

/**
 * The chat entry point in the header, and the only thing that is always
 * mounted.
 *
 * It has to be: the ping and the unread badge are the whole point of a chat you
 * are not looking at. The panel itself is mounted by the layout only when open,
 * so the conversation queries do not run in every portal all day.
 */
export function StaffChatButton({
  meId,
  open,
  onToggle,
}: Readonly<{ meId?: string | null; open: boolean; onToggle: () => void }>) {
  const { t } = useTranslation();
  const runtime = useShellRuntime();
  const { data, refetch } = useQuery<{ staffUnreadCount: number }>(STAFF_UNREAD, {
    skip: !runtime,
    fetchPolicy: 'cache-and-network',
  });

  // A new message changes the badge whether or not the drawer is open — which
  // is what the socket is for. The beep lives in the hook, and skips anything
  // you wrote yourself.
  const onMessage = useCallback(() => {
    refetch().catch(() => undefined);
  }, [refetch]);

  useStaffSocket({
    graphqlUrl: runtime?.graphqlUrl ?? '',
    token: readToken(runtime),
    onMessage,
    meId,
    openPeerId: null,
  });

  // Closing the panel is when things were read, so the badge is re-read then.
  useEffect(() => {
    if (!open) refetch().catch(() => undefined);
  }, [open, refetch]);

  const unread = data?.staffUnreadCount ?? 0;

  return (
    <Tooltip title={t('shell.chat.panel.open')}>
      <IconButton
        size="small"
        onClick={onToggle}
        color={open ? 'primary' : 'default'}
        aria-label="chat with a coworker"
      >
        <Badge color="error" badgeContent={unread} max={99}>
          <ChatBubbleOutlineIcon fontSize="small" />
        </Badge>
      </IconButton>
    </Tooltip>
  );
}
