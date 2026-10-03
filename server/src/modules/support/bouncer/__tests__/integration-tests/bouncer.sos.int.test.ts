/**
 * SOS alerts and callback requests against the real models. Only the edges are
 * faked: the socket server, the host notification, the AI reason check and the
 * branding read. What is under test is what an SOS / callback stores (the
 * contact number built from the profile, the pod's host, venue and club), the
 * public shape the console renders (people named, a removed pod still drawn),
 * who hears about it (admin room, host room, host push), and every refusal.
 */
import { Types } from 'mongoose';

jest.mock('@observability/log', () => ({
  logs: { server: { error: jest.fn(), warn: jest.fn(), info: jest.fn() } },
}));
jest.mock('@realtime/io', () => ({ getIo: jest.fn() }));
jest.mock('@modules/engagement/notification/notification.service', () => ({
  notificationService: { create: jest.fn() },
}));
jest.mock('@modules/moderation/moderation.ai', () => ({ aiValidateCallbackReason: jest.fn() }));
jest.mock('@modules/platform/settings/settings.service', () => ({
  settingsService: { getBranding: jest.fn() },
}));

import { getIo } from '@realtime/io';
import { notificationService } from '@modules/engagement/notification/notification.service';
import { aiValidateCallbackReason } from '@modules/moderation/moderation.ai';
import { settingsService } from '@modules/platform/settings/settings.service';
import { UserModel } from '@modules/access/user/user.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { ClubModel } from '@modules/clubs/club/club.model';
import { BouncerCallbackRequestModel, BouncerSosAlertModel } from '../../bouncer.model';
import { bouncerService } from '../../bouncer.service';

const io = getIo as jest.Mock;
const notify = notificationService.create as jest.Mock;
const aiReason = aiValidateCallbackReason as jest.Mock;
const branding = settingsService.getBranding as jest.Mock;

const fails = (code: string, message: string) =>
  expect.objectContaining({ message, extensions: expect.objectContaining({ code }) });

let emitted: Array<{ room: string; event: string; payload: any }>;

const flush = async () => {
  for (let i = 0; i < 5; i += 1) await new Promise((r) => setImmediate(r));
};

/** Every seeded number is distinct: the phone pair is a unique index. */
let phoneSeq = 0;

async function seedUser(over: Record<string, unknown> = {}) {
  const _id = new Types.ObjectId();
  phoneSeq += 1;
  await UserModel.collection.insertOne({
    _id,
    profile: { first_name: 'Asha', last_name: 'Rao', profile_photo: 'https://img.example.test/asha.jpg' },
    auth: { email: `user-${_id}@example.test`, phone: { extension: '91', number: String(9000000100 + phoneSeq) } },
    ...over,
  } as never);
  return _id;
}

async function seedPod(over: Record<string, unknown> = {}) {
  const _id = new Types.ObjectId();
  await PodModel.collection.insertOne({
    _id,
    pod_id: `pod-${_id}`,
    pod_title: 'Sunday Run',
    pod_mode: 'PHYSICAL',
    pod_date_time: new Date('2026-11-01T12:30:00.000Z'),
    pod_hosts_id: [],
    ...over,
  } as never);
  return _id;
}

async function seedVenueAndClub(adminIds: Types.ObjectId[]) {
  const venue = new Types.ObjectId();
  const club = new Types.ObjectId();
  await VenueModel.collection.insertOne({ _id: venue, venue_name: 'Park Gate' } as never);
  await ClubModel.collection.insertOne({
    _id: club,
    club_id: `club-${club}`,
    club_name: 'Runners Club',
    admin_user_ids: adminIds,
  } as never);
  return { venue, club };
}

beforeEach(() => {
  emitted = [];
  io.mockReturnValue({
    to: (room: string) => ({
      emit: (event: string, payload: unknown) => emitted.push({ room, event, payload }),
    }),
  });
  notify.mockResolvedValue(undefined);
  aiReason.mockResolvedValue(true);
});

describe('bouncerService.getSupportTarget', () => {
  it('offers the configured support number', async () => {
    branding.mockResolvedValue({ support_phone: '+911800000000' });
    await expect(bouncerService.getSupportTarget()).resolves.toEqual({ phone: '+911800000000', available: true });
  });

  it('says unavailable when no number (or no branding) is set', async () => {
    branding.mockResolvedValue(null);
    await expect(bouncerService.getSupportTarget()).resolves.toEqual({ phone: '', available: false });
  });
});

describe('bouncerService.raiseSos', () => {
  it('refuses a pod that does not exist, and an account that does not', async () => {
    await expect(
      bouncerService.raiseSos(String(new Types.ObjectId()), { pod_id: String(new Types.ObjectId()) })
    ).rejects.toEqual(fails('NOT_FOUND', 'Pod not found'));

    const pod = await seedPod();
    await expect(bouncerService.raiseSos(String(new Types.ObjectId()), { pod_id: String(pod) })).rejects.toEqual(
      fails('UNAUTHENTICATED', 'User not found')
    );
    expect(await BouncerSosAlertModel.countDocuments()).toBe(0);
  });

  it('stores the alert with the pod’s host, venue and club, then tells the admins, the host room and the host', async () => {
    const user = await seedUser();
    const host = await seedUser({ profile: { first_name: 'Hari', last_name: 'Host' } });
    const clubAdmin = await seedUser({ profile: { first_name: 'Cara' } });
    const { venue, club } = await seedVenueAndClub([clubAdmin]);
    const pod = await seedPod({ pod_hosts_id: [host], venue_id: venue, club_id: club });

    const pub = await bouncerService.raiseSos(String(user), {
      pod_id: String(pod),
      message: '  Need help at the gate  ',
      location: { lat: 18.5, lng: 73.8, accuracy: 12 },
    });
    await flush();

    const stored = await BouncerSosAlertModel.findById(pub.id).lean();
    const phone = (await UserModel.collection.findOne({ _id: user })) as any;
    expect(stored).toMatchObject({
      user_id: user,
      pod_id: pod,
      host_id: host,
      venue_id: venue,
      club_id: club,
      message: 'Need help at the gate',
      contact_phone: `+91${phone.auth.phone.number}`,
      status: 'ACTIVE',
      location: { lat: 18.5, lng: 73.8, accuracy: 12 },
      ticket_no: `SOS-${pub.id.slice(-6).toUpperCase()}`,
    });

    expect(pub).toMatchObject({
      ticket_no: `SOS-${pub.id.slice(-6).toUpperCase()}`,
      user: {
        id: String(user),
        name: 'Asha Rao',
        phone: `+91${phone.auth.phone.number}`,
        avatar_url: 'https://img.example.test/asha.jpg',
      },
      host: { id: String(host), name: 'Hari Host' },
      pod: {
        id: String(pod),
        title: 'Sunday Run',
        venue_id: String(venue),
        venue_name: 'Park Gate',
        club_id: String(club),
        club_name: 'Runners Club',
        starts_at: '2026-11-01T12:30:00.000Z',
        feedback_aspects: ['OVERALL', 'HOST', 'VENUE', 'CLUB_ADMIN', 'SAFETY', 'FOOD', 'OTHER'],
      },
      message: 'Need help at the gate',
      status: 'ACTIVE',
      acknowledged_by_id: null,
      acknowledged_at: null,
      resolved_at: null,
    });
    expect(pub.created_at).toEqual(expect.any(String));

    expect(emitted.map((e) => [e.room, e.event])).toEqual([
      ['admin:bouncers', 'bouncer:sos_new'],
      [`host:${host}`, 'bouncer:sos_new'],
    ]);
    expect(notify).toHaveBeenCalledWith({
      title: `🚨 SOS ${pub.ticket_no} from Asha Rao`,
      body: 'At "Sunday Run". Need help at the gate',
      scope: 'USER',
      target_user_ids: [String(host)],
      link_url: `/bouncers?sos=${pub.id}`,
    });
  });

  it('raises a host-less SOS from an account with no phone, telling only the admins', async () => {
    const user = await seedUser({ profile: {}, auth: { email: 'nophone@example.test' } });
    const pod = await seedPod({ pod_mode: 'VIRTUAL' });

    const pub = await bouncerService.raiseSos(String(user), { pod_id: String(pod) });
    await flush();

    expect(pub).toMatchObject({
      user: { name: 'User', phone: null, avatar_url: null },
      host: null,
      contact_phone: '',
      message: '',
      location: null,
      pod: { venue_id: null, venue_name: null, club_id: null, club_name: null, feedback_aspects: ['OVERALL', 'HOST', 'SAFETY', 'OTHER'] },
    });
    expect(emitted.map((e) => e.room)).toEqual(['admin:bouncers']);
    expect(notify).not.toHaveBeenCalled();
  });

  it('keeps the phone extension a single “+” and still answers when the socket server and push are down', async () => {
    const user = await seedUser({ auth: { email: 'plus@example.test', phone: { extension: '+44', number: '7000000001' } } });
    const host = await seedUser({ auth: { email: 'host-plus@example.test' } });
    const pod = await seedPod({ pod_hosts_id: [host] });
    io.mockImplementation(() => {
      throw new Error('Socket server not initialised');
    });
    notify.mockRejectedValue(new Error('push down'));

    const pub = await bouncerService.raiseSos(String(user), { pod_id: String(pod), message: 'Hurt ankle' });
    await flush();

    expect(pub.contact_phone).toBe('+447000000001');
    expect(pub.user.phone).toBe('+447000000001');
    expect(emitted).toEqual([]);
    expect(await BouncerSosAlertModel.countDocuments()).toBe(1);
  });

  it('dials the bare number when the profile has no extension', async () => {
    const user = await seedUser({ auth: { email: 'noext@example.test', phone: { number: '7000000002' } } });
    const pod = await seedPod();

    const pub = await bouncerService.raiseSos(String(user), { pod_id: String(pod) });

    expect(pub.contact_phone).toBe('7000000002');
    expect(pub.user.phone).toBe('7000000002');
  });
});

describe('SOS lifecycle and reads', () => {
  it('acknowledges, then resolves, stamping who and when, and tells the host room', async () => {
    const host = await seedUser({ auth: { email: 'lifecycle-host@example.test' } });
    const sos = await BouncerSosAlertModel.create({
      user_id: new Types.ObjectId(),
      pod_id: new Types.ObjectId(),
      host_id: host,
      status: 'ACTIVE',
      contact_phone: '+910000000000',
    });
    const admin = String(new Types.ObjectId());

    const acked = await bouncerService.acknowledgeSos(admin, String(sos._id));
    expect(acked).toMatchObject({ status: 'ACKNOWLEDGED', acknowledged_by_id: admin });
    // A user who has since gone is drawn from what the alert stored.
    expect(acked.user).toMatchObject({ name: 'User', phone: '+910000000000', avatar_url: null });
    expect(acked.pod).toMatchObject({ title: '(pod removed)', feedback_aspects: [] });
    const firstAck = acked.acknowledged_at;

    const other = String(new Types.ObjectId());
    const resolved = await bouncerService.resolveSos(other, String(sos._id));
    expect(resolved.status).toBe('RESOLVED');
    expect(resolved.resolved_at).toEqual(expect.any(String));
    // Resolving an acknowledged alert keeps the original acknowledgement.
    expect(resolved.acknowledged_by_id).toBe(admin);
    expect(resolved.acknowledged_at).toBe(firstAck);
    expect(emitted.filter((e) => e.room === `host:${host}`).map((e) => e.event)).toEqual([
      'bouncer:sos_update',
      'bouncer:sos_update',
    ]);
  });

  it('resolving an alert nobody acknowledged acknowledges it too', async () => {
    const sos = await BouncerSosAlertModel.create({ user_id: new Types.ObjectId(), pod_id: new Types.ObjectId(), status: 'ACTIVE' });
    const admin = String(new Types.ObjectId());

    const resolved = await bouncerService.resolveSos(admin, String(sos._id));

    expect(resolved.acknowledged_by_id).toBe(admin);
    expect(resolved.acknowledged_at).toEqual(expect.any(String));
    expect(emitted.map((e) => e.room)).toEqual(['admin:bouncers']);
  });

  it('refuses malformed and unknown ids', async () => {
    const admin = String(new Types.ObjectId());
    await expect(bouncerService.acknowledgeSos(admin, 'nope')).rejects.toEqual(fails('BAD_USER_INPUT', 'Invalid id'));
    await expect(bouncerService.resolveSos(admin, 'nope')).rejects.toEqual(fails('BAD_USER_INPUT', 'Invalid id'));
    await expect(bouncerService.resolveSos(admin, String(new Types.ObjectId()))).rejects.toEqual(
      fails('NOT_FOUND', 'SOS not found')
    );
  });

  it('filters the SOS list by status and searches message and phone', async () => {
    const base = { user_id: new Types.ObjectId(), pod_id: new Types.ObjectId() };
    await BouncerSosAlertModel.create({ ...base, status: 'ACTIVE', message: 'fire alarm', contact_phone: '+911111111111' });
    await BouncerSosAlertModel.create({ ...base, status: 'RESOLVED', message: 'lost keys', contact_phone: '+912222222222' });

    const active = await bouncerService.listSos({ status: 'ACTIVE' });
    expect(active.items.map((i) => i.message)).toEqual(['fire alarm']);
    const byPhone = await bouncerService.listSos({ search: '2222' });
    expect(byPhone.items.map((i) => i.message)).toEqual(['lost keys']);
    const byText = await bouncerService.listSos({ search: 'FIRE' });
    expect(byText.total).toBe(1);
  });

  it('finds no active SOS for a malformed pod id', async () => {
    await expect(bouncerService.getMyActiveSos(String(new Types.ObjectId()), 'bad')).resolves.toBeNull();
  });
});

describe('bouncerService.requestCallback', () => {
  it('refuses an account with no phone number on file', async () => {
    const user = await seedUser({ auth: { email: 'cb-nophone@example.test' } });
    await expect(bouncerService.requestCallback(String(user), {})).rejects.toEqual(
      fails('BAD_USER_INPUT', 'No phone number on profile')
    );
  });

  it('refuses a typed reason the AI check rejects, and does not save it', async () => {
    const user = await seedUser();
    aiReason.mockResolvedValue(false);

    await expect(bouncerService.requestCallback(String(user), { reason: '  asdfgh  ' })).rejects.toEqual(
      fails('BAD_USER_INPUT', 'Please enter a valid reason for your callback request.')
    );
    expect(aiReason).toHaveBeenCalledWith('asdfgh');
    expect(await BouncerCallbackRequestModel.countDocuments()).toBe(0);
  });

  it('files a callback against the pod and its host, without checking an empty reason', async () => {
    const user = await seedUser();
    const host = await seedUser({ auth: { email: 'cb-host@example.test' } });
    const pod = await seedPod({ pod_hosts_id: [host] });

    const pub = await bouncerService.requestCallback(String(user), { pod_id: String(pod), reason: '   ' });

    expect(aiReason).not.toHaveBeenCalled();
    const stored = await BouncerCallbackRequestModel.findById(pub.id).lean();
    expect(stored).toMatchObject({ pod_id: pod, host_id: host, reason: '', status: 'PENDING' });
    expect(pub).toMatchObject({
      ticket_no: `CB-${pub.id.slice(-6).toUpperCase()}`,
      pod: { id: String(pod), title: 'Sunday Run' },
      status: 'PENDING',
      contacted_at: null,
      duration_seconds: null,
      conclusion: '',
    });
    expect(emitted).toEqual([{ room: 'admin:bouncers', event: 'bouncer:callback_new', payload: pub }]);
  });

  it('files without a pod when the pod id is malformed or the pod is gone', async () => {
    const user = await seedUser();

    const malformed = await bouncerService.requestCallback(String(user), { pod_id: 'nope', reason: 'Refund query' });
    const gone = await bouncerService.requestCallback(String(user), { pod_id: String(new Types.ObjectId()) });

    expect(malformed.pod).toBeNull();
    expect(malformed.reason).toBe('Refund query');
    expect(gone.pod).toBeNull();
    expect(await BouncerCallbackRequestModel.countDocuments({ pod_id: null, host_id: null })).toBe(2);
  });
});

describe('callback lifecycle and reads', () => {
  const seedCallback = (over: Record<string, unknown> = {}) =>
    BouncerCallbackRequestModel.create({
      user_id: new Types.ObjectId(),
      contact_phone: '+913333333333',
      status: 'PENDING',
      ...over,
    });

  it('records a rounded duration and a trimmed conclusion when contacted', async () => {
    const cb = await seedCallback();
    const admin = String(new Types.ObjectId());

    const pub = await bouncerService.markCallbackContacted(admin, String(cb._id), {
      duration_seconds: 61.6,
      conclusion: '  Refund explained  ',
    });

    expect(pub).toMatchObject({ status: 'CONTACTED', duration_seconds: 62, conclusion: 'Refund explained' });
    expect(pub.contacted_at).toEqual(expect.any(String));
    expect(emitted.map((e) => e.event)).toEqual(['bouncer:callback_update']);
  });

  it('ignores a negative or missing duration and a non-string conclusion', async () => {
    const cb = await seedCallback({ duration_seconds: 30, conclusion: 'kept' });
    const admin = String(new Types.ObjectId());

    const pub = await bouncerService.markCallbackContacted(admin, String(cb._id), {
      duration_seconds: -5,
      conclusion: null,
    });
    expect(pub).toMatchObject({ duration_seconds: 30, conclusion: 'kept' });

    const again = await bouncerService.markCallbackContacted(admin, String(cb._id));
    expect(again).toMatchObject({ duration_seconds: 30, conclusion: 'kept' });
  });

  it('closing keeps an earlier contact stamp, and stamps one when there was none', async () => {
    const contactedAt = new Date('2026-10-01T10:00:00.000Z');
    const contacted = await seedCallback({ status: 'CONTACTED', contacted_at: contactedAt });
    const fresh = await seedCallback();
    const admin = String(new Types.ObjectId());

    const closedContacted = await bouncerService.closeCallback(admin, String(contacted._id), { duration_seconds: 0 });
    const closedFresh = await bouncerService.closeCallback(admin, String(fresh._id));

    expect(closedContacted).toMatchObject({ status: 'CLOSED', contacted_at: contactedAt.toISOString(), duration_seconds: 0 });
    expect(closedFresh.status).toBe('CLOSED');
    expect(closedFresh.contacted_at).toEqual(expect.any(String));
    const stored = await BouncerCallbackRequestModel.findById(fresh._id).lean();
    expect(String(stored?.contacted_by)).toBe(admin);
  });

  it('refuses malformed and unknown callback ids', async () => {
    const admin = String(new Types.ObjectId());
    for (const op of [bouncerService.markCallbackContacted, bouncerService.closeCallback]) {
      await expect(op(admin, 'nope')).rejects.toEqual(fails('BAD_USER_INPUT', 'Invalid id'));
      await expect(op(admin, String(new Types.ObjectId()))).rejects.toEqual(fails('NOT_FOUND', 'Callback not found'));
    }
  });

  it('filters callbacks by status and searches reason and phone', async () => {
    await seedCallback({ reason: 'Refund query', contact_phone: '+914444444444' });
    await seedCallback({ status: 'CLOSED', reason: 'Venue directions', contact_phone: '+915555555555' });

    expect((await bouncerService.listCallbacks({ status: 'CLOSED' })).items.map((i) => i.reason)).toEqual([
      'Venue directions',
    ]);
    expect((await bouncerService.listCallbacks({ search: 'refund' })).items.map((i) => i.reason)).toEqual([
      'Refund query',
    ]);
    expect((await bouncerService.listCallbacks({ search: '5555' })).total).toBe(1);
  });

  it('caps a user’s own callback list at no fewer than one row', async () => {
    const user = new Types.ObjectId();
    await seedCallback({ user_id: user });
    await seedCallback({ user_id: user });

    expect(await bouncerService.listMyCallbacks(String(user), 0)).toHaveLength(1);
    expect(await bouncerService.listMyCallbacks(String(user))).toHaveLength(2);
  });
});
