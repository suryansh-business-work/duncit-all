import { z } from 'zod';
import type { Translate } from '@duncit/shell';

/** The server's own cap on one DM. */
export const MESSAGE_MAX = 1000;

export interface LeadMessageFormValues {
  text: string;
}

export const leadMessageSchema = (t: Translate) =>
  z.object({
    text: z
      .string()
      .trim()
      .min(1, t('marketing.igLeads.messageRequired'))
      .max(MESSAGE_MAX, t('marketing.igLeads.messageTooLong', { vars: { max: MESSAGE_MAX } })),
  });

export interface LeadMessageFormProps {
  /** The AI draft the box starts from; empty when there is none yet. */
  draft: string;
  /** Opener or "Follow-up 2 of 3" — said above the box. */
  stepLabel: string;
  /** The lead's Instagram chat, opened in a new tab to paste the message into. */
  chatUrl: string;
  drafting: boolean;
  sending: boolean;
  onDraft: () => Promise<void>;
  /** Record the send; the form has already copied the text for pasting. */
  onSend: (values: LeadMessageFormValues) => Promise<void>;
}
