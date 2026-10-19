import { create } from 'zustand';
import type { ChatNewFrame } from '@duncit/utils';

interface ChatAlertsState {
  /** The message the in-app banner is showing, or null. */
  banner: ChatNewFrame | null;
  /** Moves on every `chat:new` and every room read — the unread total refreshes on it. */
  changes: number;
  show: (frame: ChatNewFrame) => void;
  dismiss: () => void;
  /** A room was read here: unread counts should refresh. */
  roomRead: () => void;
}

/**
 * App-wide chat alerts: the banner for a message in a room the reader is not
 * looking at, and a counter the unread badge listens to. mWeb twin:
 * components/chat-state/chatAlerts (DOM events there).
 */
export const useChatAlertsStore = create<ChatAlertsState>((set) => ({
  banner: null,
  changes: 0,
  show: (frame) => set((s) => ({ banner: frame, changes: s.changes + 1 })),
  dismiss: () => set({ banner: null }),
  roomRead: () => set((s) => ({ changes: s.changes + 1 })),
}));
