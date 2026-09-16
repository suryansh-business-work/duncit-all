import { GraphQLError } from 'graphql';
import type { Types } from 'mongoose';
import { getUrlConfigs } from '@config/url-configs';
import { logs } from '@observability/log';
import { whatsappService, type WaSendOutcome } from '@modules/platform/whatsapp/whatsapp.service';
import { LocationSubscriptionModel } from './locationSubscription.model';
import { SENDABLE_STATUSES, cityOf, findCity } from './locationSubscription.service';

/**
 * How many messages go out between two writes of their outcomes. AiSensy is
 * posted one message at a time, so a city's whole waitlist is minutes of work;
 * writing as it goes means a restart halfway loses one batch of statuses, not
 * all of them — and the WhatsApp log's unique slot still stops a re-send.
 */
const BATCH_SIZE = 25;

/** A template renders a blank name as a blank; nobody's profile is guaranteed one. */
const FALLBACK_NAME = 'there';

interface LaunchRow {
  _id: Types.ObjectId;
  name: string;
  whatsapp: string;
}

interface LaunchContext {
  locationId: string;
  city: string;
  link: string;
}

const firstName = (name: string) => name.trim().split(/\s+/)[0] || FALLBACK_NAME;

/** WhatsApp's own skip when this number already holds this city's launch slot. */
const ALREADY_SENT_REASON = 'Already sent';

/** The row status an outcome records. The send never reports anything but these
 * three once it returns; anything else is treated as a failure to retry. An
 * "Already sent" skip means the message went out on an earlier Send whose row
 * write was lost (a restart mid-batch), so it records SENT rather than leaving
 * the row pending forever. */
function statusOf(outcome: WaSendOutcome): 'SENT' | 'SKIPPED' | 'FAILED' {
  if (outcome.status === 'SKIPPED' && outcome.reason === ALREADY_SENT_REASON) return 'SENT';
  if (outcome.status === 'SENT' || outcome.status === 'SKIPPED') return outcome.status;
  return 'FAILED';
}

/** The row update one outcome calls for. A row that is already SENT is never
 * touched: two Sends racing each other would otherwise let the second one's
 * "already sent" skip overwrite the first one's success. */
function outcomeUpdate(row: LaunchRow, outcome: WaSendOutcome, now: Date) {
  const status = statusOf(outcome);
  const $set =
    status === 'SENT' ? { status, reason: '', notified_at: now } : { status, reason: outcome.reason };
  return { updateOne: { filter: { _id: row._id, status: { $ne: 'SENT' } }, update: { $set } } };
}

async function sendBatch(rows: readonly LaunchRow[], context: LaunchContext) {
  const outcomes = await whatsappService.sendEach(
    rows.map((row) => ({
      // Written out rather than a constant so `check:whatsapp` can hold this
      // site's params to the scenario's arity.
      event: 'USER_CITY_LAUNCHED',
      // One launch message per number per city: the log's unique slot is keyed
      // on this, so a second Send skips a number instead of billing it again.
      entityId: context.locationId,
      destination: row.whatsapp,
      name: row.name || FALLBACK_NAME,
      params: [firstName(row.name), context.city, context.link],
    }))
  );
  const now = new Date();
  await LocationSubscriptionModel.bulkWrite(
    rows.map((row, index) => outcomeUpdate(row, outcomes[index], now)),
    { ordered: false }
  );
  return outcomes;
}

/** Works through the rows in the background, logging what came of them. */
async function run(rows: readonly LaunchRow[], context: LaunchContext) {
  const tally = { SENT: 0, SKIPPED: 0, FAILED: 0 };
  for (let start = 0; start < rows.length; start += BATCH_SIZE) {
    // eslint-disable-next-line no-await-in-loop
    const outcomes = await sendBatch(rows.slice(start, start + BATCH_SIZE), context);
    for (const outcome of outcomes) tally[statusOf(outcome)] += 1;
  }
  logs.server.info('locationSubscription', 'sendLaunchMessage', {
    location_id: context.locationId,
    city: context.city,
    requested: rows.length,
    ...tally,
  });
}

/**
 * Message every subscriber of a launched city who has not been sent it yet.
 *
 * Answers as soon as the rows are chosen: one message at a time, a waitlist of
 * two thousand is far longer than a request should be held open. Each row's
 * status is written from its own outcome, so the admin table shows progress.
 */
export async function sendLaunchMessage(locationDocId: string): Promise<{ queued: number }> {
  const { id, location } = await findCity({ location_doc_id: locationDocId });
  const city = cityOf(location);
  if (!(location.is_launched ?? true)) {
    throw new GraphQLError(`Switch Launched on for ${city} before sending the launch message.`, {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  const rows: LaunchRow[] = await LocationSubscriptionModel.find({
    location_id: id,
    status: { $in: [...SENDABLE_STATUSES] },
  })
    .select('name whatsapp')
    .sort({ created_at: 1 })
    .lean();
  if (rows.length === 0) return { queued: 0 };

  const urls = await getUrlConfigs();
  // `\/$` rather than `\/+$`: one anchored optional character cannot backtrack.
  const context = { locationId: id.toHexString(), city, link: urls.mwebUrl.replace(/\/$/, '') };
  run(rows, context).catch((error) =>
    logs.server.error('locationSubscription', 'sendLaunchMessage', {
      error,
      location_id: context.locationId,
    })
  );
  return { queued: rows.length };
}
