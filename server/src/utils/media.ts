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
 */

export interface StoredMedia {
  url?: string | null;
  type?: string | null;
}

/** The first IMAGE in the list, or '' when it holds none. Never a video. */
export function firstImageUrl(media?: readonly StoredMedia[] | null): string {
  const found = (media ?? []).find(
    (item) => String(item?.type ?? '').toUpperCase() === 'IMAGE' && String(item?.url ?? '').trim()
  );
  return String(found?.url ?? '').trim();
}
