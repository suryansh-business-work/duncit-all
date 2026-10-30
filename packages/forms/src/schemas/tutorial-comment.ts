import { z } from 'zod';
import { TUTORIAL_COMMENT_MAX } from '@duncit/utils';
import type { Translate } from './translate';

/** The comment box under a Learnings (tutorial) video. */
export interface TutorialCommentValues {
  text: string;
}

/**
 * One comment, trimmed, 1..{@link TUTORIAL_COMMENT_MAX} characters — the same
 * bounds the server enforces. One contract for mWeb's drawer and the native sheet.
 */
export const makeTutorialCommentSchema = (t: Translate) =>
  z.object({
    text: z
      .string()
      .trim()
      .min(1, t('mweb.tutorials.commentRequired'))
      .max(TUTORIAL_COMMENT_MAX, t('mweb.tutorials.commentTooLong', { vars: { max: TUTORIAL_COMMENT_MAX } })),
  });
