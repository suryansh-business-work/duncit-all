import { z } from 'zod';
import { makeRules } from '../../../lib/rules';
import type { Translate } from '../../../lib/translate';

/** The server keeps a reply of up to 1000 characters. */
export const REPLY_MAX = 1000;

export const makeReviewReplySchema = (t: Translate) => z.object({ reply: makeRules(t).requiredText(REPLY_MAX) });

export type ReviewReplyValues = z.infer<ReturnType<typeof makeReviewReplySchema>>;
