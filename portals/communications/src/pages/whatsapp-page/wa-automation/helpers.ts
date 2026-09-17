import type { StatusColorMap } from '@duncit/ui';
import type { WaScenario } from './queries';

/** The key the server reads as "the kill switch" rather than a scenario. */
export const GLOBAL_EVENT_KEY = '__global__';

/** A send only leaves on a Live campaign; every other state is a reason it would not. */
export const CAMPAIGN_STATUS_COLORS: StatusColorMap = { LIVE: 'success' };

/** WhatsApp's own template vocabulary, coloured the same way Marketing colours it. */
export const TEMPLATE_STATUS_COLORS: StatusColorMap = {
  APPROVED: 'success',
  PENDING: 'warning',
  REJECTED: 'error',
};

/** A blocker sentence is always a problem — the chip only ever has one colour. */
export const BLOCKER_COLORS: StatusColorMap = { BLOCKED: 'error' };

/**
 * Which header asset a send would actually carry, in the send path's own order
 * of preference: the admin's override beats the campaign's, the campaign's
 * beats the platform default, and only a media-header template with none of
 * the three is a problem.
 */
export type MediaState = 'CUSTOM' | 'CAMPAIGN' | 'DEFAULT' | 'MISSING' | 'NOT_NEEDED';

/** The platform defaults, one per header kind an operator can set. */
export interface WaDefaultUrls {
  image: string;
  document: string;
}

/**
 * Header kind -> which platform default covers it. AiSensy says FILE where Meta
 * says DOCUMENT and both mean the same header; VIDEO is absent because the
 * platform holds no default video, so one would need an asset of its own.
 *
 * Mirrors `server/src/modules/platform/whatsapp/whatsapp.media.ts`, which the send
 * path reads — the board and the send must agree on what is covered.
 */
const DEFAULT_BY_HEADER: Readonly<Record<string, keyof WaDefaultUrls>> = {
  IMAGE: 'image',
  FILE: 'document',
  DOCUMENT: 'document',
};

/** The platform default this header may fall back to, or '' when none covers it. */
export const defaultUrlFor = (headerFormat: string, defaults: WaDefaultUrls): string => {
  const kind = DEFAULT_BY_HEADER[headerFormat.trim().toUpperCase()];
  return kind ? defaults[kind] : '';
};

export const mediaStateFor = (row: WaScenario, defaults: WaDefaultUrls): MediaState => {
  if (row.override_media_url) return 'CUSTOM';
  if (row.media_url) return 'CAMPAIGN';
  if (!row.needs_media) return 'NOT_NEEDED';
  return defaultUrlFor(row.template_header_format, defaults) ? 'DEFAULT' : 'MISSING';
};

/** The URL a send on this row would actually carry, readable without opening
 * the dialog. */
export const effectiveMediaUrl = (row: WaScenario, defaults: WaDefaultUrls): string => {
  const own = row.override_media_url || row.media_url;
  if (own) return own;
  return defaultUrlFor(row.template_header_format, defaults);
};

/** MISSING is the only failing state — it is the `Media URL Missing` send. */
export const MEDIA_STATE_COLORS: StatusColorMap = {
  CUSTOM: 'info',
  CAMPAIGN: 'success',
  DEFAULT: 'success',
  MISSING: 'error',
};

/** Whether the board has media-header rows that would fall through to a
 * default nobody has set — the one warning worth a banner, because it is 52
 * rows failing the same way for the same reason. */
export const needsDefaultMedia = (rows: readonly WaScenario[], defaults: WaDefaultUrls) =>
  rows.some((row) => mediaStateFor(row, defaults) === 'MISSING');

/** AiSensy is not consistent about casing; the colour maps are. */
export const statusKey = (status: string) => status.toUpperCase();

/** What the scenario tab's one search box matches a row against. */
export const scenarioSearchText = (row: WaScenario) =>
  `${row.event_key} ${row.campaign} ${row.template_name} ${row.audience} ${row.category} ${row.blocker}`;

/**
 * True only when every registered scenario could send right now.
 *
 * A board whose catalogue could not be read is never healthy: the server
 * computes no blocker at all without AiSensy, so every row comes back clean and
 * the green banner would sit directly above 52 scenarios failing with
 * `Media URL Missing`.
 */
export const boardIsHealthy = (rows: readonly WaScenario[], catalogueOk: boolean) =>
  catalogueOk && rows.length > 0 && rows.every((row) => !row.blocker);
