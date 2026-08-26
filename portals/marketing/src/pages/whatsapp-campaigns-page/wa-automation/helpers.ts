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

/** The one header kind the platform default fits — it is a single image, so a
 * VIDEO or FILE header still needs its own asset. Mirrors the send path. */
const DEFAULTABLE_HEADER = 'IMAGE';

export const mediaStateFor = (row: WaScenario, defaultUrl: string): MediaState => {
  if (row.override_media_url) return 'CUSTOM';
  if (row.media_url) return 'CAMPAIGN';
  if (!row.needs_media) return 'NOT_NEEDED';
  const covered = row.template_header_format === DEFAULTABLE_HEADER && !!defaultUrl;
  return covered ? 'DEFAULT' : 'MISSING';
};

/** The URL a send on this row would actually carry, readable without opening
 * the dialog. */
export const effectiveMediaUrl = (row: WaScenario, defaultUrl: string): string => {
  const own = row.override_media_url || row.media_url;
  if (own) return own;
  return mediaStateFor(row, defaultUrl) === 'DEFAULT' ? defaultUrl : '';
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
export const needsDefaultMedia = (rows: readonly WaScenario[], defaultUrl: string) =>
  !defaultUrl && rows.some((row) => mediaStateFor(row, defaultUrl) === 'MISSING');

/** AiSensy is not consistent about casing; the colour maps are. */
export const statusKey = (status: string) => status.toUpperCase();

/** What the scenario tab's one search box matches a row against. */
export const scenarioSearchText = (row: WaScenario) =>
  `${row.event_key} ${row.campaign} ${row.template_name} ${row.audience} ${row.category} ${row.blocker}`;

/** True only when every registered scenario could send right now. */
export const boardIsHealthy = (rows: readonly WaScenario[]) =>
  rows.length > 0 && rows.every((row) => !row.blocker);
