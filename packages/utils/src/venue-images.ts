/**
 * Every picture a venue has, cover first.
 *
 * A venue stores its photos in two fields — `cover_image_url` (the one the
 * owner picked as the face of the venue) and `gallery` (the rest) — and every
 * surface that shows more than one of them wants the same list: cover first,
 * no blanks, no repeats. That list was being rebuilt inline on the venue
 * detail page, the native detail screen and now both discovery cards, which is
 * four copies of a rule that has to agree: the card's slider and the detail
 * page's lightbox index into the SAME array, so a venue whose cover is also in
 * its gallery must dedupe identically in both or tapping photo three opens
 * photo four.
 *
 * Framework-free (rule 40) — mWeb renders it with MUI, native with Tamagui.
 */

/** The two image fields, as any venue query returns them. */
export interface VenueImageSource {
  cover_image_url?: string | null;
  gallery?: readonly (string | null)[] | null;
}

/**
 * Cover first, then the gallery — blanks dropped and duplicates collapsed.
 * Returns `[]` for a venue with no photos at all, which is what tells a card
 * to render its placeholder instead of an empty slider.
 */
export function venueImages(venue: VenueImageSource | null | undefined): string[] {
  if (!venue) return [];
  const all = [venue.cover_image_url, ...(venue.gallery ?? [])];
  const urls = all.map((url) => (url ?? '').trim()).filter((url) => url.length > 0);
  return [...new Set(urls)];
}
