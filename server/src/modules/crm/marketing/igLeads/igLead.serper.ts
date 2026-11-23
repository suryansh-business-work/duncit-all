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

async function serperPost<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
  const key = (await getRuntimeEnvValue('SERPER_API_KEY')).trim();
  if (!key) {
    throw new GraphQLError('Serper is not configured. Add the SERPER API key in the Tech portal.', {
      extensions: { code: 'NOT_CONFIGURED' },
    });
  }
  return socialJson<T>(SERVICE, endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-KEY': key },
    body: JSON.stringify({ gl: 'in', ...body }),
  });
}

/** One Google search, profiles only, in the order Google ranked them. */
export async function searchProfiles(query: string): Promise<ProfileHit[]> {
  const answer = await serperPost<SerperAnswer>(ENDPOINT, { q: `site:instagram.com ${query}`, num: RESULTS_PER_QUERY });
  const hits: ProfileHit[] = [];
  for (const result of answer.organic ?? []) {
    const username = profileUsername(result.link ?? '');
    if (username) hits.push({ username, snippet: `${result.title ?? ''} ${result.snippet ?? ''}`.trim() });
  }
  return hits;
}

const PLACES_ENDPOINT = 'https://google.serper.dev/places';

/** One business as Google Maps lists it. */
export interface PlaceHit {
  title: string;
  address: string;
  phone: string;
  website: string;
  category: string;
  rating: number | null;
  rating_count: number | null;
  /** The listing on Google Maps, built from its customer id. */
  maps_url: string;
}

interface SerperPlaces {
  places?: Array<{
    title?: string;
    address?: string;
    phoneNumber?: string;
    website?: string;
    category?: string;
    rating?: number;
    ratingCount?: number;
    cid?: string;
  }>;
}

const finite = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? value : null);

/** Google Maps listings for a query ("dog cafe Indiranagar Bengaluru"), in Google's order. */
export async function searchPlaces(query: string): Promise<PlaceHit[]> {
  const answer = await serperPost<SerperPlaces>(PLACES_ENDPOINT, { q: query });
  return (answer.places ?? [])
    .filter((place) => place.title)
    .map((place) => ({
      title: place.title ?? '',
      address: place.address ?? '',
      phone: place.phoneNumber ?? '',
      website: place.website ?? '',
      category: place.category ?? '',
      rating: finite(place.rating),
      rating_count: finite(place.ratingCount),
      maps_url: place.cid ? `https://www.google.com/maps?cid=${encodeURIComponent(place.cid)}` : '',
    }));
}

/** One plain Google result. */
export interface WebHit {
  title: string;
  link: string;
  snippet: string;
}

/** An ordinary Google search (no site filter) — official sites, directories and listings. */
export async function searchWeb(query: string): Promise<WebHit[]> {
  const answer = await serperPost<SerperAnswer>(ENDPOINT, { q: query, num: RESULTS_PER_QUERY });
  return (answer.organic ?? [])
    .filter((result) => result.link)
    .map((result) => ({ title: result.title ?? '', link: result.link ?? '', snippet: result.snippet ?? '' }));
}
