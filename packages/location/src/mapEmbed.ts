/**
 * Google Maps embed helpers — single source of truth for every map preview
 * card (admin, partners-app, mWeb, pod-form).
 *
 * Two embed strategies exist in the codebase:
 * - Keyed:   `https://www.google.com/maps/embed/v1/place?key=…&q=…&zoom=…`
 *            (Embed API — needs per-key enablement).
 * - Keyless: `https://maps.google.com/maps?q=…&z=…&output=embed`
 *            (always renders; same contract as the mobile app's
 *            `locationMapEmbedUrl`). Used by mWeb.
 */

const DEFAULT_KEYED_ZOOM = 15;
const DEFAULT_KEYLESS_ZOOM = 14;

export type MapQueryPart = string | null | undefined;

/**
 * Builds the map query string: `lat,lng` when both coordinates are present,
 * otherwise the trimmed non-empty address parts joined with ", ".
 * Returns '' when nothing usable is provided.
 */
export function buildMapQuery(
  parts: readonly MapQueryPart[] = [],
  lat?: number | null,
  lng?: number | null,
): string {
  if (lat != null && lng != null) return `${lat},${lng}`;
  return parts
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(', ');
}

/**
 * Embed iframe URL for a query. With an `apiKey` it uses the keyed Embed API;
 * without one it falls back to the keyless `output=embed` map. Returns ''
 * for an empty query.
 */
export function mapEmbedUrl(
  query: string,
  options: Readonly<{ apiKey?: string | null; zoom?: number }> = {},
): string {
  if (!query) return '';
  const encoded = encodeURIComponent(query);
  if (options.apiKey) {
    const zoom = options.zoom ?? DEFAULT_KEYED_ZOOM;
    return `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(options.apiKey)}&q=${encoded}&zoom=${zoom}`;
  }
  const z = options.zoom ?? DEFAULT_KEYLESS_ZOOM;
  return `https://maps.google.com/maps?q=${encoded}&z=${z}&output=embed`;
}

/** Deep link that opens the query in the full Google Maps app/site. */
export function mapSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
