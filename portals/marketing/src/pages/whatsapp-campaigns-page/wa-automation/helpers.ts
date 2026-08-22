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
 * of preference: the admin's override beats the campaign's, and only a
 * media-header template with neither is a problem.
 */
export type MediaState = 'CUSTOM' | 'CAMPAIGN' | 'MISSING' | 'NOT_NEEDED';

export const mediaStateFor = (row: WaScenario): MediaState => {
  if (row.override_media_url) return 'CUSTOM';
  if (row.media_url) return 'CAMPAIGN';
  return row.needs_media ? 'MISSING' : 'NOT_NEEDED';
};

/** MISSING is the only failing state — it is the `Media URL Missing` send. */
export const MEDIA_STATE_COLORS: StatusColorMap = {
  CUSTOM: 'info',
  CAMPAIGN: 'success',
  MISSING: 'error',
};

/** AiSensy is not consistent about casing; the colour maps are. */
export const statusKey = (status: string) => status.toUpperCase();

/** What the scenario tab's one search box matches a row against. */
export const scenarioSearchText = (row: WaScenario) =>
  `${row.event_key} ${row.campaign} ${row.template_name} ${row.audience} ${row.category} ${row.blocker}`;

/** True only when every registered scenario could send right now. */
export const boardIsHealthy = (rows: readonly WaScenario[]) =>
  rows.length > 0 && rows.every((row) => !row.blocker);
