import { useMemo, useState } from 'react';
import { useMarkReadWhileVisible, useVenueChatLineActions } from '@duncit/availability-calendar';
import { seenByOtherSide, seenFacesByLine, venueChatLineActions, type VenueChatLine, type VenueChatSide } from '@duncit/utils';
import type { MessageActionsTarget } from '../chat-room-page/MessageActionsMenu';
import type { useVenueChatThread } from './useVenueChatThread';

interface Options {
  podId: string;
  side: VenueChatSide;
  thread: ReturnType<typeof useVenueChatThread>;
  meId: string | undefined;
  onError: (message: string) => void;
}

/**
 * Everything a member does to a venue thread's lines once they are in: the
 * message menu (react, edit their own text, delete their own text or photo),
 * the reaction picker, the edit and delete dialogs, the "seen" faces under each
 * line, whether the other side has seen a given line yet, and the read mark —
 * moved to the end whenever a line from someone else arrives while the page is
 * in view, and when the reader comes back to the tab.
 */
export function useVenueChatInteractions({ podId, side, thread, meId, onError }: Options) {
  const actions = useVenueChatLineActions({ onLine: (line) => thread.addLines([line]), onRemoved: thread.removeLine, onError });
  const [menu, setMenu] = useState<MessageActionsTarget | null>(null);
  const [reactTarget, setReactTarget] = useState<{ el: HTMLElement; id: string } | null>(null);
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { lines, marks } = thread;
  const lineOf = (id: string) => lines.find((line) => line.id === id);
  const faces = useMemo(() => seenFacesByLine(lines, marks, meId), [lines, marks, meId]);

  // A line from someone else arriving while the page is in view has been read.
  useMarkReadWhileVisible(podId, lines, meId ?? '', actions.markRead);

  const openMenu = (el: HTMLElement, id: string) => {
    const line = lineOf(id);
    if (!line) return;
    const allowed = venueChatLineActions(line, meId);
    setMenu({ el, id, mine: allowed.remove, editable: allowed.edit });
  };

  return {
    actions,
    menu,
    closeMenu: () => setMenu(null),
    openMenu,
    reactTarget,
    openReact: (el: HTMLElement, id: string) => setReactTarget({ el, id }),
    closeReact: () => setReactTarget(null),
    react: (id: string, emoji: string) => actions.react(id, emoji),
    editing,
    edit: (id: string) => setEditing({ id, text: lineOf(id)?.text ?? '' }),
    deletingId,
    remove: setDeletingId,
    closeDialogs: () => {
      setEditing(null);
      setDeletingId(null);
    },
    facesOf: (line: Pick<VenueChatLine, 'id'>) => faces.get(line.id),
    seen: (line: Pick<VenueChatLine, 'createdAt'>) => seenByOtherSide(line, marks, side),
  };
}
