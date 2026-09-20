import { z } from 'zod';
import { REVIEWER_MESSAGE_MAX, REVIEWER_MESSAGE_MIN } from '../reviewer-message';

/** A version string as the stores show it: 1.80.3, or a Play release name. */
const VERSION_MAX = 120;
const BUILD_NUMBER_MAX = 60;

export interface LogRejectionMessages {
  versionRequired: string;
  versionTooLong: string;
  buildTooLong: string;
  messageTooShort: string;
  messageTooLong: string;
}

/**
 * A rejection logged by hand — the only way for Google Play, whose API says
 * nothing about review. The reviewer's message is required: the advice is
 * written from it, and a logged rejection with no reason helps nobody.
 */
export const logRejectionSchema = (messages: LogRejectionMessages) =>
  z.object({
    version: z.string().trim().min(1, messages.versionRequired).max(VERSION_MAX, messages.versionTooLong),
    build_number: z.string().trim().max(BUILD_NUMBER_MAX, messages.buildTooLong),
    reviewer_message: z
      .string()
      .trim()
      .min(REVIEWER_MESSAGE_MIN, messages.messageTooShort)
      .max(REVIEWER_MESSAGE_MAX, messages.messageTooLong),
  });

export type LogRejectionValues = z.infer<ReturnType<typeof logRejectionSchema>>;
