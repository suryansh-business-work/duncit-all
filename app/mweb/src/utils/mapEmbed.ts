import { getGoogleMapsApiKey } from '../config/runtimeConfig';

/**
 * Google Maps embed helpers — single source of truth shared by every map
 * preview (pod location + venue). With a Maps key (from the Tech portal via the
 * server) it uses the official Embed API; without one it falls back to the
 * keyless `output=embed` map so the preview always renders. Same contract as the
 * mobile app's `locationMapEmbedUrl`.
 */
export function mapEmbedUrl(query: string): string {
  if (!query) return '';
  const apiKey = getGoogleMapsApiKey();
  const q = encodeURIComponent(query);
  return apiKey
    ? `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(apiKey)}&q=${q}&zoom=14`
    : `https://maps.google.com/maps?q=${q}&z=14&output=embed`;
}

/** Deep link to open the query in the full Google Maps app/site. */
export function mapSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
