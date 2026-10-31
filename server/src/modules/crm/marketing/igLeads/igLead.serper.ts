import { GraphQLError } from 'graphql';
import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { socialJson } from '../social/providers/http';

/**
 * Google results through serper.dev, narrowed to instagram.com, as the list
 * of profiles a brief points at. Instagram has no search API of its own, so
 * this is the discovery step; Business Discovery then reads each profile.
 */
const SERVICE = 'Serper';
const ENDPOINT = 'https://google.serper.dev/search';
const RESULTS_PER_QUERY = 20;

/** Paths on instagram.com that are pages, not profiles. */
const NOT_PROFILES = new Set(['p', 'reel', 'reels', 'explore', 'stories', 'tv', 'accounts', 'about', 'developer', 'legal', 'direct']);
/** Instagram's own rule: letters, digits, dots and underscores, up to 30. */
const PROFILE_PATH = /^\/([A-Za-z0-9._]{1,30})\/?$/;

export interface ProfileHit {
  username: string;
  /** Google's title and snippet — sometimes the only place a phone number shows. */
  snippet: string;
}

interface SerperAnswer {
  organic?: Array<{ link?: string; title?: string; snippet?: string }>;
}

export async function serperReady(): Promise<boolean> {
  return (await getRuntimeEnvValue('SERPER_API_KEY')).trim() !== '';
}

/** The username a result links to, or null for a post, a reel or another site. */
export function profileUsername(link: string): string | null {
  let url: URL;
  try {
    url = new URL(link);
  } catch {
    return null;
  }
  if (!/(^|\.)instagram\.com$/i.test(url.hostname)) return null;
  const match = PROFILE_PATH.exec(url.pathname);
  const username = match?.[1]?.toLowerCase();
  return username && !NOT_PROFILES.has(username) ? username : null;
}

/** One Google search, profiles only, in the order Google ranked them. */
export async function searchProfiles(query: string): Promise<ProfileHit[]> {
  const key = (await getRuntimeEnvValue('SERPER_API_KEY')).trim();
  if (!key) {
    throw new GraphQLError('Serper is not configured. Add the SERPER API key in the Tech portal.', {
      extensions: { code: 'NOT_CONFIGURED' },
    });
  }
  const answer = await socialJson<SerperAnswer>(SERVICE, ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-KEY': key },
    body: JSON.stringify({ q: `site:instagram.com ${query}`, gl: 'in', num: RESULTS_PER_QUERY }),
  });
  const hits: ProfileHit[] = [];
  for (const result of answer.organic ?? []) {
    const username = profileUsername(result.link ?? '');
    if (username) hits.push({ username, snippet: `${result.title ?? ''} ${result.snippet ?? ''}`.trim() });
  }
  return hits;
}
