/**
 * Google Maps embed helpers — single source of truth shared by every map
 * preview (pod location + venue). Uses the keyless `output=embed` map: the
 * Embed API needs per-key enablement (the prod key lacks it, surfacing
 * "Google Maps Embed API must be used in the iframe"), while the keyless embed
 * always renders. Same contract as the mobile app's `locationMapEmbedUrl`.
 */
export function mapEmbedUrl(query: string): string {
  if (!query) return '';
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=14&output=embed`;
}

/** Deep link to open the query in the full Google Maps app/site. */
export function mapSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
