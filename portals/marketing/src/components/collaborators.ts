import { z } from 'zod';
import { isInstagramHandle } from '@duncit/regex';
import type { Translate } from '@duncit/shell';
import { PUBLISH_RULES } from '../pages/social-accounts-page/social-post-form/publish-rules';

/**
 * Instagram collaborators — the accounts invited onto a post, who each accept
 * in Instagram before the post shows on their profile too. Instagram is the
 * only network with them, and its API takes at most this many per post.
 */
export const COLLABORATOR_CAP = PUBLISH_RULES.INSTAGRAM.maxCollaborators;

/** A handle as it is stored: trimmed, without the `@` people type, lower-case (Instagram usernames ignore case). */
export function normalizeHandle(raw: string): string {
  let handle = raw.trim();
  while (handle.startsWith('@')) handle = handle.slice(1);
  return handle.trim().toLowerCase();
}

/** Every handle once, in the order typed, blanks dropped. */
export const uniqueHandles = (raw: readonly string[]): string[] => [...new Set(raw.map(normalizeHandle).filter(Boolean))];

/** At most the cap, and each one an Instagram username. */
export const collaboratorsSchema = (t: Translate) =>
  z
    .array(z.string())
    .max(COLLABORATOR_CAP, t('marketing.social.collaboratorsTooMany', { vars: { max: COLLABORATOR_CAP } }))
    .refine((handles) => handles.every(isInstagramHandle), t('marketing.social.collaboratorInvalid'));
