import { Types } from 'mongoose';
import { badgeService } from '../../badge.service';
import { BadgeModel, UserBadgeModel } from '../../badge.model';
import { DEFAULT_BADGES } from '../../badge.seed';
import { TicketModel } from '@modules/pods/ticket/ticket.model';
import { UserModel } from '@modules/access/user/user.model';

const userId = () => new Types.ObjectId().toString();

/** A ticket the host marked present — what the platform counts as attendance. */
async function attend(uid: string, over: { seats?: number; at?: Date } = {}) {
  const podId = new Types.ObjectId();
  await TicketModel.create({
    ticket_code: `T-${podId.toString()}`,
    membership_id: new Types.ObjectId(),
    pod_id: podId,
    user_id: new Types.ObjectId(uid),
    status: 'CHECKED_IN',
    seats: over.seats ?? 1,
    checked_in_at: over.at ?? new Date('2026-03-14T10:00:00.000Z'),
    snapshot: {},
  });
  return podId;
}

const progressFor = async (uid: string, badgeDocId: string) => {
  const rows = await badgeService.progressForUser(uid);
  return rows.find((row) => row.badge.id === badgeDocId);
};

describe('badge progress', () => {
  it('counts attendance, not bookings, toward an attendance badge', async () => {
    const uid = userId();
    const badge = await badgeService.create({
      title: 'Legend',
      condition_type: 'POD_ATTEND_COUNT',
      threshold: 3,
    });

    // Nothing attended yet: the badge is listed, locked, with its goal intact.
    const locked = await progressFor(uid, badge.id);
    expect(locked).toMatchObject({ current: 0, target: 3, achieved: false, achieved_at: null });

    await attend(uid);
    await attend(uid);
    expect((await progressFor(uid, badge.id))?.achieved).toBe(false);

    await attend(uid);
    const earned = await progressFor(uid, badge.id);
    expect(earned?.achieved).toBe(true);
    expect(earned?.current).toBe(3);
    expect(earned?.achieved_at).toBeTruthy();
  });

  // The date a badge was earned cannot be recovered by a later recount, so it
  // is written once and never moved.
  it('keeps the day a badge was first earned when the count keeps rising', async () => {
    const uid = userId();
    const badge = await badgeService.create({
      title: 'Legend',
      condition_type: 'POD_ATTEND_COUNT',
      threshold: 1,
    });
    await attend(uid);
    const first = await progressFor(uid, badge.id);

    await attend(uid);
    const later = await progressFor(uid, badge.id);
    expect(later?.current).toBe(2);
    expect(later?.achieved_at).toBe(first?.achieved_at);
    expect(await UserBadgeModel.countDocuments({ user_id: new Types.ObjectId(uid) })).toBe(1);
  });

  it('counts only the pods a member brought a +1 to', async () => {
    const uid = userId();
    const badge = await badgeService.create({
      title: 'Social Spark',
      condition_type: 'PLUS_ONE_POD_COUNT',
      threshold: 2,
    });
    await attend(uid, { seats: 1 });
    await attend(uid, { seats: 3 });
    expect((await progressFor(uid, badge.id))?.current).toBe(1);

    await attend(uid, { seats: 2 });
    expect((await progressFor(uid, badge.id))?.achieved).toBe(true);
  });

  it('takes the busiest single month for the monthly badge', async () => {
    const uid = userId();
    const badge = await badgeService.create({
      title: 'Monthly Maverick',
      condition_type: 'MONTHLY_POD_ATTEND_COUNT',
      threshold: 2,
    });
    // One in January, two in March — spread across months it is never enough,
    // the busiest month is what counts.
    await attend(uid, { at: new Date('2026-01-10T10:00:00.000Z') });
    await attend(uid, { at: new Date('2026-03-10T10:00:00.000Z') });
    expect((await progressFor(uid, badge.id))?.achieved).toBe(false);

    await attend(uid, { at: new Date('2026-03-20T10:00:00.000Z') });
    const earned = await progressFor(uid, badge.id);
    expect(earned?.current).toBe(2);
    expect(earned?.achieved).toBe(true);
  });

  it('unlocks a partner badge on the role, and only that role', async () => {
    const host = await UserModel.create({
      auth: { email: `badge-host-${Date.now()}@duncit.com` },
      profile: { first_name: 'Badge', last_name: 'Host' },
      metadata: { role_keys: ['USER', 'HOST'] },
    });
    const badge = await badgeService.create({
      title: 'Duncit Host Partner',
      condition_type: 'ROLE_GRANTED',
      role_key: 'HOST',
    });
    expect((await progressFor(String(host._id), badge.id))?.achieved).toBe(true);
    expect((await progressFor(userId(), badge.id))?.achieved).toBe(false);
  });

  // An unlinked category badge means nobody qualifies — never everybody.
  it('awards nothing for a category badge with no category picked', async () => {
    const uid = userId();
    const badge = await badgeService.create({
      title: 'Pack Champion',
      condition_type: 'CATEGORY_POD_ATTEND_COUNT',
      threshold: 1,
    });
    await attend(uid);
    expect((await progressFor(uid, badge.id))?.achieved).toBe(false);
  });

  it('seeds the shipped catalogue once and never overwrites an edit', async () => {
    await badgeService.seedDefaults();
    expect(await BadgeModel.countDocuments()).toBe(DEFAULT_BADGES.length);

    const legend = await BadgeModel.findOne({ badge_id: 'legend' });
    await badgeService.update(String(legend!._id), { title: 'Duncit Legend', threshold: 25 });

    await badgeService.seedDefaults();
    expect(await BadgeModel.countDocuments()).toBe(DEFAULT_BADGES.length);
    const after = await BadgeModel.findOne({ badge_id: 'legend' });
    expect(after?.title).toBe('Duncit Legend');
    expect(after?.threshold).toBe(25);
  });
});
