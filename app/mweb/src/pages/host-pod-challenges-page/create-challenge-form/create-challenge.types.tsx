import { z } from 'zod';

type Translate = (key: string) => string;

export const CHALLENGE_NAME_MAX = 80;

/** A new challenge on this pod: an eligible template and an optional own name. */
export const buildCreateChallengeSchema = (t: Translate) =>
  z.object({
    template_id: z.string().min(1, t('mweb.challenge.errors.template')),
    name: z.string().trim().max(CHALLENGE_NAME_MAX, t('mweb.challenge.errors.challengeName')),
  });

export type CreateChallengeValues = z.infer<ReturnType<typeof buildCreateChallengeSchema>>;
