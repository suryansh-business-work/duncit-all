import { Types } from 'mongoose';
import { referralService } from '../../referral.service';
import { ReferralModel } from '../../referral.model';

describe('referralService integration', () => {
  it('generates a stable code on first read and lists no redemptions', async () => {
    const userId = new Types.ObjectId().toString();
    const first = await referralService.myReferral(userId);
    expect(first.code).toMatch(/^DUN-[0-9A-F]{6}$/);
    expect(first.referred).toEqual([]);
    expect(first.referred_by_name).toBeNull();
    const second = await referralService.myReferral(userId);
    expect(second.code).toBe(first.code);
  });

  it('applies a code once, tracks who referred whom, and blocks re-use', async () => {
    const referrer = new Types.ObjectId().toString();
    const friend = new Types.ObjectId().toString();
    const { code } = await referralService.myReferral(referrer);

    const applied = await referralService.applyCode(friend, code.toLowerCase());
    expect(applied.referred_by_name).toBeNull(); // referrer has no profile doc here

    const mine = await referralService.myReferral(referrer);
    expect(mine.referred).toHaveLength(1);
    expect(mine.referred[0].user_id).toBe(friend);

    await expect(referralService.applyCode(friend, code)).rejects.toThrow(/already applied/i);
    expect(await ReferralModel.countDocuments({ referred_user_id: friend })).toBe(1);
  });

  it('rejects unknown, blank and self codes', async () => {
    const userId = new Types.ObjectId().toString();
    const { code } = await referralService.myReferral(userId);
    await expect(referralService.applyCode(userId, '')).rejects.toThrow(/enter a referral/i);
    await expect(referralService.applyCode(userId, 'DUN-NOPE')).rejects.toThrow(/does not exist/i);
    await expect(referralService.applyCode(userId, code)).rejects.toThrow(/your own code/i);
  });

  it('serves the referralsTable page with search, filter, sort and paging', async () => {
    const referrerA = new Types.ObjectId();
    const referrerB = new Types.ObjectId();
    await ReferralModel.create({ referrer_user_id: referrerA, referred_user_id: new Types.ObjectId(), code: 'DUN-AAAAAA' });
    await ReferralModel.create({ referrer_user_id: referrerA, referred_user_id: new Types.ObjectId(), code: 'DUN-AAAAAA' });
    await ReferralModel.create({ referrer_user_id: referrerB, referred_user_id: new Types.ObjectId(), code: 'DUN-BBBBBB' });

    // Plain envelope with the clamp defaults.
    const all = await referralService.table();
    expect(all.total).toBe(3);
    expect(all.page).toBe(1);
    expect(all.page_size).toBe(25);

    // Search matches the code.
    const searched = await referralService.table({ search: 'bbbbbb' });
    expect(searched.rows.map((r) => r.code)).toEqual(['DUN-BBBBBB']);
    expect(searched.total).toBe(1);

    // String filter narrows to one referrer's redemptions.
    const byReferrer = await referralService.table({
      filters: [{ field: 'referrer_user_id', op: 'eq', value: String(referrerA) }],
    });
    expect(byReferrer.total).toBe(2);
    expect(byReferrer.rows.every((r) => r.referrer_user_id === String(referrerA))).toBe(true);

    // Allowlisted sort, both directions.
    const asc = await referralService.table({ sort_by: 'code', sort_dir: 'asc' });
    expect(asc.rows[0].code).toBe('DUN-AAAAAA');
    expect(asc.rows[2].code).toBe('DUN-BBBBBB');

    // Paging keeps total and reports the clamped page/page_size back.
    const page3 = await referralService.table({ page: 3, page_size: 1, sort_by: 'code', sort_dir: 'asc' });
    expect(page3.rows.map((r) => r.code)).toEqual(['DUN-BBBBBB']);
    expect(page3.total).toBe(3);
    expect(page3.page).toBe(3);
    expect(page3.page_size).toBe(1);
  });

  it('admin can read the log and manage the gift', async () => {
    const referrer = new Types.ObjectId().toString();
    const friend = new Types.ObjectId().toString();
    const { code } = await referralService.myReferral(referrer);
    await referralService.applyCode(friend, code);

    const all = await referralService.listAll();
    expect(all.some((row) => row.referred_user_id === friend)).toBe(true);

    expect((await referralService.settings()).gift_description).toBe('');
    const updated = await referralService.updateGift('₹100 off your next pod');
    expect(updated.gift_description).toBe('₹100 off your next pod');
    const mine = await referralService.myReferral(referrer);
    expect(mine.gift_description).toBe('₹100 off your next pod');
  });
});
