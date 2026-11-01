/**
 * The parts of pod promotions that live in the database: one promotion per
 * pod however many workers race for it, which rows may be picked up again,
 * the settings' validation, the figures read from the tracking link, and the
 * verdict on a pod that should no longer be promoted.
 */
import { Types } from 'mongoose';
import { PodPromoModel } from '../../podPromo.model';
import { claimPromo, MAX_AUTO_ATTEMPTS, releasePromo } from '../../podPromo.claim';
import { loadPromoSettings, savePromoSettings } from '../../podPromo.settings';
import { figuresFor } from '../../podPromo.figures';
import { goneReason } from '../../podPromo.sync';
import { ShortLinkClickModel } from '../../../shortLinkClick.model';
import { PodMemberModel } from '@modules/pods/podMember/podMember.model';

const NOW = new Date('2026-11-10T00:00:00.000Z');
const claim = (podId: Types.ObjectId, over: Partial<Parameters<typeof claimPromo>[0]> = {}) =>
  claimPromo({ podId, podStart: new Date('2026-11-14T13:30:00.000Z'), style: 'FESTIVE_BOLD', source: 'AUTO', now: NOW, restart: false, userId: null, ...over });

/** A claim that must succeed, for tests that go on to work with the row. */
async function held(podId: Types.ObjectId) {
  const row = await claim(podId);
  if (!row) throw new Error('expected to hold the row');
  return row;
}

beforeEach(async () => {
  await Promise.all([PodPromoModel.deleteMany({}), ShortLinkClickModel.deleteMany({}), PodMemberModel.deleteMany({})]);
});

describe('claimPromo', () => {
  it('gives the pod to exactly one of two racing workers', async () => {
    const podId = new Types.ObjectId();
    const [a, b] = await Promise.all([claim(podId), claim(podId)]);
    expect([a, b].filter(Boolean)).toHaveLength(1);
    expect(await PodPromoModel.countDocuments({ pod_id: podId })).toBe(1);
  });

  it('does not let a second tick take a row that is still held, but resumes one whose lock ran out', async () => {
    const podId = new Types.ObjectId();
    expect(await claim(podId)).not.toBeNull();
    expect(await claim(podId)).toBeNull();
    expect(await claim(podId, { now: new Date(NOW.getTime() + 11 * 60_000) })).not.toBeNull();
  });

  it('never resumes a scheduled promotion on its own, and retries a failure without a post only a few times', async () => {
    const podId = new Types.ObjectId();
    const row = await held(podId);
    await releasePromo(row._id, { status: 'SCHEDULED' });
    expect(await claim(podId)).toBeNull();
    await releasePromo(row._id, { status: 'FAILED', attempts: MAX_AUTO_ATTEMPTS - 1 });
    expect(await claim(podId)).not.toBeNull();
    await releasePromo(row._id, { status: 'FAILED', attempts: MAX_AUTO_ATTEMPTS });
    expect(await claim(podId)).toBeNull();
  });

  it('lets a person start a cancelled promotion again, wiped clean', async () => {
    const podId = new Types.ObjectId();
    const row = await held(podId);
    await releasePromo(row._id, { status: 'CANCELLED', caption: 'old', error: 'gone' });
    expect(await claim(podId)).toBeNull();
    const again = await claim(podId, { restart: true, source: 'MANUAL' });
    expect(again).toMatchObject({ status: 'PLANNED', source: 'MANUAL', caption: '', error: '' });
  });
});

describe('settings', () => {
  const valid = {
    enabled: false,
    days_before: 3,
    post_hour: 18,
    account_ids: [],
    needs_approval: true,
    city_ids: [],
    club_ids: [],
    category_ids: [],
    price_filter: 'ALL',
    min_days_until_start: 1,
    banner_style: 'PORTRAIT',
    cta_text: '',
    utm_prefix: 'Diwali-Promo',
  };
  const user = new Types.ObjectId().toHexString();

  it('starts with safe defaults: off, three days ahead at 6 pm, waiting for approval', async () => {
    expect(await loadPromoSettings()).toMatchObject({ enabled: false, days_before: 3, post_hour: 18, needs_approval: true, banner_style: 'PORTRAIT' });
  });

  it('saves valid settings, lowercasing the UTM prefix', async () => {
    expect(await savePromoSettings(valid, user)).toMatchObject({ utm_prefix: 'diwali-promo', days_before: 3 });
  });

  it.each([
    [{ days_before: 0 }, 'days_before'],
    [{ post_hour: 24 }, 'post_hour'],
    [{ utm_prefix: 'no spaces' }, 'utm_prefix'],
    [{ cta_text: 'x'.repeat(41) }, 'cta_text'],
    [{ enabled: true, account_ids: [] }, 'account_ids'],
    [{ city_ids: ['not-an-id'] }, 'city_ids'],
  ])('refuses %p', async (change, field) => {
    await expect(savePromoSettings({ ...valid, ...change }, user)).rejects.toThrow(field);
  });
});

describe('figuresFor', () => {
  it('counts clicks, visitors, steps, bookings after the click, and attributed payments', async () => {
    const podId = new Types.ObjectId();
    const linkId = new Types.ObjectId();
    const booker = new Types.ObjectId();
    const early = new Types.ObjectId();
    const click = (over: Record<string, unknown>) => ({
      click_id: new Types.ObjectId().toHexString(),
      code: 'aB3xY9Zq',
      short_link_id: linkId,
      clicked_at: new Date('2026-11-05T10:00:00.000Z'),
      platform: 'INSTAGRAM',
      device_type: 'MOBILE',
      os: 'iOS',
      browser: 'Safari',
      ...over,
    });
    await ShortLinkClickModel.create([
      click({ ip_hash: 'h1', user_id: booker, journey: [{ step: 'SIGNED_UP', at: NOW }, { step: 'VIEWED_POD', at: NOW }, { step: 'PAID', at: NOW }], conversions: [{ payment_id: new Types.ObjectId(), amount: 499, at: NOW }], converted_amount: 499 }),
      click({ ip_hash: 'h1' }),
      click({ ip_hash: 'h2', user_id: early, journey: [{ step: 'VIEWED_POD', at: NOW }] }),
      click({ ip_hash: null }),
    ]);
    await PodMemberModel.create([
      { pod_id: podId, user_id: booker, status: 'JOINED', joined_at: new Date('2026-11-05T11:00:00.000Z'), payment_id: new Types.ObjectId() },
      // Booked before ever clicking: not credited to the promotion.
      { pod_id: podId, user_id: early, status: 'JOINED', joined_at: new Date('2026-11-01T11:00:00.000Z') },
    ]);
    const figures = await figuresFor({ pod_id: podId, short_link_id: linkId, scheduled_post_id: null }, NOW);
    expect(figures).toMatchObject({ clicks: 4, unique_visitors: 3, signups: 1, pod_views: 2, checkouts: 0, bookings: 1, paid_bookings: 1, payments: 1, revenue: 499, likes: 0 });
    expect(figures.updated_at).toEqual(NOW);
  });

  it('reads zeros for a promotion with no link yet', async () => {
    expect(await figuresFor({ pod_id: new Types.ObjectId(), short_link_id: null })).toMatchObject({ clicks: 0, bookings: 0, revenue: 0 });
  });
});

describe('goneReason', () => {
  const live = { _id: new Types.ObjectId(), pod_date_time: NOW, is_active: true };
  it('keeps a live, visible pod', () => {
    expect(goneReason(live)).toBe('');
  });
  it.each([
    [null, 'cancelled'],
    [{ ...live, deleted_at: NOW }, 'cancelled'],
    [{ ...live, completed_at: NOW }, 'over'],
    [{ ...live, is_active: false }, 'no longer published'],
    [{ ...live, venue_approval_status: 'DECLINED' }, 'no longer published'],
    [{ ...live, hidden_by_club: true }, 'hidden'],
  ])('stops promoting %p', (pod, words) => {
    expect(goneReason(pod)).toContain(words);
  });
});
