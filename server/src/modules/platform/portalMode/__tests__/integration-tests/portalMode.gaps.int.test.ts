/**
 * Portal modes and header features through the resolvers and service, against
 * a real database: what a portal's gate is told (failing open), what the
 * Admin table can flip one switch at a time, and who is recorded as having done
 * it.
 */
import { Types } from 'mongoose';
import { makeContext } from '@test/harness';
import { PortalModeModel } from '../../portalMode.model';
import { portalModeResolvers } from '../../portalMode.resolver';
import { portalModeService as service } from '../../portalMode.service';

// Listing seeds one row per registry entry, one upsert at a time.
jest.setTimeout(30_000);

const Q = portalModeResolvers.Query as Record<string, (...a: any[]) => any>;
const M = portalModeResolvers.Mutation as Record<string, (...a: any[]) => any>;
const techId = new Types.ObjectId().toString();
const tech = makeContext({ id: techId, roles: ['TECH_MANAGER'] });
const outsider = makeContext({ id: new Types.ObjectId().toString(), roles: ['USER'] });

describe('a portal row', () => {
  it('lists the registry with its public address, both header features on and no note', async () => {
    const rows = await service.list();
    const admin = rows.find((r) => r.key === 'admin');
    expect(admin).toMatchObject({ kind: 'PORTAL', mode: 'LIVE', chat_enabled: true, apps_enabled: true, note: '', url: 'https://admin.duncit.com/' });
    expect(admin?.updated_at).toEqual(expect.any(String));
  });

  it('has no address for a row whose key has left the registry', async () => {
    await PortalModeModel.create({ key: 'retired-portal', name: 'Retired' });
    const row = (await service.list()).find((r) => r.key === 'retired-portal');
    expect(row).toMatchObject({ url: null, mode: 'LIVE' });
  });
});

describe('what a portal’s gate is told', () => {
  it('reports the stored mode and features of a registered portal, trimming the key', async () => {
    await service.setMode('admin', 'MAINTENANCE', 'back at six', techId);
    await service.setAppFeatures('admin', { chat_enabled: false }, techId);
    await expect(service.getPublic('  admin ')).resolves.toEqual({ key: 'admin', mode: 'MAINTENANCE', chat_enabled: false, apps_enabled: true });
  });

  it('fails open for a row written before the mode and the features existed', async () => {
    await PortalModeModel.collection.insertOne({ key: 'legacy', name: 'Legacy' });
    await expect(service.getPublic('legacy')).resolves.toEqual({ key: 'legacy', mode: 'LIVE', chat_enabled: true, apps_enabled: true });
  });

  it('is public: the resolver answers with no sign-in at all', async () => {
    await expect(Q.portalMode({}, { key: 'nowhere' })).resolves.toEqual({ key: 'nowhere', mode: 'LIVE', chat_enabled: true, apps_enabled: true });
  });
});

describe('changing the mode', () => {
  it('records the note and who changed it, and clears the note when none is given', async () => {
    await service.setMode('admin', 'DEVELOPMENT', 'new build', techId);
    expect(await PortalModeModel.findOne({ key: 'admin' }).lean()).toMatchObject({ mode: 'DEVELOPMENT', note: 'new build' });
    expect(String((await PortalModeModel.findOne({ key: 'admin' }).lean())?.updated_by)).toBe(techId);
    const cleared = await service.setMode('admin', 'LIVE', null);
    expect(cleared).toMatchObject({ mode: 'LIVE', note: '' });
    expect((await PortalModeModel.findOne({ key: 'admin' }).lean())?.updated_by).toBeNull();
  });
});

describe('header features', () => {
  it('writes only the flag it is given and leaves the other as another tab set it', async () => {
    await service.setAppFeatures('tech', { chat_enabled: false, apps_enabled: false }, techId);
    const afterChat = await service.setAppFeatures('tech', { chat_enabled: true }, techId);
    expect(afterChat).toMatchObject({ chat_enabled: true, apps_enabled: false });
    const afterApps = await service.setAppFeatures('tech', { apps_enabled: true, chat_enabled: null }, null);
    expect(afterApps).toMatchObject({ chat_enabled: true, apps_enabled: true });
    expect((await PortalModeModel.findOne({ key: 'tech' }).lean())?.updated_by).toBeNull();
  });

  it('refuses a portal that is not in the registry', async () => {
    await expect(service.setAppFeatures('nowhere', { chat_enabled: false })).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' }, message: 'Unknown portal key' });
    expect(await PortalModeModel.countDocuments({ key: 'nowhere' })).toBe(0);
  });
});

describe('the resolvers', () => {
  it('record the signed-in user on every change and keep reads and writes to Tech', async () => {
    await M.setPortalMode({}, { key: 'admin', mode: 'MAINTENANCE', note: 'n' }, tech);
    await M.setPortalMode({}, { key: 'admin', mode: 'LIVE' }, tech);
    await M.setPortalAppFeatures({}, { key: 'admin', chat_enabled: false }, tech);
    expect(String((await PortalModeModel.findOne({ key: 'admin' }).lean())?.updated_by)).toBe(techId);
    expect((await Q.portalModes({}, {}, tech)).length).toBeGreaterThan(0);
    expect((await Q.portalModesTable({}, { query: { page: 1, page_size: 5 } }, tech)).rows).toHaveLength(5);
    await expect(M.setPortalAppFeatures({}, { key: 'admin', chat_enabled: true }, outsider)).rejects.toThrow(/access denied/i);
    await expect(Q.portalModesTable({}, {}, outsider)).rejects.toThrow(/access denied/i);
  });
});
