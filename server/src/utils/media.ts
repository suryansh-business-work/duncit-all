/** Reading and vetting stored media references. */

import { GraphQLError } from 'graphql';

export interface StoredMedia {
  url?: string | null;
  type?: string | null;
}

/**
 * Picking one still picture out of a stored media list.
 *
 * A pod, a club and a venue all keep their pictures the same way — a list of
 * `{ url, type }` where a VIDEO can sit anywhere in it, first included — and
 * four places had already written their own "the cover image" one-liner
 * (rule 40). Two of them fall back to `media[0]` regardless of its type, which
 * hands a video URL to something that asked for a picture.
 *
 * This one never does. Everything downstream of it — a WhatsApp IMAGE header,
 * a link preview, an email hero — is a place where a video URL is not a
 * degraded answer but a broken one.
 *
 * The first IMAGE in the list, or '' when it holds none. Never a video.
 */
export function firstImageUrl(media?: readonly StoredMedia[] | null): string {
  const found = (media ?? []).find(
    (item) => String(item?.type ?? '').toUpperCase() === 'IMAGE' && String(item?.url ?? '').trim()
  );
  return String(found?.url ?? '').trim();
}

/**
 * Reject anything that isn't a sane media reference. The URL must be an
 * http(s) ImageKit URL (image or video) — every file goes through the picker.
 *
 * Every surface that stores a picked file runs this one check: a story, and
 * now an official status. A second copy is a second place the data-URL rule
 * can quietly drift (rule 40), so `label` names the caller's own field in the
 * message rather than each caller owning its own version of the rule.
 */
export function validateMediaUrl(url: string, label = 'image_url'): void {
  if (!url || typeof url !== 'string')
    throw new GraphQLError(`${label} is required`, { extensions: { code: 'BAD_USER_INPUT' } });
  if (!/^https?:\/\//i.test(url))
    throw new GraphQLError(
      `${label} must be an http(s) URL — please upload through the media picker`,
      { extensions: { code: 'BAD_USER_INPUT' } }
    );
  // Reject inline data URLs — every file must go through ImageKit.
  if (/^data:/i.test(url))
    throw new GraphQLError('Inline data URLs are not allowed; upload via ImageKit', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
}
