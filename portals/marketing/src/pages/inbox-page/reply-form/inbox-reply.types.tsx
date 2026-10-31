import { z } from 'zod';
import type { Translate } from '@duncit/shell';

export interface InboxReplyFormValues {
  text: string;
}

export const blankInboxReplyValues = (): InboxReplyFormValues => ({ text: '' });

/** A reply has words in it and fits the network it goes to. */
export const inboxReplySchema = (t: Translate, max: number) =>
  z.object({
    text: z
      .string()
      .trim()
      .min(1, t('marketing.inbox.replyRequired'))
      .max(max, t('marketing.inbox.replyTooLong', { vars: { max } })),
  });

export interface InboxReplyFormProps {
  /** The longest reply the network takes. */
  max: number;
  /** Why this network cannot be answered from here; null when it can. */
  blockedReason: string | null;
  busy: boolean;
  suggesting: boolean;
  /** Claude's draft for the box, or null when there is none. */
  onSuggest: () => Promise<string | null>;
  /** True when the reply went out — only then is the box cleared. */
  onSend: (text: string) => Promise<boolean>;
}
