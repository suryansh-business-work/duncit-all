import { GraphQLError } from 'graphql';

/**
 * Venue and dish videos, FSSAI numbers and licence documents — the shape
 * checks every venue write runs on them.
 *
 * The patterns are the mirrors of `YOUTUBE_URL` and `FSSAI_NUMBER` in
 * `@duncit/regex`, restated here because `server/src` imports no `@duncit/*`
 * package by design (rule 40) — keep them in sync, as `username.ts` does.
 */

/** Mirror of `@duncit/regex` YOUTUBE_URL — group 1 is the video id. */
export const YOUTUBE_URL_REGEX =
  /^https?:\/\/(?:[a-z]+\.)?(?:youtube\.com\/(?:watch\?(?:[\w%.=-]*&)?v=|(?:shorts|embed|live)\/)|youtu\.be\/)([\w-]{11})(?:[?&#]\S*)?$/i;

/** Mirror of `@duncit/regex` FSSAI_NUMBER — exactly 14 digits. */
export const FSSAI_NUMBER_REGEX = /^\d{14}$/;

/** A stored media link never needs to be longer than this. */
const MEDIA_URL_MAX = 2048;

/** YouTube's own hosts — a link on one of them must be a video link, not a channel or a playlist. */
const YOUTUBE_HOSTS = /(^|\.)(youtube\.com|youtu\.be)$/i;

const bad = (message: string): never => {
  throw new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
};

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

/** An absolute http(s) address, or null. */
function webUrl(raw: string): URL | null {
  if (raw.length > MEDIA_URL_MAX) return null;
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url : null;
  } catch {
    return null;
  }
}

/**
 * One video link: a YouTube video link, or the address of an uploaded clip.
 * A YouTube address that is not a video (a channel, a playlist) is refused —
 * no player can embed it.
 */
function videoUrl(raw: string, label: string): string {
  const url = webUrl(raw);
  if (!url) return bad(`Enter a valid video link for ${label}`);
  if (YOUTUBE_HOSTS.test(url.hostname) && !YOUTUBE_URL_REGEX.test(raw)) {
    return bad(`Enter a YouTube video link (watch, shorts or youtu.be) for ${label}`);
  }
  return raw;
}

/**
 * The videos a write carries, checked and de-duplicated, at most `limit`.
 * `label` names whose videos they are in a refusal ("Paneer Tikka", "the venue").
 */
export function normalizeVideoList(raw: unknown, limit: number, label: string): string[] {
  const list = (Array.isArray(raw) ? raw : []).map(text).filter(Boolean);
  const videos = [...new Set(list.map((item) => videoUrl(item, label)))];
  if (videos.length > limit) bad(`${label} can have at most ${limit} videos`);
  return videos;
}

/** A licence document's address: blank, or an absolute http(s) link to the uploaded file. */
export function documentUrl(raw: unknown, label: string): string {
  const value = text(raw);
  if (!value) return '';
  if (!webUrl(value)) bad(`Upload the ${label} again`);
  return value;
}
