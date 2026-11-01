import { GraphQLError } from 'graphql';
import { isInstagramHandle, normalizeInstagramHandle } from '@utils/social-handle';
import { PUBLISH_RULES } from './social.rules';

/**
 * Instagram collaborators on a post: each a real Instagram username (an @ or
 * a pasted profile link is stripped first), each once, and no more than the
 * API takes. A wrong one is refused here — Instagram would otherwise fail the
 * whole post at publish time for one mistyped name.
 */
export const MAX_INSTAGRAM_COLLABORATORS = PUBLISH_RULES.INSTAGRAM.maxCollaborators;

const badInput = (message: string) => new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });

export function normalizeCollaborators(raw: readonly string[] | null | undefined): string[] {
  const handles = [...new Set((raw ?? []).map(normalizeInstagramHandle).filter(Boolean))];
  const wrong = handles.filter((handle) => !isInstagramHandle(handle));
  if (wrong.length > 0) throw badInput(`${wrong.map((handle) => `@${handle}`).join(', ')} is not an Instagram username.`);
  if (handles.length > MAX_INSTAGRAM_COLLABORATORS) {
    throw badInput(`Instagram takes at most ${MAX_INSTAGRAM_COLLABORATORS} collaborators on a post.`);
  }
  return handles;
}
