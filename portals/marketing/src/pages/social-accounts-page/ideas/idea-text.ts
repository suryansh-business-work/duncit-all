import type { SocialIdea } from '../publish.queries';

/** The caption and hashtags an idea becomes when it is picked up in the composer. */
export function ideaText(idea: SocialIdea): string {
  if (idea.hashtags.length === 0) return idea.caption;
  const tags = idea.hashtags.map((tag) => `#${tag}`).join(' ');
  return `${idea.caption}\n\n${tags}`;
}
