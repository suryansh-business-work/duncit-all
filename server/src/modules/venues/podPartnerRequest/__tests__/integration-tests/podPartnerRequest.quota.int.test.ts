/**
 * The monthly Pod Request allowance: which cap applies (admin override, then
 * the partner's own rule, then the default), the atomic reservation up to the
 * cap, a cap of 0 refusing outright, the release a failed send gives back, and
 * the status the search screens show — counted for the current month only.
 */
import { Types } from 'mongoose';
import { appFormat } from '@utils/app-time';
import { HostModel } from '@modules/venues/host/host.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import {
  DEFAULT_MONTHLY_PARTNER_REQUESTS,
  PartnerRequestQuotaModel,
  monthlyLimit,
  quotaStatus,
  reserveMonthlyRequest,
} from '../../podPartnerRequest.quota';

const refusal = (limit: number) =>
  expect.objectContaining({ extensions: expect.objectContaining({ code: 'LIMIT_REACHED', limit }) });

async function seedVenue(rule?: number, override?: number | null) {
  const v = await VenueModel.create({
    owner_user_id: new Types.ObjectId(),
    ...(rule === undefined ? {} : { settings: { rules: { max_host_requests_per_month: rule } } }),
    ...(override === undefined ? {} : { host_requests_limit_override: override }),
  });
  return String(v._id);
}

async function seedHost(own?: number, override?: number | null) {
  const userId = new Types.ObjectId();
  await HostModel.create({
    user_id: userId,
    ...(own === undefined ? {} : { max_venue_requests_per_month: own }),
    ...(override === undefined ? {} : { venue_requests_limit_override: override }),
  });
  return String(userId);
}

// The cap at the boundary relies on the unique (owner, month) index existing.
beforeAll(async () => {
  await PartnerRequestQuotaModel.init();
});

describe('monthlyLimit', () => {
  it('reads a venue: override, else its own rule, else the default', async () => {
    expect(DEFAULT_MONTHLY_PARTNER_REQUESTS).toBe(10);
    expect(await monthlyLimit('VENUE', await seedVenue(4, 25))).toBe(25);
    expect(await monthlyLimit('VENUE', await seedVenue(4, null))).toBe(4);
    expect(await monthlyLimit('VENUE', await seedVenue())).toBe(10);
    expect(await monthlyLimit('VENUE', new Types.ObjectId().toString())).toBe(10);
  });

  it('keeps an override of 0 instead of falling through to the rule', async () => {
    expect(await monthlyLimit('VENUE', await seedVenue(4, 0))).toBe(0);
    expect(await monthlyLimit('HOST', await seedHost(7, 0))).toBe(0);
  });

  it('reads a host by user id: override, else their own cap, else the default', async () => {
    expect(await monthlyLimit('HOST', await seedHost(7, 30))).toBe(30);
    expect(await monthlyLimit('HOST', await seedHost(7))).toBe(7);
    expect(await monthlyLimit('HOST', await seedHost())).toBe(10);
    expect(await monthlyLimit('HOST', new Types.ObjectId().toString())).toBe(10);
  });
});

describe('reserveMonthlyRequest', () => {
  it('takes requests up to the cap, then refuses with the limit in the error', async () => {
    const venueId = await seedVenue(2);
    await reserveMonthlyRequest('VENUE', venueId);
    await reserveMonthlyRequest('VENUE', venueId);
    await expect(reserveMonthlyRequest('VENUE', venueId)).rejects.toEqual(refusal(2));
    await expect(reserveMonthlyRequest('VENUE', venueId)).rejects.toThrow('You have used all 2 requests for this month.');
    expect(await quotaStatus('VENUE', venueId)).toEqual({ limit: 2, used: 2, remaining: 0 });
  });

  it('refuses outright when the cap is 0, writing nothing', async () => {
    const hostId = await seedHost(0);
    await expect(reserveMonthlyRequest('HOST', hostId)).rejects.toEqual(refusal(0));
    expect(await PartnerRequestQuotaModel.countDocuments({})).toBe(0);
  });

  it('never lets two concurrent sends both take the last request', async () => {
    const hostId = await seedHost(1);
    const results = await Promise.allSettled([reserveMonthlyRequest('HOST', hostId), reserveMonthlyRequest('HOST', hostId)]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect((await quotaStatus('HOST', hostId)).used).toBe(1);
  });

  it('gives one request back on release, and never goes below zero', async () => {
    const hostId = await seedHost(3);
    const release = await reserveMonthlyRequest('HOST', hostId);
    expect((await quotaStatus('HOST', hostId)).used).toBe(1);
    await release();
    expect(await quotaStatus('HOST', hostId)).toEqual({ limit: 3, used: 0, remaining: 3 });
    await release();
    expect((await quotaStatus('HOST', hostId)).used).toBe(0);
  });

  it('surfaces a storage error that is not the cap collision as it is', async () => {
    const hostId = await seedHost(3);
    const failure = Object.assign(new Error('not primary'), { code: 10107 });
    const write = jest.spyOn(PartnerRequestQuotaModel, 'findOneAndUpdate').mockRejectedValueOnce(failure as never);
    await expect(reserveMonthlyRequest('HOST', hostId)).rejects.toBe(failure);
    write.mockRestore();
  });

  it('counts per owner: one venue at its cap does not block another', async () => {
    const full = await seedVenue(1);
    const other = await seedVenue(1);
    await reserveMonthlyRequest('VENUE', full);
    await expect(reserveMonthlyRequest('VENUE', other)).resolves.toEqual(expect.any(Function));
  });
});

describe('quotaStatus', () => {
  it('counts only the current month', async () => {
    const venueId = await seedVenue(5);
    await PartnerRequestQuotaModel.create({ owner_kind: 'VENUE', owner_id: venueId, month: '2000-01', count: 5 });
    expect(await quotaStatus('VENUE', venueId)).toEqual({ limit: 5, used: 0, remaining: 5 });
    await PartnerRequestQuotaModel.create({
      owner_kind: 'VENUE',
      owner_id: venueId,
      month: appFormat(new Date(), 'yyyy-MM'),
      count: 3,
    });
    expect(await quotaStatus('VENUE', venueId)).toEqual({ limit: 5, used: 3, remaining: 2 });
  });

  it('never reports a negative remainder after the cap was lowered below what was used', async () => {
    const hostId = await seedHost(5);
    for (let i = 0; i < 4; i += 1) await reserveMonthlyRequest('HOST', hostId);
    await HostModel.updateOne({ user_id: hostId }, { $set: { venue_requests_limit_override: 2 } });
    expect(await quotaStatus('HOST', hostId)).toEqual({ limit: 2, used: 4, remaining: 0 });
    await expect(reserveMonthlyRequest('HOST', hostId)).rejects.toEqual(refusal(2));
  });
});
