import { z } from 'zod';
import type { useTranslation } from '@duncit/shell';

type Translate = ReturnType<typeof useTranslation>['t'];

export const REVIEW_DECISIONS = ['ACCEPTED', 'DISMISSED'] as const;

/**
 * Reviewing one rated answer. "Add to knowledge" turns the corrected answer
 * (the note) into a DRAFT article a person publishes — feedback is learned by
 * review, never automatically — so it needs a real note.
 */
export const buildAskDuncitReviewSchema = (t: Translate) =>
  z
    .object({
      status: z.enum(REVIEW_DECISIONS),
      note: z.string().trim().max(4000, t('ai.askDuncit.validation.noteMax')),
      add_to_knowledge: z.boolean(),
    })
    .refine((v) => !v.add_to_knowledge || (v.status === 'ACCEPTED' && v.note.length >= 10), {
      message: t('ai.askDuncit.validation.noteForKnowledge'),
      path: ['note'],
    });

export type AskDuncitReviewValues = z.infer<ReturnType<typeof buildAskDuncitReviewSchema>>;

export const askDuncitReviewDefaults: AskDuncitReviewValues = { status: 'ACCEPTED', note: '', add_to_knowledge: false };

export interface AskDuncitReviewFormProps {
  formId: string;
  onSubmit: (values: AskDuncitReviewValues) => Promise<void>;
}
