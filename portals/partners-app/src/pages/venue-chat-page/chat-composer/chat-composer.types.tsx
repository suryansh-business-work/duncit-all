import { z } from 'zod';
import type { Translate } from '@duncit/forms/schemas';
import { VENUE_CHAT_TEXT_MAX } from '../queries';

/** One line to the host: something to say, within the server's cap. */
export function makeChatComposerSchema(t: Translate) {
  return z.object({
    text: z
      .string()
      .trim()
      .min(1, t('partners.venueChat.writeSomething'))
      .max(VENUE_CHAT_TEXT_MAX, t('partners.venueChat.tooLong', { vars: { max: VENUE_CHAT_TEXT_MAX } })),
  });
}

export type ChatComposerValues = z.infer<ReturnType<typeof makeChatComposerSchema>>;

export const chatComposerDefaults: ChatComposerValues = { text: '' };

export interface ChatComposerProps {
  sending: boolean;
  /** Resolves true once the line is posted — the box clears only then, so a failed send keeps the draft. */
  onSend: (text: string) => Promise<boolean>;
}
