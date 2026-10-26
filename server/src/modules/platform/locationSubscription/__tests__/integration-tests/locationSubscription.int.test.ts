/**
 * The city waitlist, against a real database: subscribing as the signed-in
 * member (the number always read from the profile), the subscribe page's
 * status, the admin table and city list, and the launch message that works
 * through a city's rows in batches and writes each outcome back. Only the
 * WhatsApp send and the URL config are stubbed.
 */
jest.mock('@modules/platform/whatsapp/whatsapp.service', () => ({ whatsappService: { sendEach: jest.fn() } }));
jest.mock('@config/url-configs', () => ({ getUrlConfigs: jest.fn().mockResolvedValue({ mwebUrl: 'https://app.duncit.com/' }) }));

import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { UserModel } from '@modules/access/user/user.model';
import { LocationModel } from '@modules/platform/location/location.model';
import { whatsappService } from '@modules/platform/whatsapp/whatsapp.service';
import { LocationSubscriptionModel } from '../../locationSubscription.model';
import { cityOf, findCity, locationSubscriptionService as service, SENDABLE_STATUSES } from '../../locationSubscription.service';
import { sendLaunchMessage } from '../../locationSubscription.send';

let seq = 0;
const city = (over: Record<string, unknown> = {}) => {
  seq += 1;
  return LocationModel.create({
    location_id: `city-${seq}`, location_name: `City ${seq}`, country: 'India', country_code: 'IN', city: `Town ${seq}`,
    location_image: 'https://img/c.jpg', location_pincode: '400001', is_launched: false, ...over,
  });
};
const member = (over: Record<string, unknown> = {}) => {
  seq += 1;
  return UserModel.create({
    auth: { email: `m${seq}@duncit.com`, phone: { extension: '+91', number: `98765${String(10000 + seq)}` } },
    profile: { first_name: 'Asha', last_name: 'Rao' },
    ...over,
  });
};
const sub = (userId: unknown, locationId: unknown, over: Record<string, unknown> = {}) =>
  LocationSubscriptionModel.create({ user_id: userId, location_id: locationId, whatsapp: '919876543210', name: 'Asha Rao', ...over });
const send = whatsappService.sendEach as jest.Mock;
const settle = async (done: () => boolean) => {
  for (let i = 0; i < 300 && !done(); i += 1) await new Promise((r) => setTimeout(r, 10));
};

beforeEach(() => {
  jest.spyOn(logs.server, 'info').mockImplementation(() => undefined);
  jest.spyOn(logs.server, 'error').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

describe('cityOf / findCity', () => {
  it('names a city by its city, else its location name', () => {
    expect(cityOf({ city: 'Pune', location_name: 'Pune Zone' })).toBe('Pune');
    expect(cityOf({ city: '', location_name: 'Pune Zone' })).toBe('Pune Zone');
  });

  it('finds a city by slug or id, and says NOT_FOUND for one that does not exist', async () => {
    const pune = await city({ location_id: 'pune' });
    await expect(findCity({ location_doc_id: 'pune' })).resolves.toMatchObject({ location: { id: String(pune._id) } });
    await expect(findCity({ location_doc_id: String(pune._id) })).resolves.toMatchObject({ id: pune._id });
    await expect(findCity({ location_doc_id: 'nowhere' })).rejects.toMatchObject({ message: 'Location not found', extensions: { code: 'NOT_FOUND' } });
    await expect(findCity({})).rejects.toBeDefined();
  });
});

describe('launchStatus', () => {
  it('is null for a city that does not exist', async () => {
    await expect(service.launchStatus('nowhere', null)).resolves.toBeNull();
  });

  it('counts the waitlist and says whether this member is on it', async () => {
    const pune = await city({ location_id: 'pune' });
    const a = await member();
    const b = await member();
    await sub(a._id, pune._id);
    await sub(b._id, pune._id);
    const asA = await service.launchStatus('pune', String(a._id));
    expect(asA).toMatchObject({ subscriber_count: 2, is_subscribed: true });
    expect(asA?.location.id).toBe(String(pune._id));
    expect(asA).toHaveProperty('launch_media');
    expect(await service.launchStatus('pune', String(new Types.ObjectId()))).toMatchObject({ is_subscribed: false });
    expect(await service.launchStatus('pune', null)).toMatchObject({ is_subscribed: false });
    expect(await service.launchStatus('pune', 'not-an-id')).toMatchObject({ is_subscribed: false });
  });
});

describe('subscribe', () => {
  it('puts the member on the waitlist with the number from their own profile, pending', async () => {
    const pune = await city({ location_id: 'pune' });
    const asha = await member();
    const out = await service.subscribe(String(asha._id), 'pune', true);
    expect(out).toMatchObject({ is_subscribed: true, subscriber_count: 1 });
    expect(await LocationSubscriptionModel.findOne().lean()).toMatchObject({
      name: 'Asha Rao', whatsapp: expect.stringMatching(/^91\d{10}$/), location_shared: true, status: 'PENDING', reason: '', notified_at: null,
    });
    expect(String((await LocationSubscriptionModel.findOne().lean())?.location_id)).toBe(String(pune._id));
  });

  it('refreshes name and number on a repeat tap without touching the send status', async () => {
    await city({ location_id: 'pune' });
    const asha = await member();
    await service.subscribe(String(asha._id), 'pune', false);
    await LocationSubscriptionModel.updateOne({}, { status: 'SENT', reason: 'done' });
    await UserModel.updateOne({ _id: asha._id }, { 'profile.first_name': 'Ashwini' });
    await service.subscribe(String(asha._id), 'pune', true);
    expect(await LocationSubscriptionModel.countDocuments()).toBe(1);
    expect(await LocationSubscriptionModel.findOne().lean()).toMatchObject({ name: 'Ashwini Rao', location_shared: true, status: 'SENT', reason: 'done' });
  });

  it('refuses a city that is already live, naming it', async () => {
    await city({ location_id: 'live', city: 'Delhi', is_launched: true });
    await expect(service.subscribe(String(new Types.ObjectId()), 'live', false)).rejects.toMatchObject({
      message: 'Delhi is already live on Duncit.', extensions: { code: 'BAD_USER_INPUT' },
    });
  });

  it('refuses a member with no usable WhatsApp number, and one that does not exist', async () => {
    await city({ location_id: 'pune' });
    const nameless = await member({ auth: { email: 'nonumber@duncit.com' } });
    await expect(service.subscribe(String(nameless._id), 'pune', false)).rejects.toMatchObject({
      message: 'Add your WhatsApp number to your profile first.', extensions: { code: 'WHATSAPP_REQUIRED' },
    });
    await expect(service.subscribe(String(new Types.ObjectId()), 'pune', false)).rejects.toMatchObject({ extensions: { code: 'WHATSAPP_REQUIRED' } });
    expect(await LocationSubscriptionModel.countDocuments()).toBe(0);
  });

  it('treats a city with no launched flag as live', async () => {
    const c = await city({ location_id: 'old' });
    await LocationModel.collection.updateOne({ _id: c._id }, { $unset: { is_launched: 1 } });
    await expect(service.subscribe(String(new Types.ObjectId()), 'old', false)).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
  });
});

describe('countsByLocation / cities', () => {
  it('counts the subscribers of each city in one read', async () => {
    const a = await city();
    const b = await city();
    await sub(new Types.ObjectId(), a._id);
    await sub(new Types.ObjectId(), a._id);
    await sub(new Types.ObjectId(), b._id);
    await expect(service.countsByLocation()).resolves.toEqual({ [String(a._id)]: 2, [String(b._id)]: 1 });
    await LocationSubscriptionModel.deleteMany({});
    await expect(service.countsByLocation()).resolves.toEqual({});
  });

  it('lists the cities with subscribers, busiest first, with how many were messaged and how many still can be', async () => {
    const big = await city();
    const small = await city();
    const gone = await city();
    for (const status of ['SENT', 'SENT', 'PENDING', 'FAILED', 'SKIPPED']) await sub(new Types.ObjectId(), big._id, { status });
    await sub(new Types.ObjectId(), small._id);
    await sub(new Types.ObjectId(), gone._id);
    await LocationModel.deleteOne({ _id: gone._id });
    const rows = await service.cities();
    expect(rows.map((r) => [r.location.id, r.subscriber_count, r.notified_count, r.pending_count])).toEqual([
      [String(big._id), 5, 2, 3], [String(small._id), 1, 0, 1],
    ]);
    expect(SENDABLE_STATUSES).toEqual(['PENDING', 'FAILED', 'SKIPPED']);
  });
});

describe('table', () => {
  it('lists subscribers with their city, newest first, and tolerates a city that was deleted', async () => {
    const pune = await city({ location_id: 'pune', city: 'Pune' });
    const gone = await city();
    const u = new Types.ObjectId();
    await sub(u, pune._id, { name: 'Asha', whatsapp: '911', location_shared: true, status: 'SENT', notified_at: new Date('2026-03-01T10:00:00Z') });
    await new Promise((r) => setTimeout(r, 5));
    await sub(new Types.ObjectId(), gone._id, { name: '', whatsapp: '912' });
    await LocationModel.deleteOne({ _id: gone._id });
    const page = await service.table({ page: 1, page_size: 10 } as never);
    expect(page.total).toBe(2);
    expect(page.rows[0]).toMatchObject({ city: '', name: '', whatsapp: '912', location_shared: false, status: 'PENDING', reason: '', notified_at: null });
    expect(page.rows[1]).toMatchObject({ city: 'Pune', name: 'Asha', user_id: String(u), location_shared: true });
    expect(page.rows[1]).toMatchObject({ status: 'SENT', notified_at: '2026-03-01T10:00:00.000Z' });
    expect(page.rows[1].created_at).toEqual(expect.any(String));
    expect((await service.table()).total).toBe(2);
  });

  it('searches the name, the number and the city the member chose', async () => {
    const pune = await city({ location_id: 'pune', city: 'Pune' });
    const goa = await city({ location_id: 'goa', city: 'Goa' });
    await sub(new Types.ObjectId(), pune._id, { name: 'Asha', whatsapp: '911111' });
    await sub(new Types.ObjectId(), goa._id, { name: 'Ravi', whatsapp: '922222' });
    const found = async (search: string | null) => (await service.table({ search } as never)).rows.map((r) => r.name).sort();
    expect(await found('asha')).toEqual(['Asha']);
    expect(await found('922')).toEqual(['Ravi']);
    expect(await found('goa')).toEqual(['Ravi']);
    expect(await found('  ')).toEqual(['Asha', 'Ravi']);
    expect(await found(null)).toEqual(['Asha', 'Ravi']);
    expect(await found('zzz')).toEqual([]);
  });

  it('filters by city and by status', async () => {
    const pune = await city({ location_id: 'pune' });
    const goa = await city({ location_id: 'goa' });
    await sub(new Types.ObjectId(), pune._id, { status: 'SENT' });
    await sub(new Types.ObjectId(), goa._id, { status: 'PENDING' });
    const byCity = await service.table({ filters: [{ field: 'location_doc_id', op: 'eq', value: String(goa._id) }] } as never);
    expect(byCity.rows.map((r) => r.status)).toEqual(['PENDING']);
    const bySent = await service.table({ filters: [{ field: 'status', op: 'eq', value: 'SENT' }] } as never);
    expect(bySent.total).toBe(1);
  });
});

describe('sendLaunchMessage', () => {
  const launched = (over: Record<string, unknown> = {}) => city({ is_launched: true, city: 'Pune', location_id: 'pune', ...over });

  it('refuses a city that is not launched yet, naming it', async () => {
    await city({ location_id: 'soon', city: 'Goa' });
    await expect(sendLaunchMessage('soon')).rejects.toMatchObject({ message: 'Switch Launched on for Goa before sending the launch message.', extensions: { code: 'BAD_USER_INPUT' } });
    expect(send).not.toHaveBeenCalled();
  });

  it('treats a city with no launched flag as launched, and an unknown city as not found', async () => {
    const c = await city({ location_id: 'old' });
    await LocationModel.collection.updateOne({ _id: c._id }, { $unset: { is_launched: 1 } });
    await expect(sendLaunchMessage('old')).resolves.toEqual({ queued: 0 });
    await expect(sendLaunchMessage('nowhere')).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
  });

  it('queues nothing when everyone has been messaged', async () => {
    const c = await launched();
    await sub(new Types.ObjectId(), c._id, { status: 'SENT' });
    await expect(sendLaunchMessage('pune')).resolves.toEqual({ queued: 0 });
    expect(send).not.toHaveBeenCalled();
  });

  it('answers at once with how many it queued, then sends each one the launch message with their first name, the city and the app link', async () => {
    const c = await launched();
    const a = await sub(new Types.ObjectId(), c._id, { name: 'Asha Rao', whatsapp: '911' });
    await new Promise((r) => setTimeout(r, 5));
    const b = await sub(new Types.ObjectId(), c._id, { name: '   ', whatsapp: '912', status: 'FAILED' });
    const done = await sub(new Types.ObjectId(), c._id, { status: 'SENT' });
    send.mockResolvedValue([{ status: 'SENT', reason: '', message_id: 'm1' }, { status: 'SENT', reason: '', message_id: 'm2' }]);
    await expect(sendLaunchMessage('pune')).resolves.toEqual({ queued: 2 });
    await settle(() => (logs.server.info as jest.Mock).mock.calls.some((call) => call[1] === 'sendLaunchMessage'));
    const inputs = send.mock.calls[0][0];
    expect(inputs).toEqual([
      { event: 'USER_CITY_LAUNCHED', entityId: String(c._id), destination: '911', name: 'Asha Rao', params: ['Asha', 'Pune', 'https://app.duncit.com'] },
      { event: 'USER_CITY_LAUNCHED', entityId: String(c._id), destination: '912', name: 'there', params: ['there', 'Pune', 'https://app.duncit.com'] },
    ]);
    const rows = Object.fromEntries((await LocationSubscriptionModel.find().lean()).map((r) => [String(r._id), r]));
    expect(rows[String(a._id)]).toMatchObject({ status: 'SENT', reason: '' });
    expect(rows[String(a._id)].notified_at).toBeInstanceOf(Date);
    expect(rows[String(b._id)]).toMatchObject({ status: 'SENT' });
    expect(rows[String(done._id)]).toMatchObject({ status: 'SENT' });
    expect(logs.server.info).toHaveBeenCalledWith('locationSubscription', 'sendLaunchMessage', { location_id: String(c._id), city: 'Pune', requested: 2, SENT: 2, SKIPPED: 0, FAILED: 0 });
  });

  it('records each outcome on its own row: skipped and failed with their reason, an "already sent" skip as sent', async () => {
    const c = await launched();
    const rows = [];
    for (const [i, n] of ['a', 'b', 'c', 'd'].entries()) {
      rows.push(await sub(new Types.ObjectId(), c._id, { name: n, whatsapp: `91${i}` }));
      await new Promise((r) => setTimeout(r, 5));
    }
    send.mockResolvedValue([
      { status: 'SKIPPED', reason: 'Already sent', message_id: '' },
      { status: 'SKIPPED', reason: 'WhatsApp is off', message_id: '' },
      { status: 'FAILED', reason: 'bounced', message_id: '' },
      { status: 'QUEUED', reason: 'odd', message_id: '' },
    ]);
    await sendLaunchMessage('pune');
    await settle(() => (logs.server.info as jest.Mock).mock.calls.length > 0);
    const byId = Object.fromEntries((await LocationSubscriptionModel.find().lean()).map((r) => [String(r._id), r]));
    expect(byId[String(rows[0]._id)]).toMatchObject({ status: 'SENT', reason: '' });
    expect(byId[String(rows[1]._id)]).toMatchObject({ status: 'SKIPPED', reason: 'WhatsApp is off' });
    expect(byId[String(rows[2]._id)]).toMatchObject({ status: 'FAILED', reason: 'bounced' });
    expect(byId[String(rows[3]._id)]).toMatchObject({ status: 'FAILED', reason: 'odd' });
    expect(logs.server.info).toHaveBeenCalledWith('locationSubscription', 'sendLaunchMessage', expect.objectContaining({ SENT: 1, SKIPPED: 1, FAILED: 2 }));
  });

  it('never overwrites a row another Send already marked sent', async () => {
    const c = await launched();
    const row = await sub(new Types.ObjectId(), c._id);
    send.mockImplementation(async () => {
      await LocationSubscriptionModel.updateOne({ _id: row._id }, { status: 'SENT', reason: '' });
      return [{ status: 'FAILED', reason: 'late failure', message_id: '' }];
    });
    await sendLaunchMessage('pune');
    await settle(() => (logs.server.info as jest.Mock).mock.calls.length > 0);
    expect((await LocationSubscriptionModel.findById(row._id).lean())?.status).toBe('SENT');
  });

  it('works through a long waitlist in batches of 25', async () => {
    const c = await launched();
    await LocationSubscriptionModel.insertMany(Array.from({ length: 60 }, (_, i) => ({ user_id: new Types.ObjectId(), location_id: c._id, whatsapp: `91${i}`, name: `n${i}` })));
    send.mockImplementation(async (inputs: unknown[]) => inputs.map(() => ({ status: 'SENT', reason: '', message_id: 'm' })));
    await expect(sendLaunchMessage('pune')).resolves.toEqual({ queued: 60 });
    await settle(() => (logs.server.info as jest.Mock).mock.calls.length > 0);
    expect(send.mock.calls.map((call) => call[0].length)).toEqual([25, 25, 10]);
    expect(await LocationSubscriptionModel.countDocuments({ status: 'SENT' })).toBe(60);
  });

  it('logs a send that breaks part-way instead of failing the request that started it', async () => {
    const c = await launched();
    await sub(new Types.ObjectId(), c._id);
    send.mockRejectedValue(new Error('aisensy down'));
    await expect(sendLaunchMessage('pune')).resolves.toEqual({ queued: 1 });
    await settle(() => (logs.server.error as jest.Mock).mock.calls.length > 0);
    expect(logs.server.error).toHaveBeenCalledWith('locationSubscription', 'sendLaunchMessage', { error: expect.any(Error), location_id: String(c._id) });
  });
});
