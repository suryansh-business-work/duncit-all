/**
 * Which platform default a template's header may fall back to, and what
 * WhatsApp calls the file when it arrives.
 *
 * It is its own file because three callers need the SAME answer and none of
 * them owns it: the send path picks the asset, the admin board decides whether
 * a row is blocked, and the recovery on a `Media URL Missing` rejection picks
 * what to retry with. A second copy of this mapping drifts on exactly the part
 * that matters — which headers a single uploaded image may stand in for.
 */

/** A header image or document, or nothing — the shape AiSensy's `media` takes. */
export type SendMedia = { url: string; filename: string } | null;

/**
 * The platform defaults, one per header kind an operator can set.
 *
 * There is deliberately no VIDEO: no template in this project carries a video
 * header, and a still picture is not an answer for one. A VIDEO header that
 * ever appears needs an asset on its own scenario, and the board says so.
 */
export interface WaDefaults {
  IMAGE: SendMedia;
  DOCUMENT: SendMedia;
}

export type WaDefaultKind = keyof WaDefaults;

/**
 * Header kind -> the default that covers it. AiSensy says FILE where Meta says
 * DOCUMENT and both mean the same header, so both map to the same asset.
 *
 * A kind that is absent here has no platform default by design, not by
 * omission — see {@link WaDefaults}.
 */
const KIND_BY_HEADER: Readonly<Record<string, WaDefaultKind>> = {
  IMAGE: 'IMAGE',
  FILE: 'DOCUMENT',
  DOCUMENT: 'DOCUMENT',
};

/** The default kind this header may use, or undefined when none covers it. */
export const defaultKindFor = (headerFormat: string): WaDefaultKind | undefined =>
  KIND_BY_HEADER[headerFormat.trim().toUpperCase()];

/** The platform default asset this header may fall back to, or null. */
export function defaultFor(headerFormat: string, defaults: WaDefaults): SendMedia {
  const kind = defaultKindFor(headerFormat);
  return kind ? defaults[kind] : null;
}

/**
 * What WhatsApp shows on a document header.
 *
 * The recipient reads this name and its extension is what tells WhatsApp the
 * file type, so a hardcoded `attachment` labels every invoice wrongly. The URL
 * already carries the real name; the literal is only for a link whose path ends
 * in nothing — and it is never blank, because AiSensy's own example always
 * carries a filename.
 */
export function mediaFilename(url: string, given?: string | null): string {
  const own = (given ?? '').trim();
  if (own) return own;
  const path = url.split('?')[0].split('#')[0];
  return path.slice(path.lastIndexOf('/') + 1).trim() || 'attachment';
}

/** A url/filename pair, or null when there is no url — the shape every rung of
 * the media ladder hands back. */
export const mediaPair = (url: string, filename?: string | null): SendMedia =>
  url ? { url, filename: mediaFilename(url, filename) } : null;
