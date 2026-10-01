import { useCallback, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { notifyError } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import { parseApiError } from '@duncit/utils';
import { REEL_PROJECT, SEND_REEL_MESSAGE } from '../../queries';

/** A request on its way to the editor: shown in the transcript before the server has it. */
export interface PendingTurn {
  text: string;
  imageUrls: string[];
}

/** The file's own name out of its address — what the editor is told the picture is called. */
function fileNameOf(url: string): string {
  try {
    const path = new URL(url).pathname;
    return decodeURIComponent(path.slice(path.lastIndexOf('/') + 1)) || 'image';
  } catch {
    return 'image';
  }
}

/**
 * One chat turn with the editor.
 *
 * A turn takes as long as the model does — several seconds — so the request is
 * drawn at once and the reply's place is held by a "working" line. When the
 * server answers, the reel is refetched and the real transcript replaces both;
 * the same refetch is what swaps the new edit into the player.
 */
export function useReelChat(projectId: string) {
  const { t } = useTranslation();
  const [pending, setPending] = useState<PendingTurn | null>(null);
  const [sendMutation] = useMutation(SEND_REEL_MESSAGE, {
    refetchQueries: [{ query: REEL_PROJECT, variables: { id: projectId } }],
    awaitRefetchQueries: true,
  });

  /** Answers true when the turn went through, so the composer knows to clear. */
  const send = useCallback(
    async (text: string, imageUrls: string[]): Promise<boolean> => {
      setPending({ text, imageUrls });
      let sent = true;
      try {
        const uploads = imageUrls.map((url) => ({ url, name: fileNameOf(url) }));
        await sendMutation({ variables: { input: { project_id: projectId, text, uploads } } });
      } catch (error) {
        notifyError(parseApiError(error, t('ai.reels.chat.sendFailed')));
        sent = false;
      }
      setPending(null);
      return sent;
    },
    [sendMutation, projectId, t]
  );

  return { send, pending, sending: pending !== null };
}
