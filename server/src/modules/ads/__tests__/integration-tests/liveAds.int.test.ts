import { Types } from 'mongoose';
import { adsService } from '../../ads.service';
import { AdRequestModel } from '../../ads.model';

let seq = 0;
const days = (n: number) => n * 86_400_000;

const seedAd = (over: Record<string, any> = {}) => {
  seq += 1;
  const start = over.start_at ?? new Date(Date.now() - days(1));
  return AdRequestModel.create({
    trace_id: `AD-${seq}`,
    ad_kind: 'PLACEMENT',
    ad_title: `Ad ${seq}`,
    ad_description: 'A description',
    ad_type: 'IMAGE',
    media_url: 'https://cdn/i.png',
    position: 'HOME_BOTTOM',
    start_at: start,
    duration_days: 7,
    end_at: over.end_at ?? new Date(Date.now() + days(6)),
    status: 'APPROVED',
    estimated_cost: 700,
    submitted_by: new Types.ObjectId(),
    submitted_by_name: 'Advertiser',
    ...over,
  });
};

/**
 * Stopping a live ad closes its date window rather than writing a status:
 * LIVE and EXPIRED are derived from that window, and activeAds filters on the
 * same one, so closing it is what actually takes the ad off the slots.
 */
describe('adsService.stop', () => {
  it('ends a live ad now, so it derives as expired', async () => {
    const ad = await seedAd();
    const stopped = await adsService.stop(String(ad._id));

    expect(stopped.status).toBe('EXPIRED');
    const reread = await AdRequestModel.findById(ad._id);
    expect(reread!.end_at.getTime()).toBeLessThanOrEqual(Date.now());
    // The record survives for the billing trail.
    expect(reread!.approved_cost ?? reread!.estimated_cost).toBeTruthy();
  });

  it('stops an approved ad that has not started yet', async () => {
    const ad = await seedAd({
      start_at: new Date(Date.now() + days(2)),
      end_at: new Date(Date.now() + days(9)),
    });
    const stopped = await adsService.stop(String(ad._id));
    expect(stopped.status).toBe('EXPIRED');
  });

  it('refuses an ad that already ended', async () => {
    const ad = await seedAd({
      start_at: new Date(Date.now() - days(9)),
      end_at: new Date(Date.now() - days(2)),
    });
    await expect(adsService.stop(String(ad._id))).rejects.toThrow(/already ended/i);
  });

  it('refuses an ad that was never approved', async () => {
    const ad = await seedAd({ status: 'PENDING' });
    await expect(adsService.stop(String(ad._id))).rejects.toThrow(/approved ad can be stopped/i);
  });

  it('reports a missing or malformed id', async () => {
    await expect(adsService.stop('not-an-id')).rejects.toThrow(/not found/i);
    await expect(adsService.stop(new Types.ObjectId().toString())).rejects.toThrow(/not found/i);
  });
});

describe('adsService.remove', () => {
  it('deletes the request', async () => {
    const ad = await seedAd();
    expect(await adsService.remove(String(ad._id))).toBe(true);
    expect(await AdRequestModel.findById(ad._id)).toBeNull();
  });

  it('reports a missing or malformed id', async () => {
    await expect(adsService.remove('not-an-id')).rejects.toThrow(/not found/i);
    await expect(adsService.remove(new Types.ObjectId().toString())).rejects.toThrow(/not found/i);
  });
});

describe('adsService.liveTable', () => {
  it('lists only ads inside their window right now', async () => {
    await seedAd({ trace_id: 'AD-live', ad_title: 'Showing now' });
    await seedAd({
      trace_id: 'AD-future',
      ad_title: 'Not started',
      start_at: new Date(Date.now() + days(2)),
      end_at: new Date(Date.now() + days(9)),
    });
    await seedAd({
      trace_id: 'AD-past',
      ad_title: 'Already ended',
      start_at: new Date(Date.now() - days(9)),
      end_at: new Date(Date.now() - days(2)),
    });
    await seedAd({ trace_id: 'AD-pending', ad_title: 'Awaiting review', status: 'PENDING' });

    const page = await adsService.liveTable();
    expect(page.rows.map((r) => r.ad_title)).toEqual(['Showing now']);
    expect(page.total).toBe(1);
    expect(page.rows[0].status).toBe('LIVE');
  });

  it('drops an ad the moment it is stopped', async () => {
    const ad = await seedAd({ ad_title: 'Showing now' });
    expect((await adsService.liveTable()).total).toBe(1);

    await adsService.stop(String(ad._id));
    expect((await adsService.liveTable()).total).toBe(0);
  });

  it('still searches and pages within the live set', async () => {
    await seedAd({ ad_title: 'Diwali banner' });
    await seedAd({ ad_title: 'Holi banner' });

    const searched = await adsService.liveTable({ search: 'Diwali' });
    expect(searched.rows.map((r) => r.ad_title)).toEqual(['Diwali banner']);

    const paged = await adsService.liveTable({ page: 1, page_size: 1 });
    expect(paged.rows).toHaveLength(1);
    expect(paged.total).toBe(2);
  });
});
