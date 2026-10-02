/**
 * Cancellation risk against a real Mongo: the verdict for one pod (and why a
 * pod is NOT at risk), the bookings that would close a shortfall, the admin
 * detail view, and the sweep — flag, alert at most once per Pod Settings
 * interval, clear whatever is no longer at risk.
 *
 * The settlement waterfall is replaced by a transparent fake (the host keeps
 * what was collected minus the venue's cost) so every figure here can be
 * worked out by hand; the money maths itself is the settlement module's own
 * suite's business. Pod Settings, the WhatsApp/email funnel, the locale
 * lookups and the URL config are faked as well.
 */
import { Types } from 'mongoose';

jest.mock('@observability/log', () => ({
  logs: { server: { error: jest.fn(), warn: jest.fn(), info: jest.fn() } },
}));
jest.mock('@modules/finance/finance/settlement.service', () => ({
  collectedForPod: jest.fn(),
  resolveEffectiveRates: jest.fn(),
  venueAmountForPod: jest.fn(),
  waterfallForAmount: jest.fn(),
}));
jest.mock('@modules/platform/settings/settings.service', () => ({
  settingsService: { getPodAutoCancelSettings: jest.fn() },
}));
jest.mock('@services/notify/notify.service', () => ({ notifyEach: jest.fn() }));
jest.mock('@services/email/email-i18n', () => ({
  recipientLocale: jest.fn(),
  emailTranslationVars: jest.fn(),
}));
jest.mock('@config/url-configs', () => ({ getUrlConfigs: jest.fn() }));
jest.mock('@modules/platform/whatsapp/whatsapp.assets', () => ({ podImageAssets: jest.fn() }));
jest.mock('@modules/pods/pod/pod.service', () => ({
  loadPodClubSlugMap: jest.fn(),
  podNotificationLink: jest.fn(),
}));
jest.mock('@utils/app-time', () => ({
  ...jest.requireActual('@utils/app-time'),
  appDate: (d: Date) => `DATE(${new Date(d).toISOString()})`,
  appTime: (d: Date) => `TIME(${new Date(d).toISOString()})`,
  appDateTime: (d: Date) => `AT(${new Date(d).toISOString()})`,
}));

import { logs } from '@observability/log';
import {
  collectedForPod,
  resolveEffectiveRates,
  venueAmountForPod,
  waterfallForAmount,
} from '@modules/finance/finance/settlement.service';
import { settingsService } from '@modules/platform/settings/settings.service';
import { notifyEach } from '@services/notify/notify.service';
import { emailTranslationVars, recipientLocale } from '@services/email/email-i18n';
import { getUrlConfigs } from '@config/url-configs';
import { podImageAssets } from '@modules/platform/whatsapp/whatsapp.assets';
import { loadPodClubSlugMap, podNotificationLink } from '@modules/pods/pod/pod.service';
import { ClubModel } from '@modules/clubs/club/club.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { UserModel } from '@modules/access/user/user.model';
import { PodModel } from '../../pod.model';
import {
  assessPodCancellationRisk,
  podCancelAt,
  podCancellationRisk,
  podFinanceNow,
  runPodCancellationRiskSweep,
  spotsNeededToCover,
  type PodFinanceNow,
} from '../../pod.cancellationRisk';

const collected = collectedForPod as jest.Mock;
const rates = resolveEffectiveRates as jest.Mock;
const venueCost = venueAmountForPod as jest.Mock;
const waterfall = waterfallForAmount as jest.Mock;
const autoCancel = settingsService.getPodAutoCancelSettings as jest.Mock;
const notify = notifyEach as jest.Mock;
const locale = recipientLocale as jest.Mock;
const words = emailTranslationVars as jest.Mock;
const urls = getUrlConfigs as jest.Mock;
const assets = podImageAssets as jest.Mock;
const slugMap = loadPodClubSlugMap as jest.Mock;
const linkOf = podNotificationLink as jest.Mock;
const logError = logs.server.error as jest.Mock;
const logInfo = logs.server.info as jest.Mock;

const HOUR = 3_600_000;
const oid = () => new Types.ObjectId();
const inHours = (h: number) => new Date(Date.now() + h * HOUR);
const SETTINGS = { enabled: true, lead_hours: 24, risk_window_hours: 72, risk_alert_hours: 12 };
const RATES = { host_commission_pct: 10 };
const VENUE_COST = 1000;

/** The fake waterfall: the host keeps what was collected less the venue's cost. */
const fakeWaterfall = (amount: number, venueAmount: number) => ({
  version: 1,
  amount,
  venue_amount: venueAmount,
  host_receives: amount - venueAmount,
});

/** Collected per pod id; anything unlisted collected nothing. */
let collectedByPod: Map<string, number>;

beforeEach(() => {
  collectedByPod = new Map();
  autoCancel.mockResolvedValue(SETTINGS);
  venueCost.mockImplementation(async (pod: any) => (pod.venue_id ? VENUE_COST : 0));
  collected.mockImplementation(async (podId: unknown) => collectedByPod.get(String(podId)) ?? 0);
  rates.mockResolvedValue(RATES);
  waterfall.mockImplementation((amount: number, venueAmount: number) => fakeWaterfall(amount, venueAmount));
  notify.mockResolvedValue([]);
  locale.mockResolvedValue('hi');
  words.mockResolvedValue({
    't:email.podCancellationRisk.cannotCover': 'Bookings alone cannot cover it',
    't:email.podCancellationRisk.bookingsNeededCount': '{{count}} more bookings',
  });
  urls.mockResolvedValue({ mwebUrl: 'https://m.example.com/', partnersUrl: 'https://partners.example.com//' });
  assets.mockReturnValue({ header_image: 'https://cdn.example.com/pod.jpg' });
  slugMap.mockResolvedValue(new Map());
  linkOf.mockReturnValue('/smash-club/sunday-smash');
});

/* ---------------------------------------------------------- fixtures */

let seq = 0;

async function seedUser(first: string, last: string, email: string | null) {
  const _id = oid();
  await UserModel.collection.insertOne({
    _id,
    profile: { first_name: first, last_name: last },
    auth: email ? { email } : {},
  });
  return _id;
}

async function seedWorld() {
  const host = await seedUser('Asha', 'Rao', 'host@example.com');
  const adminA = await seedUser('Meera', 'Iyer', null);
  const adminB = oid(); // an admin id with no account left
  const club = oid();
  await ClubModel.collection.insertOne({ _id: club, club_name: 'Smash Club', admin_user_ids: [adminA, adminB] });
  const venue = oid();
  await VenueModel.collection.insertOne({ _id: venue, venue_name: 'Play Arena', owner_user_id: oid() });
  return { host, adminA, adminB, club, venue };
}

/** Through the model, so `cancellation_risk` is stored as its schema default (null). */
async function seedPod(world: { host: Types.ObjectId; club: Types.ObjectId; venue: Types.ObjectId }, over: Record<string, unknown> = {}) {
  seq += 1;
  return PodModel.create({
    pod_id: `risk-pod-${seq}`,
    pod_title: 'Sunday Smash',
    pod_hosts_id: [world.host],
    club_id: world.club,
    venue_id: world.venue,
    pod_description: 'A friendly doubles evening',
    pod_date_time: inHours(48),
    pod_type: 'PAID',
    pod_amount: 300,
    no_of_spots: 10,
    pod_attendees: [oid(), oid()],
    is_active: true,
    ...over,
  });
}

const riskOf = async (id: unknown) => ((await PodModel.findById(id).setOptions({ includeDeleted: true }).lean()) as any)?.cancellation_risk;

/* ------------------------------------------------------- podFinanceNow */

describe('podFinanceNow', () => {
  it('skips the waterfall for a pod with no venue cost', async () => {
    const pod = { _id: oid(), venue_id: null, pod_hosts_id: [oid()] };
    await expect(podFinanceNow(pod)).resolves.toEqual({
      collected: 0,
      venueAmount: 0,
      rates: null,
      waterfall: null,
      negative: false,
    });
    expect(venueCost).toHaveBeenCalledWith(pod, 0);
    expect(collected).not.toHaveBeenCalled();
    expect(rates).not.toHaveBeenCalled();
  });

  it('runs the unclamped waterfall under the lead host and venue rates', async () => {
    const host = oid();
    const venue = oid();
    const pod = { _id: oid(), venue_id: venue, pod_hosts_id: [host] };
    collectedByPod.set(String(pod._id), 400);

    const finance = await podFinanceNow(pod);

    expect(rates).toHaveBeenCalledWith({ hostUserId: host, venueId: venue });
    expect(waterfall).toHaveBeenCalledWith(400, VENUE_COST, RATES, { clampVenueToPool: false });
    expect(finance).toEqual({
      collected: 400,
      venueAmount: VENUE_COST,
      rates: RATES,
      waterfall: fakeWaterfall(400, VENUE_COST),
      negative: true,
    });
  });

  it('reads a pod with no hosts as having no host rates, and a covered pod as not negative', async () => {
    const pod = { _id: oid(), venue_id: oid() };
    collectedByPod.set(String(pod._id), VENUE_COST);
    const finance = await podFinanceNow(pod);
    expect(rates).toHaveBeenCalledWith({ hostUserId: null, venueId: pod.venue_id });
    expect(finance.negative).toBe(false);
  });
});

/* -------------------------------------------------- spotsNeededToCover */

describe('spotsNeededToCover', () => {
  const short: PodFinanceNow = {
    collected: 200,
    venueAmount: VENUE_COST,
    rates: RATES as never,
    waterfall: null,
    negative: true,
  };

  it('finds the fewest extra bookings that bring the host back to zero', () => {
    // 200 + 3 × 300 = 1100 ≥ 1000; 2 × 300 would leave the host at −200.
    expect(spotsNeededToCover(short, 300, 7, false)).toBe(3);
    expect(spotsNeededToCover(short, 400, 7, false)).toBe(2);
    expect(spotsNeededToCover(short, 800, 7, false)).toBe(1);
  });

  it('is null when the seats left cannot close the gap', () => {
    expect(spotsNeededToCover(short, 300, 2, false)).toBeNull();
    expect(spotsNeededToCover(short, 300, 0, false)).toBeNull();
  });

  it('searches an unlimited pod up to its cap, and no further', () => {
    expect(spotsNeededToCover(short, 300, 0, true)).toBe(3);
    // 800 short at ₹1 a booking needs 800 bookings — past the 200 cap.
    expect(spotsNeededToCover(short, 1, 0, true)).toBeNull();
    expect(spotsNeededToCover(short, 4, 0, true)).toBe(200);
  });

  it('is null for a pod that is not short, has no rates, or sells nothing per seat', () => {
    expect(spotsNeededToCover({ ...short, negative: false }, 300, 7, false)).toBeNull();
    expect(spotsNeededToCover({ ...short, rates: null }, 300, 7, false)).toBeNull();
    expect(spotsNeededToCover(short, 0, 7, false)).toBeNull();
    expect(waterfall).not.toHaveBeenCalled();
  });
});

/* ------------------------------------------ assessPodCancellationRisk */

describe('assessPodCancellationRisk', () => {
  const now = Date.now();
  const pod = (over: Record<string, unknown> = {}) => ({
    _id: oid(),
    pod_date_time: new Date(now + 48 * HOUR),
    is_active: true,
    deleted_at: null,
    completed_at: null,
    venue_id: oid(),
    pod_hosts_id: [oid()],
    pod_attendees: [oid(), oid()],
    extra_seats: 1,
    no_of_spots: 10,
    pod_amount: 300,
    ...over,
  });

  it('flags a negative pod inside the window with its shortfall and the bookings that fix it', async () => {
    const p = pod();
    collectedByPod.set(String(p._id), 200);

    const verdict = await assessPodCancellationRisk(p, SETTINGS, now);

    expect(verdict).toMatchObject({
      state: 'AT_RISK',
      at_risk: true,
      hours_until_start: 48,
      shortfall: 800,
      booked_seats: 3,
      total_spots: 10,
      seats_available: 7,
      ticket_price: 300,
      spots_needed: 3,
    });
    expect(verdict.finance.negative).toBe(true);
  });

  it('searches an unlimited pod for the bookings it needs', async () => {
    const p = pod({ no_of_spots: 0 });
    collectedByPod.set(String(p._id), 200);
    const verdict = await assessPodCancellationRisk(p, SETTINGS, now);
    expect(verdict).toMatchObject({ state: 'AT_RISK', total_spots: 0, seats_available: 0, spots_needed: 3 });
  });

  it('names why a pod is not at risk', async () => {
    const off = await assessPodCancellationRisk(pod(), { ...SETTINGS, enabled: false }, now);
    expect(off).toMatchObject({ state: 'AUTO_CANCEL_OFF', at_risk: false, shortfall: 0, spots_needed: null });
    expect(off.finance).toEqual({ collected: 0, venueAmount: 0, rates: null, waterfall: null, negative: false });
    expect(venueCost).not.toHaveBeenCalled();

    for (const over of [
      { deleted_at: new Date() },
      { completed_at: new Date() },
      { is_active: false },
      { pod_date_time: new Date(now - HOUR) },
    ]) {
      await expect(assessPodCancellationRisk(pod(over), SETTINGS, now)).resolves.toMatchObject({ state: 'NOT_UPCOMING' });
    }
    expect(venueCost).not.toHaveBeenCalled();

    await expect(assessPodCancellationRisk(pod({ venue_id: null }), SETTINGS, now)).resolves.toMatchObject({
      state: 'NO_VENUE_COST',
      at_risk: false,
    });

    const far = pod({ pod_date_time: new Date(now + 100 * HOUR) });
    const outside = await assessPodCancellationRisk(far, SETTINGS, now);
    expect(outside).toMatchObject({ state: 'OUTSIDE_WINDOW', at_risk: false });
    expect(outside.finance.venueAmount).toBe(VENUE_COST);

    const covered = pod();
    collectedByPod.set(String(covered._id), 1500);
    await expect(assessPodCancellationRisk(covered, SETTINGS, now)).resolves.toMatchObject({
      state: 'HEALTHY',
      at_risk: false,
      shortfall: 0,
    });
  });

  it('places the cancel instant the lead window before the start', () => {
    const start = new Date('2026-11-01T12:00:00Z');
    expect(podCancelAt({ pod_date_time: start }, 24).toISOString()).toBe('2026-10-31T12:00:00.000Z');
  });
});

/* ------------------------------------------------ podCancellationRisk */

describe('podCancellationRisk — the admin detail view', () => {
  it('refuses a malformed id and reports a missing pod', async () => {
    await expect(podCancellationRisk('nope')).rejects.toMatchObject({
      message: 'Invalid pod',
      extensions: { code: 'BAD_USER_INPUT' },
    });
    await expect(podCancellationRisk(String(oid()))).rejects.toMatchObject({
      message: 'Pod not found',
      extensions: { code: 'NOT_FOUND' },
    });
  });

  it('explains an at-risk pod: money, seats, cancel time and the next alert', async () => {
    const world = await seedWorld();
    const p = await seedPod(world);
    collectedByPod.set(String(p._id), 200);
    const alertedAt = new Date(Date.now() - 2 * HOUR);
    await PodModel.collection.updateOne(
      { _id: p._id },
      { $set: { cancellation_risk: { at_risk: true, evaluated_at: alertedAt, shortfall: 800, spots_needed: 3, alerted_at: alertedAt, alert_count: 2 } } }
    );

    const view = await podCancellationRisk(String(p._id));

    expect(view).toMatchObject({
      pod_id: String(p._id),
      state: 'AT_RISK',
      at_risk: true,
      lead_hours: 24,
      window_hours: 72,
      alert_hours: 12,
      cancel_at: new Date(p.pod_date_time.getTime() - 24 * HOUR).toISOString(),
      currency_symbol: '₹',
      collected_total: 200,
      venue_amount: VENUE_COST,
      shortfall: 800,
      waterfall: fakeWaterfall(200, VENUE_COST),
      attendees: { booked_seats: 2, total_spots: 10, seats_available: 8, ticket_price: 300, spots_needed: 3 },
      alerted_at: alertedAt.toISOString(),
      alert_count: 2,
      next_alert_at: new Date(alertedAt.getTime() + 12 * HOUR).toISOString(),
    });
    expect(view.hours_until_start).toBeGreaterThan(47.9);
    expect(view.hours_until_start).toBeLessThanOrEqual(48);
  });

  it('shows no alert history for a pod that was never alerted', async () => {
    const world = await seedWorld();
    const p = await seedPod(world);
    const view = await podCancellationRisk(String(p._id));
    expect(view).toMatchObject({ state: 'AT_RISK', alerted_at: null, alert_count: 0, next_alert_at: null });
  });

  it('reads a cancelled pod, and gives a non-risk state an empty waterfall and no cancel time', async () => {
    const world = await seedWorld();
    const cancelled = await seedPod(world, { deleted_at: new Date() });
    const view = await podCancellationRisk(String(cancelled._id));
    expect(view).toMatchObject({ state: 'NOT_UPCOMING', at_risk: false, cancel_at: null, next_alert_at: null });
    expect(view.waterfall).toMatchObject({ version: 0, amount: 0, host_receives: 0, venue_amount: 0 });

    autoCancel.mockResolvedValue({ ...SETTINGS, enabled: false });
    const live = await seedPod(world);
    await expect(podCancellationRisk(String(live._id))).resolves.toMatchObject({ state: 'AUTO_CANCEL_OFF' });
  });
});

/* -------------------------------------------- runPodCancellationRiskSweep */

describe('runPodCancellationRiskSweep', () => {
  it('flags a negative pod written through the model and alerts its host and club admins once', async () => {
    const world = await seedWorld();
    const atRisk = await seedPod(world);
    collectedByPod.set(String(atRisk._id), 200);

    await expect(runPodCancellationRiskSweep()).resolves.toEqual({ flagged: 1, alerted: 1 });

    const risk = await riskOf(atRisk._id);
    expect(risk).toMatchObject({ at_risk: true, shortfall: 800, spots_needed: 3, alert_count: 1 });
    expect(risk.alerted_at).toBeInstanceOf(Date);
    expect(risk.evaluated_at).toBeInstanceOf(Date);

    expect(notify).toHaveBeenCalledTimes(1);
    const inputs = notify.mock.calls[0][0];
    expect(inputs).toHaveLength(3);
    const cancelAt = new Date(atRisk.pod_date_time.getTime() - 24 * HOUR);
    const date = atRisk.pod_date_time.toISOString();
    const vars = { venue: 'Play Arena', collected: '₹200', venue_cost: '₹1000', spots: '2 / 10' };
    expect(inputs[0]).toMatchObject({
      event: 'HOST_POD_CANCELLATION_RISK',
      entityId: `${String(atRisk._id)}:1`,
      name: 'Asha Rao',
      assets: { header_image: 'https://cdn.example.com/pod.jpg' },
      params: [
        'Asha Rao',
        'Sunday Smash',
        `DATE(${date})`,
        `TIME(${date})`,
        '₹800',
        '3 more bookings',
        `AT(${cancelAt.toISOString()})`,
        'https://m.example.com/smash-club/sunday-smash',
      ],
      vars,
    });
    expect(inputs[0].user.auth.email).toBe('host@example.com');
    expect(inputs[1]).toMatchObject({
      event: 'CLUB_ADMIN_POD_CANCELLATION_RISK',
      entityId: `${String(atRisk._id)}:1`,
      name: 'Meera Iyer',
      params: [
        'Meera Iyer',
        'Sunday Smash',
        `DATE(${date})`,
        `TIME(${date})`,
        'Asha Rao',
        '₹800',
        '3 more bookings',
        `AT(${cancelAt.toISOString()})`,
        `https://partners.example.com/club-admin/clubs/${String(world.club)}/pods/${String(atRisk._id)}`,
      ],
      vars,
    });
    // The admin with no account is still addressed, by the fallback name.
    expect(inputs[2]).toMatchObject({ event: 'CLUB_ADMIN_POD_CANCELLATION_RISK', name: 'there', user: undefined });
    expect(locale).toHaveBeenCalledWith('host@example.com');
    expect(locale).toHaveBeenCalledTimes(1);
    expect(logInfo).toHaveBeenCalledWith('pod-cancel-risk', 'alert', expect.objectContaining({ round: 1, recipients: 3, shortfall: 800 }));
  });

  it('alerts again only once the Pod Settings interval has passed', async () => {
    const world = await seedWorld();
    const atRisk = await seedPod(world);
    collectedByPod.set(String(atRisk._id), 200);

    await runPodCancellationRiskSweep();
    await expect(runPodCancellationRiskSweep()).resolves.toEqual({ flagged: 1, alerted: 0 });
    expect(notify).toHaveBeenCalledTimes(1);
    expect((await riskOf(atRisk._id)).alert_count).toBe(1);

    await PodModel.collection.updateOne(
      { _id: atRisk._id },
      { $set: { 'cancellation_risk.alerted_at': new Date(Date.now() - 13 * HOUR) } }
    );
    await expect(runPodCancellationRiskSweep()).resolves.toEqual({ flagged: 1, alerted: 1 });
    expect((await riskOf(atRisk._id)).alert_count).toBe(2);
    expect(notify.mock.calls[1][0][0].entityId).toBe(`${String(atRisk._id)}:2`);
  });

  it('says bookings cannot cover it, and prints a bare seat count, for an unlimited free-ticket pod', async () => {
    const world = await seedWorld();
    const p = await seedPod(world, { pod_amount: 0, no_of_spots: 0 });
    linkOf.mockReturnValue(null);

    await expect(runPodCancellationRiskSweep()).resolves.toEqual({ flagged: 1, alerted: 1 });

    const [host] = notify.mock.calls[0][0];
    expect(host.params[5]).toBe('Bookings alone cannot cover it');
    expect(host.params[7]).toBe('');
    expect(host.vars.spots).toBe('2');
    expect((await riskOf(p._id)).spots_needed).toBeNull();
  });

  it('clears every flag this pass did not confirm, and skips what is not in scope', async () => {
    const world = await seedWorld();
    const healthy = await seedPod(world);
    collectedByPod.set(String(healthy._id), 5000);
    const far = await seedPod(world, { pod_date_time: inHours(100) });
    const noVenue = await seedPod(world, { venue_id: null });
    const stale = { at_risk: true, evaluated_at: new Date(), shortfall: 10, spots_needed: 1, alerted_at: null, alert_count: 0 };
    for (const p of [healthy, far, noVenue]) {
      await PodModel.collection.updateOne({ _id: p._id }, { $set: { cancellation_risk: stale } });
    }

    await expect(runPodCancellationRiskSweep()).resolves.toEqual({ flagged: 0, alerted: 0 });

    for (const p of [healthy, far, noVenue]) {
      expect(await riskOf(p._id)).toBeUndefined();
    }
    expect(notify).not.toHaveBeenCalled();
    // Only the in-window pod with a venue was ever evaluated.
    expect(venueCost).toHaveBeenCalledTimes(1);
  });

  it('evaluates nothing while auto-cancel is off, and clears flags even on cancelled pods', async () => {
    const world = await seedWorld();
    const cancelled = await seedPod(world, { deleted_at: new Date() });
    const live = await seedPod(world);
    const stale = { at_risk: true, evaluated_at: new Date(), shortfall: 10, spots_needed: 1, alerted_at: null, alert_count: 0 };
    for (const p of [cancelled, live]) {
      await PodModel.collection.updateOne({ _id: p._id }, { $set: { cancellation_risk: stale } });
    }
    autoCancel.mockResolvedValue({ ...SETTINGS, enabled: false });

    await expect(runPodCancellationRiskSweep()).resolves.toEqual({ flagged: 0, alerted: 0 });

    expect(venueCost).not.toHaveBeenCalled();
    expect(await riskOf(cancelled._id)).toBeUndefined();
    expect(await riskOf(live._id)).toBeUndefined();
  });

  it('logs one pod failing and still sweeps the rest', async () => {
    const world = await seedWorld();
    const broken = await seedPod(world, { pod_date_time: inHours(10) });
    const fine = await seedPod(world, { pod_date_time: inHours(20) });
    collectedByPod.set(String(fine._id), 200);
    const error = new Error('payments read failed');
    collected.mockImplementation(async (podId: unknown) => {
      if (String(podId) === String(broken._id)) throw error;
      return collectedByPod.get(String(podId)) ?? 0;
    });

    await expect(runPodCancellationRiskSweep()).resolves.toEqual({ flagged: 1, alerted: 1 });

    expect(logError).toHaveBeenCalledWith('pod-cancel-risk', 'assess', {
      error,
      pod_id: String(broken._id),
      msg: 'cancellation-risk evaluation failed',
    });
    expect(await riskOf(broken._id)).toBeNull();
    expect((await riskOf(fine._id)).at_risk).toBe(true);
  });
});
