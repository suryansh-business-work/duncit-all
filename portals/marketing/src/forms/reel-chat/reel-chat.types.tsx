import { z } from 'zod';
import type { Translate } from '@duncit/shell';
import type { SavedPrompts } from '../../pages/reels/studio/chat/useSavedPrompts';
import { MAX_REQUEST_LENGTH } from '../../pages/reels/types';

/** One request to the editor. The cap is the server's, so a message is refused here rather than after a round trip. */
export const buildReelChatSchema = (t: Translate) =>
  z.object({
    text: z
      .string()
      .trim()
      .min(1, t('ai.reels.chat.textRequired'))
      .max(MAX_REQUEST_LENGTH, t('ai.reels.chat.textMax', { vars: { max: MAX_REQUEST_LENGTH } })),
  });

export interface ReelChatFormValues {
  text: string;
}

export const reelChatInitialValues: ReelChatFormValues = { text: '' };

export interface ReelChatFormProps {
  /** True while a turn is with the editor: the composer holds until it answers. */
  busy: boolean;
  savedPrompts: SavedPrompts;
  /** Sends the request with its attached pictures; answers true when it went through. */
  onSend: (text: string, imageUrls: string[]) => Promise<boolean>;
}
