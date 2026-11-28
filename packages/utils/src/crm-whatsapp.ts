import type { CrmTone } from './crm-quality-labels';

/**
 * CRM › Tools › WhatsApp Lead Generator: the link step's timing rules, the
 * connection's and the extraction's status words and tones, and the progress
 * figure. Shared by the CRM portal and the Duncit CRM app, so both link,
 * resume and report an extraction the same way.
 */

/** How often the live status + QR are re-read while a scan is pending. */
export const WA_POLL_MS = 3000;
/**
 * A session with no QR after this long is treated as stuck and restarted once. It outlasts the
 * gateway's own start deadline (a 2-minute WhatsApp Web boot window plus 30 s), so a slow but
 * healthy boot is never cut short.
 */
export const WA_STUCK_RESTART_MS = 180_000;
/** Automatic restarts per visit for a start that failed (e.g. `auth timeout`) before it is left to the user. */
export const WA_MAX_ERROR_RESTARTS = 2;
/** How often a running extraction's progress is re-read. */
export const WA_EXTRACTION_POLL_MS = 2000;

export interface WaStatusView {
  labelKey: string;
  tone: CrmTone;
}

const CONNECTION_VIEW: Readonly<Record<string, WaStatusView>> = {
  CONNECTED: { labelKey: 'crm.tools.statusConnected', tone: 'success' },
  CONNECTING: { labelKey: 'crm.tools.statusConnecting', tone: 'warning' },
  ERROR: { labelKey: 'crm.tools.statusError', tone: 'error' },
};
const DISCONNECTED_VIEW: WaStatusView = { labelKey: 'crm.tools.statusDisconnected', tone: 'default' };

/** The gateway session's status chip; anything unknown reads as Disconnected. */
export const waConnectionStatusView = (status: string): WaStatusView => CONNECTION_VIEW[status] ?? DISCONNECTED_VIEW;

const EXTRACTION_VIEW: Readonly<Record<string, WaStatusView>> = {
  RUNNING: { labelKey: 'crm.tools.extractionRunning', tone: 'warning' },
  DONE: { labelKey: 'crm.tools.extractionDone', tone: 'success' },
  FAILED: { labelKey: 'crm.tools.extractionFailed', tone: 'error' },
};
const CANCELLED_VIEW: WaStatusView = { labelKey: 'crm.tools.extractionCancelled', tone: 'default' };

/** An extraction job's title and tone; anything unknown reads as Cancelled (stopped, not failed). */
export const waExtractionView = (status: string): WaStatusView => EXTRACTION_VIEW[status] ?? CANCELLED_VIEW;

/** Contacts processed as a whole percentage of the total (0 until the total is known). */
export const waExtractionPercent = (job: { total: number; processed: number }): number =>
  job.total > 0 ? Math.round((job.processed / job.total) * 100) : 0;

/**
 * Which step the connect stepper opens on: a session already booting, one that failed, or one
 * linked before goes straight to Link WhatsApp; a first connect starts at the gateway URL and API
 * key. A failed session opens on Link because ERROR only comes from a saved gateway, and Link is
 * where its reason and Restart connection are.
 */
export const waInitialConnectStep = (connection: {
  status: string;
  connected_at?: string | null;
}): 'gateway' | 'link' =>
  connection.status === 'CONNECTING' || connection.status === 'ERROR' || connection.connected_at ? 'link' : 'gateway';

export type WaFirstStatusAction = 'arm' | 'resume' | 'restart' | 'none';

/**
 * What to do with the first live status read on a visit. A session already booting is
 * "armed" (its failed starts may be retried). A session linked before that dropped on its own
 * is resumed (DISCONNECTED) or restarted (ERROR), so leaving the page never costs the link.
 * Nothing starts by itself on a first connect.
 */
export function waFirstStatusAction(status: string, linkedBefore: boolean): WaFirstStatusAction {
  if (status === 'CONNECTING') return 'arm';
  if (!linkedBefore) return 'none';
  if (status === 'DISCONNECTED') return 'resume';
  return status === 'ERROR' ? 'restart' : 'none';
}

/** A start that failed is retried only for a session somebody started, and only a few times. */
export const waShouldRetryError = (status: string, armed: boolean, restarts: number): boolean =>
  status === 'ERROR' && armed && restarts < WA_MAX_ERROR_RESTARTS;
