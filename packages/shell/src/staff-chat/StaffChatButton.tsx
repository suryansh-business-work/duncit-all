import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@apollo/client';
import { Badge, IconButton, Tooltip } from '@mui/material';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import { readToken, useShellRuntime } from '../lib/runtime';
import { STAFF_UNREAD } from './queries';
import { StaffChatDrawer } from './index';
import { useStaffSocket } from './useStaffSocket';

/**
 * The chat entry point in the header, and the only thing that is always
 * mounted.
 *
 * It has to be: the beep and the unread badge are the whole point of a chat you
 * are not looking at. The drawer itself mounts only when opened, so the
 * conversation queries do not run in every portal all day.
 */
export function StaffChatButton({ meId }: Readonly<{ meId?: string | null }>) {
  const runtime = useShellRuntime();
  const [open, setOpen] = useState(false);
  const { data, refetch } = useQuery<{ staffUnreadCount: number }>(STAFF_UNREAD, {
    skip: !runtime,
    fetchPolicy: 'cache-and-network',
  });

  // A new message changes the badge whether or not the drawer is open — which
  // is what the socket is for. The beep lives in the hook, and skips anything
  // you wrote yourself.
  const onMessage = useCallback(() => {
    void refetch();
  }, [refetch]);

  useStaffSocket({
    graphqlUrl: runtime?.graphqlUrl ?? '',
    token: readToken(runtime),
    onMessage,
    meId,
    openPeerId: null,
  });

  // Closing the drawer is when things were read, so the badge is re-read then.
  useEffect(() => {
    if (!open) void refetch();
  }, [open, refetch]);

  const unread = data?.staffUnreadCount ?? 0;

  return (
    <>
      <Tooltip title="Chat with a coworker">
        <IconButton size="small" onClick={() => setOpen(true)} aria-label="chat with a coworker">
          <Badge color="error" badgeContent={unread} max={99}>
            <ChatBubbleOutlineIcon fontSize="small" />
          </Badge>
        </IconButton>
      </Tooltip>
      {open && <StaffChatDrawer open onClose={() => setOpen(false)} meId={meId ?? ''} />}
    </>
  );
}
