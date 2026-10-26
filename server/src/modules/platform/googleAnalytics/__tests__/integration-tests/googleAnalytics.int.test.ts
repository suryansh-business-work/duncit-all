/**
 * The per-website Google Analytics tag, against a real database: what Tech
 * sees for every website, what a website is told to load (public), what a save
 * accepts and refuses, and who may change it.
 */
import { Types } from 'mongoose';
import { makeContext } from '@test/harness';
import { GoogleAnalyticsSiteModel, TRACKED_WEBSITES } from '../../googleAnalytics.model';
import { googleAnalyticsResolvers } from '../../googleAnalytics.resolver';
import { googleAnalyticsService as service } from '../../googleAnalytics.service';

const Q = googleAnalyticsResolvers.Query as Record<string, (...a: any[]) => any>;
const M = googleAnalyticsResolvers.Mutation as Record<string, (...a: any[]) => any>;
const tech = makeContext({ id: new Types.ObjectId().toString(), roles: ['TECH_MANAGER'] });
const outsider = makeContext({ id: new Types.ObjectId().toString(), roles: ['USER'] });

describe('list', () => {
  it('shows every website in order, untagged and off until one is saved', async () => {
    const rows = await service.list();
    expect(rows.map((r) => r.site)).toEqual([...TRACKED_WEBSITES]);
    expect(rows.every((r) => r.measurement_id === null && r.enabled === false && r.updated_at === null)).toBe(true);
  });

  it('shows a saved website’s tag, switch and time next to the untagged ones', async () => {
    await service.save({ site: 'ADS', measurement_id: 'G-ABC123XYZ', enabled: true }, 'u1');
    const rows = await service.list();
    expect(rows.find((r) => r.site === 'ADS')).toMatchObject({ measurement_id: 'G-ABC123XYZ', enabled: true, updated_at: expect.any(String) });
    expect(rows.find((r) => r.site === 'MAIN')).toMatchObject({ measurement_id: null, enabled: false });
  });
});

describe('save', () => {
  it('upper-cases and trims the id, updates in place on the next save and records who did it', async () => {
    await service.save({ site: 'MAIN', measurement_id: '  g-abc123xyz ', enabled: false }, 'u1');
    const second = await service.save({ site: 'MAIN', measurement_id: 'G-NEW456789', enabled: true }, 'u2');
    expect(second).toMatchObject({ site: 'MAIN', measurement_id: 'G-NEW456789', enabled: true });
    expect(await GoogleAnalyticsSiteModel.countDocuments()).toBe(1);
    expect((await GoogleAnalyticsSiteModel.findOne({ site: 'MAIN' }).lean())?.updated_by).toBe('u2');
  });

  it.each(['', 'UA-12345-1', 'G-123', 'G-lower_case!', 'G-TOOLONGTOOLONGTOOLONG'])('refuses %j as a measurement id', async (id) => {
    await expect(service.save({ site: 'MAIN', measurement_id: id, enabled: true }, 'u1')).rejects.toMatchObject({
      extensions: { code: 'BAD_USER_INPUT' }, message: 'Enter a GA4 measurement ID, like G-XXXXXXXXXX.',
    });
    expect(await GoogleAnalyticsSiteModel.countDocuments()).toBe(0);
  });
});

describe('tag', () => {
  it('gives a website its id only while it is switched on', async () => {
    await expect(service.tag('MAIN')).resolves.toBeNull();
    await service.save({ site: 'MAIN', measurement_id: 'G-ABC123XYZ', enabled: false }, 'u1');
    await expect(service.tag('MAIN')).resolves.toBeNull();
    await service.save({ site: 'MAIN', measurement_id: 'G-ABC123XYZ', enabled: true }, 'u1');
    await expect(service.tag('MAIN')).resolves.toBe('G-ABC123XYZ');
    await expect(service.tag('ADS')).resolves.toBeNull();
  });
});

describe('remove', () => {
  it('deletes a website’s tag and says whether there was one', async () => {
    await service.save({ site: 'MAIN', measurement_id: 'G-ABC123XYZ', enabled: true }, 'u1');
    await expect(service.remove('MAIN', 'u1')).resolves.toBe(true);
    await expect(service.remove('MAIN', 'u1')).resolves.toBe(false);
    await expect(service.tag('MAIN')).resolves.toBeNull();
  });
});

describe('the resolvers', () => {
  it('serve the tag publicly and everything else to Tech only', async () => {
    await M.saveGoogleAnalyticsSite({}, { input: { site: 'STATUS', measurement_id: 'G-STAT123456', enabled: true } }, tech);
    await expect(Q.googleAnalyticsTag({}, { site: 'STATUS' })).resolves.toBe('G-STAT123456');
    expect((await Q.googleAnalyticsSites({}, {}, tech)).find((r: { site: string }) => r.site === 'STATUS').measurement_id).toBe('G-STAT123456');
    await expect(M.deleteGoogleAnalyticsSite({}, { site: 'STATUS' }, tech)).resolves.toBe(true);
    expect(() => Q.googleAnalyticsSites({}, {}, outsider)).toThrow();
    expect(() => M.saveGoogleAnalyticsSite({}, { input: { site: 'STATUS', measurement_id: 'G-STAT123456', enabled: true } }, outsider)).toThrow();
    expect(() => M.deleteGoogleAnalyticsSite({}, { site: 'STATUS' }, makeContext(null))).toThrow();
  });
});
