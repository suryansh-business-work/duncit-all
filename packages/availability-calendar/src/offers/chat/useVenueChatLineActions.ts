import { useCallback } from 'react';
import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import { useTranslation } from '@duncit/app-settings';
import { createLogger } from '@duncit/logs';
import {
  DELETE_VENUE_CHAT_MESSAGE_SDL,
  EDIT_VENUE_CHAT_MESSAGE_SDL,
  MARK_VENUE_CHAT_READ_SDL,
  REACT_TO_VENUE_CHAT_MESSAGE_SDL,
  type VenueChatLine,
} from '@duncit/utils';
import { errorText } from '../../pricing/format';

const logger = createLogger('portal');

const REACT = gql(REACT_TO_VENUE_CHAT_MESSAGE_SDL);
const EDIT = gql(EDIT_VENUE_CHAT_MESSAGE_SDL);
const DELETE = gql(DELETE_VENUE_CHAT_MESSAGE_SDL);
const MARK_READ = gql(MARK_VENUE_CHAT_READ_SDL);

interface Options {
  /** A line came back changed (edited, reacted to): put it in place of the one shown. */
  onLine: (line: VenueChatLine) => void;
  /** A line the reader removed: take it off the screen. */
  onRemoved: (id: string) => void;
  /** A change failed — already worded for the reader. */
  onError: (message: string) => void;
}

/**
 * What a venue thread's member does to lines already sent — react, rewrite or
 * take back their own, and say they have read it to the end — for mWeb and the
 * Partners app alike. Every refusal is shown in the reader's words; a read mark
 * that does not land is only logged (the next open moves it anyway).
 */
export function useVenueChatLineActions({ onLine, onRemoved, onError }: Options) {
  const { t } = useTranslation();
  const [reactMutation] = useMutation<{ reactToVenueChatMessage: VenueChatLine }>(REACT);
  const [editMutation, editState] = useMutation<{ editVenueChatMessage: VenueChatLine }>(EDIT);
  const [deleteMutation, deleteState] = useMutation<{ deleteVenueChatMessage: boolean }>(DELETE);
  const [markMutation] = useMutation<{ markVenueChatRead: boolean }>(MARK_READ);
  const failed = (error: unknown) => onError(errorText(error, t('availability.offers.chat.actionFailed')));

  const react = async (messageId: string, emoji: string) => {
    try {
      const { data } = await reactMutation({ variables: { message_id: messageId, emoji } });
      if (data) onLine(data.reactToVenueChatMessage);
    } catch (error) {
      failed(error);
    }
  };

  /** Resolves true once the new text is in. */
  const edit = async (messageId: string, text: string): Promise<boolean> => {
    try {
      const { data } = await editMutation({ variables: { message_id: messageId, text } });
      if (data) onLine(data.editVenueChatMessage);
      return true;
    } catch (error) {
      failed(error);
      return false;
    }
  };

  /** Resolves true once the line is gone. */
  const remove = async (messageId: string): Promise<boolean> => {
    try {
      await deleteMutation({ variables: { message_id: messageId } });
      onRemoved(messageId);
      return true;
    } catch (error) {
      failed(error);
      return false;
    }
  };

  // Stable, so a screen can mark the thread read from an effect without re-running it every render.
  const markRead = useCallback(
    async (podId: string) => {
      try {
        await markMutation({ variables: { pod_id: podId } });
      } catch (error) {
        logger.warn('venueChat', 'markRead', { error, pod_id: podId });
      }
    },
    [markMutation],
  );

  return { react, edit, remove, markRead, busy: editState.loading || deleteState.loading };
}

export type VenueChatLineActions = ReturnType<typeof useVenueChatLineActions>;
