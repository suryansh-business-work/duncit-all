/**
 * A person's dashboard arrangement, against a real database: saved per person
 * and per dashboard, clamped because it comes from a browser, reset to the
 * defaults by deleting it, and refused for a blank dashboard or an absurd size.
 */
import { Types } from 'mongoose';
import { makeContext } from '@test/harness';
import { DashboardLayoutModel } from '../../dashboardLayout.model';
import { dashboardLayoutResolvers } from '../../dashboardLayout.resolver';
import { dashboardLayoutService } from '../../dashboardLayout.service';

const Q = dashboardLayoutResolvers.Query as Record<string, (...a: any[]) => any>;
const M = dashboardLayoutResolvers.Mutation as Record<string, (...a: any[]) => any>;
const me = makeContext({ id: new Types.ObjectId().toString(), roles: ['USER'] });
const you = makeContext({ id: new Types.ObjectId().toString(), roles: ['USER'] });
const item = (widget_id: string, over: Record<string, number> = {}) => ({ widget_id, x: 0, y: 0, w: 4, h: 2, ...over });

describe('saving and reading', () => {
  it('has nothing for a dashboard that was never arranged', async () => {
    await expect(Q.myDashboardLayout({}, { dashboard_id: 'admin.overview' }, me)).resolves.toBeNull();
  });

  it('saves the arrangement, replaces it on the next save, and keeps people and dashboards apart', async () => {
    const saved = await M.saveDashboardLayout({}, { dashboard_id: 'admin.overview', items: [item('a'), item('b', { x: 4 })] }, me);
    expect(saved).toMatchObject({ dashboard_id: 'admin.overview', items: [item('a'), item('b', { x: 4 })] });
    expect(saved.updated_at).toEqual(expect.any(String));
    await M.saveDashboardLayout({}, { dashboard_id: 'admin.overview', items: [item('c')] }, me);
    await M.saveDashboardLayout({}, { dashboard_id: 'support.home', items: [item('z')] }, me);
    await M.saveDashboardLayout({}, { dashboard_id: 'admin.overview', items: [item('y')] }, you);
    expect((await Q.myDashboardLayout({}, { dashboard_id: 'admin.overview' }, me)).items.map((i: { widget_id: string }) => i.widget_id)).toEqual(['c']);
    expect((await Q.myDashboardLayout({}, { dashboard_id: 'admin.overview' }, you)).items.map((i: { widget_id: string }) => i.widget_id)).toEqual(['y']);
    expect(await DashboardLayoutModel.countDocuments()).toBe(3);
  });

  it('trims the dashboard id it is saved and read under', async () => {
    await M.saveDashboardLayout({}, { dashboard_id: '  admin.overview  ', items: [item('a')] }, me);
    expect((await Q.myDashboardLayout({}, { dashboard_id: 'admin.overview' }, me)).dashboard_id).toBe('admin.overview');
  });
});

describe('what a browser sends is clamped, not trusted', () => {
  it('rounds and bounds positions to the 12-column grid and drops a widget it has already placed or that has no id', async () => {
    const saved = await dashboardLayoutService.save(me.user!.id, 'd', [
      item('wide', { w: 99, x: 50, y: 5000, h: 5000 }),
      item('small', { w: 0, x: -3, y: -1, h: 0 }),
      item('fractional', { w: 3.6, x: 2.4, y: 1.5, h: 2.2 }),
      item('wide', { x: 1 }),
      item('   '),
    ]);
    expect(saved.items).toEqual([
      { widget_id: 'wide', x: 0, y: 1000, w: 12, h: 1000 },
      { widget_id: 'small', x: 0, y: 0, w: 1, h: 1 },
      { widget_id: 'fractional', x: 2, y: 2, w: 4, h: 2 },
    ]);
  });

  it('refuses more widgets than a dashboard could hold', async () => {
    const tooMany = Array.from({ length: 201 }, (_, i) => item(`w${i}`));
    await expect(dashboardLayoutService.save(me.user!.id, 'd', tooMany)).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' }, message: expect.stringContaining('200') });
    const atLimit = Array.from({ length: 200 }, (_, i) => item(`w${i}`));
    await expect(dashboardLayoutService.save(me.user!.id, 'd', atLimit)).resolves.toBeDefined();
  });

  it('refuses a blank dashboard id everywhere', async () => {
    const blank = { extensions: { code: 'BAD_USER_INPUT' }, message: 'dashboard_id is required' };
    await expect(dashboardLayoutService.myLayout(me.user!.id, '  ')).rejects.toMatchObject(blank);
    await expect(dashboardLayoutService.save(me.user!.id, '', [])).rejects.toMatchObject(blank);
    await expect(dashboardLayoutService.reset(me.user!.id, ' ')).rejects.toMatchObject(blank);
  });
});

describe('reset', () => {
  it('deletes only the caller’s arrangement of that dashboard, and says true whether or not one existed', async () => {
    await M.saveDashboardLayout({}, { dashboard_id: 'd', items: [item('a')] }, me);
    await M.saveDashboardLayout({}, { dashboard_id: 'd', items: [item('b')] }, you);
    await expect(M.resetDashboardLayout({}, { dashboard_id: 'd' }, me)).resolves.toBe(true);
    await expect(M.resetDashboardLayout({}, { dashboard_id: 'd' }, me)).resolves.toBe(true);
    await expect(Q.myDashboardLayout({}, { dashboard_id: 'd' }, me)).resolves.toBeNull();
    expect(await Q.myDashboardLayout({}, { dashboard_id: 'd' }, you)).not.toBeNull();
  });
});

describe('who may use it', () => {
  it('needs a signed-in account for every operation', async () => {
    const anon = makeContext(null);
    await expect(Q.myDashboardLayout({}, { dashboard_id: 'd' }, anon)).rejects.toBeDefined();
    await expect(M.saveDashboardLayout({}, { dashboard_id: 'd', items: [] }, anon)).rejects.toBeDefined();
    await expect(M.resetDashboardLayout({}, { dashboard_id: 'd' }, anon)).rejects.toBeDefined();
  });
});
