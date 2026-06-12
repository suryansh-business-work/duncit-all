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
