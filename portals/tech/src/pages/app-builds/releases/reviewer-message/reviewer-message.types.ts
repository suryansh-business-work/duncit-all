import { z } from 'zod';

export const REVIEWER_MESSAGE_MIN = 10;
export const REVIEWER_MESSAGE_MAX = 8000;

export interface ReviewerMessageMessages {
  tooShort: string;
  tooLong: string;
}

/** The reviewer's words, pasted from the Resolution Center or the Play Console. */
export const reviewerMessageSchema = (messages: ReviewerMessageMessages) =>
  z.object({
    message: z
      .string()
      .trim()
      .min(REVIEWER_MESSAGE_MIN, messages.tooShort)
      .max(REVIEWER_MESSAGE_MAX, messages.tooLong),
  });

export type ReviewerMessageValues = z.infer<ReturnType<typeof reviewerMessageSchema>>;
