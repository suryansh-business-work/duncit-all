import type { Types } from 'mongoose';
import { getUrlConfigs } from '@config/url-configs';
import { UserModel } from '@modules/access/user/user.model';
import { shortLinkService } from '@modules/crm/marketing/shortLink.service';
import { VENUE_IMAGE_FIELDS, venueImageAssets } from '@modules/platform/whatsapp/whatsapp.assets';
import type { SendAssets } from '@modules/platform/whatsapp/whatsapp.media';
import { whatsappService } from '@modules/platform/whatsapp/whatsapp.service';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { logs } from '@observability/log';
import type { IVenueFoodOrder } from './venueFoodOrder.model';
import { foodGuestNumber } from './venueFoodOrder.whatsapp';
import { VenueSubscriberModel } from './venueSubscriber.model';

/**
 * "Tell me about events here" — the checkbox at a venue's food checkout.
 *
 * The subscription is written only once the order is PAID: a payment is what
 * stops someone typing a stranger's number into the box. From then on every
 * pod that goes live at the venue is announced to its subscribers on WhatsApp
 * (and in the app, for the ones with an account).
 */

const LOG = 'venue-subscriber';
/** Messages posted between two writes of their outcome — see locationSubscription.send. */
const BATCH_SIZE = 25;
const DUPLICATE_KEY = 11000;
const FALLBACK_NAME = 'there';

const firstName = (name: string) => name.trim().split(/\s+/)[0] || FALLBACK_NAME;
const trimBase = (url: string) => url.replace(/\/$/, '');

const venueLink = async (venueId: Types.ObjectId) => {
  const { mwebUrl } = await getUrlConfigs();
  const plain = `${trimBase(mwebUrl)}/venue/${venueId.toHexString()}`;
  try {
    // The venue's own tracked link when it has published one — its clicks are then counted.
    return (await shortLinkService.existingShare('VENUE_PAGE', venueId.toHexString()))?.url ?? plain;
  } catch (error) {
    logs.server.warn(LOG, 'venueLink', { error, venueId: venueId.toHexString() });
    return plain;
  }
};

/**
 * The header photo for a message about this venue — `preferred` first (the
 * pod's own picture), else the venue's cover or gallery. A failed read costs
 * the photo, never the message: the platform default stands in.
 */
async function venuePhoto(venueId: Types.ObjectId, preferred?: string | null): Promise<SendAssets> {
  try {
    const venue = await VenueModel.findById(venueId).select(VENUE_IMAGE_FIELDS).lean();
    return venueImageAssets(venue, preferred);
  } catch (error) {
    logs.server.warn(LOG, 'venuePhoto', { error, venueId: venueId.toHexString() });
    return venueImageAssets(null, preferred);
  }
}

/**
 * Record the subscription a paid order asked for. Safe to repeat: the unique
 * (venue, number) index keeps one row, and only the write that created it sends
 * the confirmation.
 */
export async function subscribeFromFoodOrder(order: IVenueFoodOrder): Promise<void> {
  if (!order.subscribe_events) return;
  try {
    const existing = await VenueSubscriberModel.findOne({ venue_id: order.venue_id, phone: order.customer_phone });
    if (existing) {
      // Asking again switches a lapsed subscription back on, and adopts the account if there is one now.
      if (!existing.is_active || (!existing.user_id && order.user_id)) {
        existing.is_active = true;
        existing.user_id = existing.user_id ?? order.user_id;
        await existing.save();
      }
      return;
    }
    await VenueSubscriberModel.create({
      venue_id: order.venue_id,
      phone: order.customer_phone,
      name: order.customer_name,
      user_id: order.user_id,
      source: 'FOOD_ORDER',
      order_id: order._id,
    });
  } catch (error) {
    // Two paid orders from one number raced: the index kept one row, which is all that was wanted.
    if ((error as { code?: number } | null)?.code === DUPLICATE_KEY) return;
    logs.server.warn(LOG, 'subscribe', { error, orderNo: order.order_no });
    return;
  }
  logs.server.info(LOG, 'subscribed', { venueId: order.venue_id.toHexString(), orderNo: order.order_no });
  const [link, assets] = await Promise.all([venueLink(order.venue_id), venuePhoto(order.venue_id)]);
  const outcome = await whatsappService.send({
    event: 'VENUE_EVENTS_SUBSCRIBED',
    entityId: order.venue_id.toHexString(),
    destination: foodGuestNumber(order.customer_phone),
    name: order.customer_name,
    params: [firstName(order.customer_name), order.venue_name, link],
    buttonUrl: link,
    assets,
  });
  if (outcome.status === 'FAILED') logs.server.warn(LOG, 'confirm', { orderNo: order.order_no, reason: outcome.reason });
}

export interface VenueEventFacts {
  venueId: Types.ObjectId;
  venueName: string;
  podId: string;
  podTitle: string;
  date: string;
  time: string;
  /** The pod's own picture — the announcement's header photo when it has one. */
  podImageUrl?: string | null;
}

interface SubscriberRow {
  _id: Types.ObjectId;
  phone: string;
  name: string;
  user_id: Types.ObjectId | null;
}

/** The pod's tracked share link — the same one a member's "Share" mints — or its plain page. */
async function podLink(podId: string): Promise<string> {
  try {
    return (await shortLinkService.share('POD', podId)).url;
  } catch (error) {
    logs.server.warn(LOG, 'podLink', { error, podId });
    return trimBase((await getUrlConfigs()).mwebUrl);
  }
}

async function tellInApp(rows: readonly SubscriberRow[], facts: VenueEventFacts, link: string) {
  const accountIds = rows.flatMap((row) => (row.user_id ? [row.user_id.toHexString()] : []));
  if (accountIds.length === 0) return;
  // Only accounts that still exist: a deleted one must not be addressed.
  const live = await UserModel.find({ _id: { $in: accountIds } }).select('_id').lean();
  if (live.length === 0) return;
  const { notificationService } = await import('@modules/engagement/notification/notification.service');
  await notificationService.create({
    title: `New at ${facts.venueName}`,
    body: `${facts.podTitle} · ${facts.date}, ${facts.time}`,
    image_url: null,
    link_url: link,
    scope: 'USER',
    target_user_ids: live.map((user) => String(user._id)),
  });
}

async function run(rows: readonly SubscriberRow[], facts: VenueEventFacts) {
  const [link, assets] = await Promise.all([podLink(facts.podId), venuePhoto(facts.venueId, facts.podImageUrl)]);
  const tally = { SENT: 0, SKIPPED: 0, FAILED: 0, SENDING: 0 };
  for (let start = 0; start < rows.length; start += BATCH_SIZE) {
    const batch = rows.slice(start, start + BATCH_SIZE);
    // eslint-disable-next-line no-await-in-loop
    const outcomes = await whatsappService.sendEach(
      batch.map((row) => ({
        event: 'VENUE_NEW_EVENT',
        // One announcement per number per pod: a pod approved twice does not message twice.
        entityId: facts.podId,
        destination: foodGuestNumber(row.phone),
        name: row.name || FALLBACK_NAME,
        params: [firstName(row.name), facts.venueName, facts.podTitle, facts.date, facts.time, link],
        buttonUrl: link,
        assets,
      }))
    );
    const sent = batch.filter((_row, index) => outcomes[index]?.status === 'SENT').map((row) => row._id);
    for (const outcome of outcomes) tally[outcome.status] += 1;
    if (sent.length > 0) {
      // eslint-disable-next-line no-await-in-loop
      await VenueSubscriberModel.updateMany(
        { _id: { $in: sent } },
        { $inc: { notified_count: 1 }, $set: { last_notified_at: new Date() } }
      );
    }
  }
  await tellInApp(rows, facts, link);
  logs.server.info(LOG, 'notifyNewEvent', {
    venueId: facts.venueId.toHexString(),
    podId: facts.podId,
    requested: rows.length,
    ...tally,
  });
}

/**
 * Announce a pod that just went live to everyone subscribed to its venue.
 * Answers as soon as the rows are chosen; the sends run in the background, one
 * message at a time, so the approval that triggered them is never held open.
 */
export async function notifyVenueSubscribers(facts: VenueEventFacts): Promise<{ queued: number }> {
  const rows: SubscriberRow[] = await VenueSubscriberModel.find({ venue_id: facts.venueId, is_active: true })
    .select('phone name user_id')
    .sort({ created_at: 1 })
    .lean();
  if (rows.length === 0) return { queued: 0 };
  run(rows, facts).catch((error: unknown) =>
    logs.server.error(LOG, 'notifyNewEvent', { error, venueId: facts.venueId.toHexString(), podId: facts.podId })
  );
  return { queued: rows.length };
}
