import type { TutorialCommentValues } from '@duncit/forms/schemas';

/** The comment box's values — the shared schema's shape (one contract with native). */
export type LearningCommentFormValues = TutorialCommentValues;

export interface LearningCommentFormProps {
  /** Posts the comment; throws when the server refuses it. */
  onSubmit: (text: string) => Promise<void>;
}

export const blankLearningComment = (): LearningCommentFormValues => ({ text: '' });
