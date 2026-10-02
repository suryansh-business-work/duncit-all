import { z } from 'zod';
import type { Translate } from '@duncit/shell';
import { MAX_REQUEST_LENGTH } from '../../pages/reels/types';

/**
 * A request saved for reuse: the name it is listed under, and the words that
 * are dropped into the composer. The body is capped at what one chat message
 * may carry, so a saved prompt can never be one the editor would refuse.
 */
export const buildReelPromptSchema = (t: Translate) =>
  z.object({
    name: z.string().trim().min(1, t('ai.reels.prompts.nameRequired')).max(80, t('ai.reels.prompts.nameMax')),
    content: z
      .string()
      .trim()
      .min(1, t('ai.reels.prompts.contentRequired'))
      .max(MAX_REQUEST_LENGTH, t('ai.reels.prompts.contentMax', { vars: { max: MAX_REQUEST_LENGTH } })),
  });

export interface ReelPromptFormValues {
  name: string;
  content: string;
}

export interface ReelPromptFormProps {
  open: boolean;
  /** What is in the composer when Save is pressed — the dialog opens on it. */
  content: string;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (values: ReelPromptFormValues) => Promise<void> | void;
}
