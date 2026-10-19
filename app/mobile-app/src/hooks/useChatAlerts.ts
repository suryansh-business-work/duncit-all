import { useEffect } from 'react';
import { CHAT_NEW_EVENT, isViewingRoom, parseChatNewFrame, type OpenChatRoom } from '@duncit/utils';

import { navigationRef } from '@/navigation/navigationRef';
import { pingForMessage } from '@/services/chat-sound';
import { openUserSocket } from '@/services/user-socket';
import { useAuthStore } from '@/stores/auth.store';
import { useChatAlertsStore } from '@/stores/chat-alerts.store';
import { useNotificationPrefsStore } from '@/stores/notification-prefs.store';

/** The chat room on screen right now, read from the navigator. */
export function openChatRoom(): OpenChatRoom | null {
  if (!navigationRef.isReady()) return null;
  const route = navigationRef.getCurrentRoute();
  if (route?.name !== 'ChatRoom') return null;
  const params = (route.params ?? {}) as { podId?: string; clubId?: string };
  if (params.clubId) return { kind: 'CLUB', id: params.clubId };
  return params.podId ? { kind: 'POD', id: params.podId } : null;
}

/**
 * App-wide: a message in a room the reader is not looking at pings (one per
 * burst) and shows the in-app banner. The server already left out muted rooms
 * (unless the reader was mentioned) and rooms open on screen; the route check
 * covers a frame racing a navigation. The device-local notification switch
 * silences both.
 */
export function useChatAlerts(): void {
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (!token) return undefined;
    let disposed = false;
    let cleanup: (() => void) | null = null;
    openUserSocket()
      .then((socket) => {
        if (!socket) return;
        socket.on(CHAT_NEW_EVENT, (raw: unknown) => {
          const frame = parseChatNewFrame(raw);
          if (!frame || isViewingRoom(openChatRoom(), frame)) return;
          if (!useNotificationPrefsStore.getState().enabled) return;
          pingForMessage(frame.message_id);
          useChatAlertsStore.getState().show(frame);
        });
        cleanup = () => {
          socket.disconnect();
        };
        if (disposed) cleanup();
      })
      .catch(() => undefined);
    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [token]);
}
