/**
 * The Pod promotions gate: all of marketing reads, editors may preview and
 * make banners (nothing is posted), and only managers change the settings or
 * promote, re-render and cancel. The service is faked; only the gate and what
 * it hands the service are under test.
 */
jest.mock('@modules/crm/marketing/podPromo/podPromo.service', () => ({
  podPromoService: {
    settings: jest.fn(),
    saveSettings: jest.fn(),
    table: jest.fn(),
    get: jest.fn(),
    summary: jest.fn(),
    candidates: jest.fn(),
    preview: jest.fn(),
    generateBanners: jest.fn(),
    regenerateSlide: jest.fn(),
    promote: jest.fn(),
    regenerate: jest.fn(),
    cancel: jest.fn(),
  },
}));

import { makeContext } from '@test/harness';
import { podPromoService } from '../../podPromo.service';
import { podPromoResolvers } from '../../podPromo.resolver';

const svc = podPromoService as unknown as Record<string, jest.Mock>;
const Q = podPromoResolvers.Query;
const M = podPromoResolvers.Mutation;
const as = (role: string) => makeContext({ roles: [role] });

beforeEach(() => {
  for (const fn of Object.values(svc)) fn.mockReset().mockResolvedValue({ id: 'x' });
});

describe('reading', () => {
  it.each(['SUPER_ADMIN', 'CITY_ADMIN', 'MARKETING_MANAGER', 'MARKETING_EDITOR', 'MARKETING_READER'])('lets %s read every list', async (role) => {
    await Q.podPromoSettings(null, {}, as(role));
    await Q.podPromosTable(null, { query: { page: 1 } }, as(role));
    await Q.podPromo(null, { id: 'p1' }, as(role));
    await Q.podPromoSummary(null, {}, as(role));
    await Q.podPromoCandidates(null, { search: 'run' }, as(role));
    expect(svc.get).toHaveBeenCalledWith('p1');
    expect(svc.candidates).toHaveBeenCalledWith('run');
  });

  it('turns away someone outside marketing', () => {
    expect(() => Q.podPromosTable(null, {}, as('USER'))).toThrow('Access Denied');
    expect(svc.table).not.toHaveBeenCalled();
  });
});

describe('making banners', () => {
  it('lets an editor preview and make banners, filed under them', async () => {
    const ctx = as('MARKETING_EDITOR');
    await M.previewPodPromo(null, { pod_id: 'pod1', style: 'SPORT_NIGHT' }, ctx);
    await M.generatePodBanners(null, { pod_id: 'pod1', size: 'SQUARE' }, ctx);
    await M.regeneratePodBannerSlide(null, { pod_id: 'pod1', kind: 'COVER' }, ctx);
    expect(svc.preview).toHaveBeenCalledWith({ pod_id: 'pod1', style: 'SPORT_NIGHT' }, expect.objectContaining({ id: ctx.user?.id }));
    expect(svc.generateBanners).toHaveBeenCalledTimes(1);
    expect(svc.regenerateSlide).toHaveBeenCalledWith({ pod_id: 'pod1', kind: 'COVER' }, expect.anything());
  });

  it('refuses a reader', () => {
    expect(() => M.generatePodBanners(null, { pod_id: 'pod1' }, as('MARKETING_READER'))).toThrow('Access Denied');
  });
});

describe('acting on the accounts', () => {
  it('lets a manager save settings, promote, schedule, re-render and cancel', async () => {
    const ctx = as('MARKETING_MANAGER');
    await M.updatePodPromoSettings(null, { input: { enabled: true } }, ctx);
    await M.createPodPromo(null, { pod_id: 'pod1' }, ctx);
    await M.schedulePodPromo(null, { pod_id: 'pod1', collaborators: ['blue.cafe'] }, ctx);
    await M.regeneratePodPromoBanner(null, { id: 'p1', style: null }, ctx);
    await M.cancelPodPromo(null, { id: 'p1' }, ctx);
    expect(svc.saveSettings).toHaveBeenCalledWith({ enabled: true }, ctx.user?.id);
    expect(svc.promote).toHaveBeenNthCalledWith(1, { pod_id: 'pod1' }, expect.anything());
    expect(svc.promote).toHaveBeenNthCalledWith(2, { pod_id: 'pod1', collaborators: ['blue.cafe'] }, expect.anything());
    expect(svc.regenerate).toHaveBeenCalledWith('p1', null, expect.anything());
    expect(svc.cancel).toHaveBeenCalledWith('p1');
  });

  it.each(['MARKETING_EDITOR', 'MARKETING_READER', 'CITY_ADMIN'])('refuses %s anything that posts or changes settings', (role) => {
    const ctx = as(role);
    expect(() => M.updatePodPromoSettings(null, { input: {} }, ctx)).toThrow('Access Denied');
    expect(() => M.createPodPromo(null, { pod_id: 'pod1' }, ctx)).toThrow('Access Denied');
    expect(() => M.schedulePodPromo(null, { pod_id: 'pod1' }, ctx)).toThrow('Access Denied');
    expect(() => M.cancelPodPromo(null, { id: 'p1' }, ctx)).toThrow('Access Denied');
    expect(svc.promote).not.toHaveBeenCalled();
  });
});
