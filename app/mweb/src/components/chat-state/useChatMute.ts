import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { isChatMuted, type ChatMuteDuration } from '@duncit/utils';
import type { ChatMuteState, ChatRoomKind } from '@duncit/gql-types';
import { logs } from '@duncit/logs';
import { CHAT_MUTE_STATE, MUTE_CHAT, UNMUTE_CHAT } from './queries';

type MuteFields = Pick<ChatMuteState, 'is_muted' | 'muted_until'>;

interface Options {
  kind: ChatRoomKind;
  id: string | null | undefined;
  /** What the room's own query already says (pod and club rooms); the support
   * chat has none and reads `chatMuteState` instead. */
  initial?: MuteFields | null;
  onError: (message: string) => void;
  /** Already-translated failure line. */
  failedText: string;
}

/** A chat's mute: what is in force now, and choosing a length or unmuting. */
export function useChatMute({ kind, id, initial, onError, failedText }: Options) {
  const readOwn = kind === 'SUPPORT';
  const { data } = useQuery<{ chatMuteState: ChatMuteState }>(CHAT_MUTE_STATE, {
    variables: { kind, id },
    skip: !id || !readOwn,
    fetchPolicy: 'cache-and-network',
  });
  const [mute, muteState] = useMutation<{ muteChat: ChatMuteState }>(MUTE_CHAT);
  const [unmute, unmuteState] = useMutation<{ unmuteChat: ChatMuteState }>(UNMUTE_CHAT);
  // What the last choice returned; the room's own answer stands until then.
  const [chosen, setChosen] = useState<MuteFields | null>(null);
  useEffect(() => setChosen(null), [kind, id]);

  const state = chosen ?? (readOwn ? data?.chatMuteState : initial) ?? null;

  const choose = async (duration: ChatMuteDuration | null) => {
    if (!id) return;
    try {
      if (duration) {
        const res = await mute({ variables: { kind, id, duration } });
        if (res.data) setChosen(res.data.muteChat);
      } else {
        const res = await unmute({ variables: { kind, id } });
        if (res.data) setChosen(res.data.unmuteChat);
      }
    } catch (error) {
      logs.mWeb.warn('chat-mute', 'choose', { kind, error });
      onError(failedText);
    }
  };

  return {
    muted: isChatMuted(state),
    mutedUntil: state?.muted_until ?? null,
    busy: muteState.loading || unmuteState.loading,
    choose,
  };
}
