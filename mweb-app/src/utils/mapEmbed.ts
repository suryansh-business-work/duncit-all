/**
 * Google Maps embed helpers — single source of truth shared by every map
 * preview (pod location + venue). With `VITE_GOOGLE_MAP_API` set it uses the
 * official Embed API; without one it falls back to the keyless `output=embed`
 * map so the preview always renders (no env setup required). Same contract as
 * the mobile app's `locationMapEmbedUrl`.
 */
export function mapEmbedUrl(query: string): string {
  if (!query) return '';
  const apiKey = import.meta.env.VITE_GOOGLE_MAP_API as string | undefined;
  const q = encodeURIComponent(query);
  return apiKey
    ? `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(apiKey)}&q=${q}&zoom=14`
    : `https://maps.google.com/maps?q=${q}&z=14&output=embed`;
}

/** Deep link to open the query in the full Google Maps app/site. */
export function mapSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
