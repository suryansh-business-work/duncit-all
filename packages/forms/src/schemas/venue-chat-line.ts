import { z } from 'zod';

import type { Translate } from './translate';

/** The server's bound on one venue chat line (venueChat `MAX_VENUE_CHAT_TEXT`). */
export const VENUE_CHAT_TEXT_MAX = 2000;

/**
 * A venue chat line its author rewrites: something to say, within the server's
 * bound. One rule for mWeb, the Partners app and the native app (rules 27 + 56);
 * the server checks the words themselves (no phone numbers or links).
 */
export function makeVenueChatEditSchema(t: Translate) {
  return z.object({
    text: z
      .string()
      .trim()
      .min(1, t('availability.offers.chat.editRequired'))
      .max(VENUE_CHAT_TEXT_MAX, t('availability.offers.chat.editTooLong', { vars: { max: VENUE_CHAT_TEXT_MAX } })),
  });
}

export type VenueChatEditValues = z.input<ReturnType<typeof makeVenueChatEditSchema>>;
