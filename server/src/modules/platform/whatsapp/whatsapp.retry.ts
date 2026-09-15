import { logs } from '@observability/log';
import { sendCampaign } from '@modules/platform/aisensy/aisensy.gateway';
import { UNREACHABLE_PREFIX } from '@modules/platform/aisensy/aisensy.transport';
import { communicationsMuted } from '@modules/platform/e2eRun/e2eRun.mute';
import { isDuplicateKeyError } from '@utils/mongo-error';
import { NEVER_DELIVERED_CODES } from '@utils/outboundFetch';
import { WA_EVENT_BY_KEY } from './whatsapp.events';
import { waPreferenceAllows } from './whatsapp.service';
import { WaEventSettingModel } from './waEventSetting.model';
import { WaMessageLogModel, type IWaMessageLog } from './waMessageLog.model';

/**
 * Automatic messages whose connection to AiSensy never opened, sent again on
 * the next sweep.
 *
 * The transport already retries a dropped connection three times inside ~30s,
 * and the Logs still showed booking confirmations lost to `UND_ERR_CONNECT_TIMEOUT`
 * that outlasted it — the server's outbound network drops handshakes to more
 * hosts than AiSensy (see `outboundFetch`). A connection that never opened
 * provably delivered nothing, so sending that message again cannot double it.
 *
 * Only that failure: anything AiSensy answered is its verdict and repeats
 * identically. And only for an hour — two sweeps — because the values were
 * frozen when the message was written, and a reminder that says "starts in 3
 * hours" is wrong once it arrives much later than that.
 */
const RETRY_WINDOW_MS = 60 * 60_000;

const NEVER_DELIVERED_REASON = new RegExp(
  `^${UNREACHABLE_PREFIX}.*(${NEVER_DELIVERED_CODES.join('|')})`
);

type UnreachedRow = Pick<
  IWaMessageLog,
  | '_id'
  | 'event_key'
  | 'campaign'
  | 'category'
  | 'destination'
  | 'user_name'
  | 'params'
  | 'media_url'
  | 'media_filename'
>;

/**
 * Take the one-message slot back before sending, exactly as a first send claims
 * it — so two sweeps, or a re-trigger racing this one, cannot both send.
 */
async function reclaim(row: UnreachedRow): Promise<boolean> {
  try {
    const claimed = await WaMessageLogModel.updateOne(
      { _id: row._id, status: 'FAILED' },
      { $set: { status: 'SENDING', holds_slot: true } }
    );
    return claimed.modifiedCount === 1;
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
    // A later trigger of the same event already got this message through.
    await WaMessageLogModel.updateOne(
      { _id: row._id },
      { $set: { status: 'SKIPPED', reason: 'Already sent' } }
    );
    return false;
  }
}

/** Send one row again. True when the connection is still down, so the sweep
 * stops rather than spending ~30s per row finding that out again. */
async function resend(row: UnreachedRow): Promise<boolean> {
  if (!(await reclaim(row))) return false;
  const startedAt = Date.now();
  try {
    const submitted_message_id = await sendCampaign({
      campaign_name: row.campaign,
      destination: row.destination,
      // Rows written before `user_name` existed carry none; this is the name
      // the first attempt sent when it had none either.
      user_name: row.user_name || 'there',
      template_params: row.params,
      media: row.media_url ? { url: row.media_url, filename: row.media_filename } : undefined,
    });
    await WaMessageLogModel.updateOne(
      { _id: row._id },
      { $set: { status: 'SENT', reason: '', submitted_message_id, duration_ms: Date.now() - startedAt } }
    );
    return false;
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'AiSensy rejected the message';
    await WaMessageLogModel.updateOne(
      { _id: row._id },
      { $set: { status: 'FAILED', reason, holds_slot: false, duration_ms: Date.now() - startedAt } }
    );
    logs.server.warn('whatsapp', 'retry', { error, event: row.event_key });
    return NEVER_DELIVERED_REASON.test(reason);
  }
}

/** Re-send what the last hour failed to deliver for want of a connection. */
export async function retryUnreachedMessages(): Promise<void> {
  if (await communicationsMuted()) return;
  const [rows, disabled] = await Promise.all([
    WaMessageLogModel.find({
      status: 'FAILED',
      created_at: { $gte: new Date(Date.now() - RETRY_WINDOW_MS) },
      reason: NEVER_DELIVERED_REASON,
    })
      .select('event_key campaign category destination user_name params media_url media_filename')
      .sort({ created_at: 1 })
      .lean<UnreachedRow[]>(),
    WaEventSettingModel.distinct('event_key', { enabled: false }),
  ]);
  const switchedOff = new Set(disabled.map(String));
  for (const row of rows) {
    // Registry scenarios only: a one-time code is never recorded with its code,
    // and a by-hand test is the sender's to repeat.
    if (!WA_EVENT_BY_KEY.has(row.event_key) || switchedOff.has(row.event_key)) continue;
    // eslint-disable-next-line no-await-in-loop
    if (!(await waPreferenceAllows(row.destination, row.category))) continue;
    // eslint-disable-next-line no-await-in-loop
    if (await resend(row)) break;
  }
}
