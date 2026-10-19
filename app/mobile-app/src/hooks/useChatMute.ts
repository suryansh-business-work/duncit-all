import { useCallback, useEffect, useState } from 'react';
import { logs } from '@duncit/logs';
import { isChatMuted, type ChatMuteDuration as MuteChoice } from '@duncit/utils';

import { ChatMuteStateDocument, MuteChatDocument, UnmuteChatDocument } from '@/graphql/chat-state';
import { ChatMuteDuration, ChatRoomKind } from '@/generated/graphql/graphql';
import { graphqlRequest } from '@/services/graphql.client';

/** A room's mute as the header reads it. */
export interface MuteFields {
  is_muted: boolean;
  muted_until?: string | null;
}

const DURATION: Record<MuteChoice, ChatMuteDuration> = {
  EIGHT_HOURS: ChatMuteDuration.EightHours,
  ONE_WEEK: ChatMuteDuration.OneWeek,
  ALWAYS: ChatMuteDuration.Always,
};

interface Options {
  kind: ChatRoomKind;
  id: string | null | undefined;
  /** What the room's own query already said (pod and club rooms); the support
   * chat has none and reads `chatMuteState` itself. */
  initial?: MuteFields | null;
  onError: (message: string) => void;
  /** Already-translated failure line. */
  failedText: string;
}

/** A chat's mute: what is in force now, and choosing a length or unmuting.
 * mWeb twin: components/chat-state/useChatMute. */
export function useChatMute({ kind, id, initial, onError, failedText }: Options) {
  const [own, setOwn] = useState<MuteFields | null>(null);
  const [chosen, setChosen] = useState<MuteFields | null>(null);
  const [busy, setBusy] = useState(false);
  const readOwn = kind === ChatRoomKind.Support;

  useEffect(() => {
    setChosen(null);
    if (!id || !readOwn) return undefined;
    let active = true;
    graphqlRequest(ChatMuteStateDocument, { kind, id }, { auth: true })
      .then((res) => active && setOwn(res.chatMuteState))
      .catch((error: unknown) => logs.mobileApp.warn('chat-mute', 'load', { kind, error }));
    return () => {
      active = false;
    };
  }, [kind, id, readOwn]);

  const state = chosen ?? (readOwn ? own : initial) ?? null;

  const choose = useCallback(
    async (duration: MuteChoice | null) => {
      if (!id) return;
      setBusy(true);
      try {
        if (duration) {
          const res = await graphqlRequest(
            MuteChatDocument,
            { kind, id, duration: DURATION[duration] },
            { auth: true },
          );
          setChosen(res.muteChat);
        } else {
          const res = await graphqlRequest(UnmuteChatDocument, { kind, id }, { auth: true });
          setChosen(res.unmuteChat);
        }
      } catch (error) {
        logs.mobileApp.warn('chat-mute', 'choose', { kind, error });
        onError(failedText);
      } finally {
        setBusy(false);
      }
    },
    [kind, id, onError, failedText],
  );

  return { muted: isChatMuted(state), mutedUntil: state?.muted_until ?? null, busy, choose };
}
