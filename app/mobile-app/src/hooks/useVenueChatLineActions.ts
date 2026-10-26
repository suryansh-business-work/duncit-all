import { useCallback } from 'react';
import { logs } from '@duncit/logs';

import {
  DeleteVenueChatMessageDocument,
  EditVenueChatMessageDocument,
  ReactToVenueChatMessageDocument,
} from '@/graphql/venue-chat';
import { useTranslation } from '@/hooks/useTranslation';
import type { VenueChatMessage } from '@/hooks/useVenueChat';
import { graphqlRequest } from '@/services/graphql.client';
import { toErrorMessage } from '@/utils/errors';

interface Apply {
  /** Puts the line as everyone now sees it in place of its copy. */
  replaceLine: (line: VenueChatMessage) => void;
  /** Takes a removed line out of the thread. */
  removeLine: (id: string) => void;
}

/**
 * What a venue thread's member does to a line once it is sent: react (the same
 * emoji again takes the reaction back), rewrite their own text, remove their
 * own text or photo. The server is the gate; each answer is applied at once
 * (the socket's echo of it lands on the same line, harmlessly). Each resolves
 * null once done, or the reason it was refused — worded for the reader, and
 * logged — for the surface that asked to show.
 */
export function useVenueChatLineActions({ replaceLine, removeLine }: Apply) {
  const { t } = useTranslation();
  const failed = t('availability.offers.chat.actionFailed');

  const attempt = useCallback(
    async (action: string, messageId: string, request: () => Promise<void>) => {
      try {
        await request();
        return null;
      } catch (error: unknown) {
        logs.mobileApp.warn('venueChat', action, { error, message_id: messageId });
        return toErrorMessage(error, failed);
      }
    },
    [failed],
  );

  const react = (messageId: string, emoji: string) =>
    attempt('react', messageId, async () => {
      const data = await graphqlRequest(
        ReactToVenueChatMessageDocument,
        { messageId, emoji },
        { auth: true },
      );
      replaceLine(data.reactToVenueChatMessage);
    });

  const edit = (messageId: string, text: string) =>
    attempt('edit', messageId, async () => {
      const data = await graphqlRequest(
        EditVenueChatMessageDocument,
        { messageId, text },
        { auth: true },
      );
      replaceLine(data.editVenueChatMessage);
    });

  const remove = (messageId: string) =>
    attempt('delete', messageId, async () => {
      await graphqlRequest(DeleteVenueChatMessageDocument, { messageId }, { auth: true });
      removeLine(messageId);
    });

  return { react, edit, remove };
}

export type VenueChatLineActions = ReturnType<typeof useVenueChatLineActions>;
