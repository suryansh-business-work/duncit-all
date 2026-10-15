/**
 * "Tell me about events here", against the in-memory database: a paid order's
 * subscription is written once per number per venue, confirmed on WhatsApp only
 * by the write that created it, and every new pod at the venue is announced to
 * its active subscribers. WhatsApp, the short-link store, the URL settings and
 * the in-app notification are the only seams replaced.
 */
jest.mock('@modules/platform/whatsapp/whatsapp.service', () => ({
  whatsappService: { send: jest.fn(), sendEach: jest.fn() },
}));
jest.mock('@modules/crm/marketing/shortLink.service', () => ({
  shortLinkService: { existingShare: jest.fn(), share: jest.fn() },
}));
jest.mock('@config/url-configs', () => ({ getUrlConfigs: jest.fn() }));
jest.mock('@modules/engagement/notification/notification.service', () => ({
  notificationService: { create: jest.fn() },
}));

import { Types } from 'mongoose';
import { getUrlConfigs } from '@config/url-configs';
import { UserModel } from '@modules/access/user/user.model';
import { shortLinkService } from '@modules/crm/marketing/shortLink.service';
import { notificationService } from '@modules/engagement/notification/notification.service';
import { whatsappService, type WaSendOutcome } from '@modules/platform/whatsapp/whatsapp.service';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { logs } from '@observability/log';
import { VenueFoodOrderModel } from '../../venueFoodOrder.model';
import { VenueSubscriberModel } from '../../venueSubscriber.model';
import { notifyVenueSubscribers, subscribeFromFoodOrder, type VenueEventFacts } from '../../venueSubscriber.service';

const send = jest.mocked(whatsappService.send);
const sendEach = jest.mocked(whatsappService.sendEach);
const existingShare = jest.mocked(shortLinkService.existingShare);
const share = jest.mocked(shortLinkService.share);
const urls = jest.mocked(getUrlConfigs);
const notify = jest.mocked(notificationService.create);

const COVER = 'https://ik.imagekit.io/duncit/prod/venues/cover.jpg';
const POD_PHOTO = 'https://ik.imagekit.io/duncit/prod/pods/pod.jpg';
const PHONE = '9876543210';
const outcome = (status: WaSendOutcome['status'], reason = ''): WaSendOutcome => ({ status, reason, message_id: '' });

let seq = 0;

async function makeVenue() {
  const venue = await VenueModel.create({
    owner_user_id: new Types.ObjectId(),
    venue_name: 'Cafe Uno',
    status: 'APPROVED',
    cover_image_url: COVER,
  });
  return venue._id;
}

async function makeUser() {
  seq += 1;
  const user = await UserModel.create({ auth: { email: `guest${seq}@duncit.test` }, profile: { first_name: 'Asha' } });
  return user._id;
}

/** A paid order as `markFoodOrderPaid` hands it over — never saved, the service only reads it. */
function paidOrder(venueId: Types.ObjectId, over: Record<string, unknown> = {}) {
  seq += 1;
  return new VenueFoodOrderModel({
    order_no: `FOOD-${seq}`,
    venue_id: venueId,
    venue_name: 'Cafe Uno',
    customer_name: 'Asha Rao',
    customer_phone: PHONE,
    subtotal_paise: 24000,
    total_paise: 24000,
    payment_status: 'PAID',
    razorpay_integration_id: new Types.ObjectId(),
    client_key: `client-key-${seq}`,
    access_key: `access-key-${seq}`,
    subscribe_events: true,
    ...over,
  });
}

/** Resolve once `check` passes — the fan-out runs in the background after the call returns. */
async function eventually(check: () => boolean) {
  for (let attempt = 0; attempt < 300; attempt += 1) {
    if (check()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error('The background work never finished');
}

const loggedWith = (spy: jest.SpyInstance, operation: string) => spy.mock.calls.some((call) => call[1] === operation);

let info: jest.SpyInstance;
let warn: jest.SpyInstance;
let error: jest.SpyInstance;

beforeAll(async () => {
  await VenueSubscriberModel.init();
});

beforeEach(() => {
  urls.mockResolvedValue({ mwebUrl: 'https://app.duncit.test/' } as Awaited<ReturnType<typeof getUrlConfigs>>);
  existingShare.mockResolvedValue(null);
  share.mockResolvedValue({ url: 'https://duncit.test/s/pod' } as Awaited<ReturnType<typeof shortLinkService.share>>);
  send.mockResolvedValue(outcome('SENT'));
  notify.mockResolvedValue(undefined as never);
  info = jest.spyOn(logs.server, 'info').mockImplementation(() => undefined);
  warn = jest.spyOn(logs.server, 'warn').mockImplementation(() => undefined);
  error = jest.spyOn(logs.server, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('subscribeFromFoodOrder', () => {
  it('does nothing for an order whose guest did not tick the box', async () => {
    const venueId = await makeVenue();
    await subscribeFromFoodOrder(paidOrder(venueId, { subscribe_events: false }));
    expect(await VenueSubscriberModel.countDocuments()).toBe(0);
    expect(send).not.toHaveBeenCalled();
  });

  it("records the subscription and confirms it once on WhatsApp, with the venue's tracked link and cover", async () => {
    const venueId = await makeVenue();
    const userId = await makeUser();
    existingShare.mockResolvedValue({ id: 'link-1', url: 'https://duncit.test/s/cafe-uno' } as Awaited<
      ReturnType<typeof shortLinkService.existingShare>
    >);
    const order = paidOrder(venueId, { user_id: userId });

    await subscribeFromFoodOrder(order);

    const rows = await VenueSubscriberModel.find().lean();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ phone: PHONE, name: 'Asha Rao', source: 'FOOD_ORDER', is_active: true, notified_count: 0 });
    expect(rows[0].venue_id.toHexString()).toBe(venueId.toHexString());
    expect(rows[0].user_id?.toHexString()).toBe(userId.toHexString());
    expect(rows[0].order_id?.toHexString()).toBe(order._id.toHexString());
    expect(existingShare).toHaveBeenCalledWith('VENUE_PAGE', venueId.toHexString());
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith({
      event: 'VENUE_EVENTS_SUBSCRIBED',
      entityId: venueId.toHexString(),
      destination: `91${PHONE}`,
      name: 'Asha Rao',
      params: ['Asha', 'Cafe Uno', 'https://duncit.test/s/cafe-uno'],
      buttonUrl: 'https://duncit.test/s/cafe-uno',
      assets: { IMAGE: expect.objectContaining({ url: COVER }) },
    });
    expect(warn).not.toHaveBeenCalled();
  });

  it("links the venue's plain page when it has no tracked link, and greets a blank name as 'there'", async () => {
    const venueId = await makeVenue();
    await subscribeFromFoodOrder(paidOrder(venueId, { customer_name: '   ' }));
    const plain = `https://app.duncit.test/venue/${venueId.toHexString()}`;
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ params: ['there', 'Cafe Uno', plain], buttonUrl: plain }));
  });

  it('falls back to the plain page, and says why, when the short-link store cannot be read', async () => {
    const venueId = await makeVenue();
    existingShare.mockRejectedValue(new Error('short links down'));
    await subscribeFromFoodOrder(paidOrder(venueId));
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ buttonUrl: `https://app.duncit.test/venue/${venueId.toHexString()}` }));
    expect(warn).toHaveBeenCalledWith('venue-subscriber', 'venueLink', expect.objectContaining({ venueId: venueId.toHexString() }));
  });

  it('still confirms without a photo when the venue cannot be read', async () => {
    const venueId = await makeVenue();
    jest.spyOn(VenueModel, 'findById').mockImplementationOnce(() => {
      throw new Error('primary stepped down');
    });
    await subscribeFromFoodOrder(paidOrder(venueId));
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ assets: { IMAGE: null } }));
    expect(warn).toHaveBeenCalledWith('venue-subscriber', 'venuePhoto', expect.objectContaining({ venueId: venueId.toHexString() }));
  });

  it('keeps the subscription and logs the reason when the confirmation fails to send', async () => {
    const venueId = await makeVenue();
    send.mockResolvedValue(outcome('FAILED', 'template paused'));
    const order = paidOrder(venueId);
    await subscribeFromFoodOrder(order);
    expect(await VenueSubscriberModel.countDocuments()).toBe(1);
    expect(warn).toHaveBeenCalledWith('venue-subscriber', 'confirm', { orderNo: order.order_no, reason: 'template paused' });
  });

  it('keeps one row per number per venue and never confirms twice', async () => {
    const venueId = await makeVenue();
    await subscribeFromFoodOrder(paidOrder(venueId));
    await subscribeFromFoodOrder(paidOrder(venueId));
    expect(await VenueSubscriberModel.countDocuments()).toBe(1);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('switches a lapsed subscription back on without a second confirmation, keeping the account it had', async () => {
    const venueId = await makeVenue();
    const first = await makeUser();
    const second = await makeUser();
    await VenueSubscriberModel.create({ venue_id: venueId, phone: PHONE, name: 'Asha', user_id: first, is_active: false });

    await subscribeFromFoodOrder(paidOrder(venueId, { user_id: second }));

    const row = await VenueSubscriberModel.findOne({ venue_id: venueId }).lean();
    expect(row?.is_active).toBe(true);
    expect(row?.user_id?.toHexString()).toBe(first.toHexString());
    expect(send).not.toHaveBeenCalled();
  });

  it('adopts the account of a guest who now orders signed in', async () => {
    const venueId = await makeVenue();
    const userId = await makeUser();
    await VenueSubscriberModel.create({ venue_id: venueId, phone: PHONE, name: 'Asha' });

    await subscribeFromFoodOrder(paidOrder(venueId, { user_id: userId }));

    const row = await VenueSubscriberModel.findOne({ venue_id: venueId }).lean();
    expect(row?.user_id?.toHexString()).toBe(userId.toHexString());
    expect(row?.is_active).toBe(true);
    expect(send).not.toHaveBeenCalled();
  });

  it('leaves an active subscription alone when there is nothing to adopt', async () => {
    const venueId = await makeVenue();
    const existing = await VenueSubscriberModel.create({ venue_id: venueId, phone: PHONE, name: 'Asha' });
    await subscribeFromFoodOrder(paidOrder(venueId));
    const row = await VenueSubscriberModel.findById(existing._id).lean();
    expect(row?.updated_at.getTime()).toBe(existing.updated_at.getTime());
    expect(row?.user_id).toBeNull();
  });

  it('treats a lost race for the same number as done: one row, no confirmation, nothing logged', async () => {
    const venueId = await makeVenue();
    await VenueSubscriberModel.create({ venue_id: venueId, phone: PHONE, name: 'Asha' });
    // The read ran before the other paid order's insert landed.
    jest.spyOn(VenueSubscriberModel, 'findOne').mockResolvedValueOnce(null as never);

    await subscribeFromFoodOrder(paidOrder(venueId));

    expect(await VenueSubscriberModel.countDocuments()).toBe(1);
    expect(send).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it('logs any other failure to record, and sends nothing', async () => {
    const venueId = await makeVenue();
    jest.spyOn(VenueSubscriberModel, 'findOne').mockRejectedValueOnce(new Error('primary stepped down') as never);
    const order = paidOrder(venueId);

    await expect(subscribeFromFoodOrder(order)).resolves.toBeUndefined();

    expect(warn).toHaveBeenCalledWith('venue-subscriber', 'subscribe', expect.objectContaining({ orderNo: order.order_no }));
    expect(send).not.toHaveBeenCalled();
    expect(await VenueSubscriberModel.countDocuments()).toBe(0);
  });
});

describe('notifyVenueSubscribers', () => {
  const factsFor = (venueId: Types.ObjectId, over: Partial<VenueEventFacts> = {}): VenueEventFacts => ({
    venueId,
    venueName: 'Cafe Uno',
    podId: 'pod-42',
    podTitle: 'Board Game Night',
    date: 'Fri, 16 Oct',
    time: '07:00 PM',
    podImageUrl: POD_PHOTO,
    ...over,
  });

  const subscribe = (venueId: Types.ObjectId, phone: string, over: Record<string, unknown> = {}) =>
    VenueSubscriberModel.create({ venue_id: venueId, phone, name: 'Ravi Kumar', ...over });

  it('queues nothing for a venue whose only subscribers have lapsed or belong elsewhere', async () => {
    const venueId = await makeVenue();
    await subscribe(venueId, '9000000001', { is_active: false });
    await subscribe(await makeVenue(), '9000000002');

    expect(await notifyVenueSubscribers(factsFor(venueId))).toEqual({ queued: 0 });
    expect(sendEach).not.toHaveBeenCalled();
    expect(share).not.toHaveBeenCalled();
  });

  it('announces the pod to every active subscriber, counts only what was sent, and tells live accounts in the app', async () => {
    const venueId = await makeVenue();
    const live = await makeUser();
    const deleted = new Types.ObjectId();
    const sentRow = await subscribe(venueId, '9000000001', { user_id: live });
    const failedRow = await subscribe(venueId, '9000000002', { user_id: deleted, name: '' });
    await subscribe(venueId, '9000000003', { is_active: false });
    sendEach.mockImplementation(async (inputs) =>
      inputs.map((input) => outcome(input.destination === '919000000001' ? 'SENT' : 'FAILED', 'opted out'))
    );

    expect(await notifyVenueSubscribers(factsFor(venueId))).toEqual({ queued: 2 });
    await eventually(() => loggedWith(info, 'notifyNewEvent'));

    expect(share).toHaveBeenCalledWith('POD', 'pod-42');
    expect(sendEach).toHaveBeenCalledTimes(1);
    const inputs = sendEach.mock.calls[0][0];
    expect(inputs).toHaveLength(2);
    expect(inputs).toEqual(
      expect.arrayContaining([
        {
          event: 'VENUE_NEW_EVENT',
          entityId: 'pod-42',
          destination: '919000000001',
          name: 'Ravi Kumar',
          params: ['Ravi', 'Cafe Uno', 'Board Game Night', 'Fri, 16 Oct', '07:00 PM', 'https://duncit.test/s/pod'],
          buttonUrl: 'https://duncit.test/s/pod',
          // The pod's own photo heads the message, ahead of the venue cover.
          assets: { IMAGE: expect.objectContaining({ url: POD_PHOTO }) },
        },
        expect.objectContaining({ destination: '919000000002', name: 'there', params: expect.arrayContaining(['there']) }),
      ])
    );

    const sent = await VenueSubscriberModel.findById(sentRow._id).lean();
    expect(sent?.notified_count).toBe(1);
    expect(sent?.last_notified_at).toBeInstanceOf(Date);
    const failed = await VenueSubscriberModel.findById(failedRow._id).lean();
    expect(failed).toMatchObject({ notified_count: 0, last_notified_at: null });

    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith({
      title: 'New at Cafe Uno',
      body: 'Board Game Night · Fri, 16 Oct, 07:00 PM',
      image_url: null,
      link_url: 'https://duncit.test/s/pod',
      scope: 'USER',
      target_user_ids: [live.toHexString()],
    });
    expect(info).toHaveBeenCalledWith('venue-subscriber', 'notifyNewEvent', {
      venueId: venueId.toHexString(),
      podId: 'pod-42',
      requested: 2,
      SENT: 1,
      SKIPPED: 0,
      FAILED: 1,
      SENDING: 0,
    });
  });

  it('sends in batches of 25 and tells nobody in the app when no subscriber has an account', async () => {
    const venueId = await makeVenue();
    await VenueSubscriberModel.insertMany(
      Array.from({ length: 27 }, (_, index) => ({ venue_id: venueId, phone: `90000000${String(index).padStart(2, '0')}`, name: 'Ravi' }))
    );
    sendEach.mockImplementation(async (inputs) => inputs.map(() => outcome('SENT')));

    expect(await notifyVenueSubscribers(factsFor(venueId, { podImageUrl: null }))).toEqual({ queued: 27 });
    await eventually(() => loggedWith(info, 'notifyNewEvent'));

    expect(sendEach.mock.calls.map(([batch]) => batch.length)).toEqual([25, 2]);
    // No pod photo: the venue's cover stands in.
    expect(sendEach.mock.calls[0][0][0].assets).toEqual({ IMAGE: expect.objectContaining({ url: COVER }) });
    expect(await VenueSubscriberModel.countDocuments({ notified_count: 1 })).toBe(27);
    expect(notify).not.toHaveBeenCalled();
  });

  it('writes no count when nothing was sent, and addresses no deleted account in the app', async () => {
    const venueId = await makeVenue();
    await subscribe(venueId, '9000000001', { user_id: new Types.ObjectId() });
    sendEach.mockImplementation(async (inputs) => inputs.map(() => outcome('SKIPPED', 'no consent')));

    await notifyVenueSubscribers(factsFor(venueId));
    await eventually(() => loggedWith(info, 'notifyNewEvent'));

    expect(await VenueSubscriberModel.countDocuments({ notified_count: 0 })).toBe(1);
    expect(notify).not.toHaveBeenCalled();
    expect(info).toHaveBeenCalledWith('venue-subscriber', 'notifyNewEvent', expect.objectContaining({ SKIPPED: 1, SENT: 0 }));
  });

  it('answers at once and logs a fan-out that fails in the background', async () => {
    const venueId = await makeVenue();
    await subscribe(venueId, '9000000001');
    sendEach.mockRejectedValue(new Error('AiSensy down'));

    expect(await notifyVenueSubscribers(factsFor(venueId))).toEqual({ queued: 1 });
    await eventually(() => loggedWith(error, 'notifyNewEvent'));

    expect(error).toHaveBeenCalledWith(
      'venue-subscriber',
      'notifyNewEvent',
      expect.objectContaining({ venueId: venueId.toHexString(), podId: 'pod-42' })
    );
    expect(await VenueSubscriberModel.countDocuments({ notified_count: 0 })).toBe(1);
  });
});
