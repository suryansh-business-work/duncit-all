/**
 * The directory change log, against a real database: what a write to a region
 * leaves behind (through the real model hooks), who the entry names and how it
 * classifies them, the tables that read it back, and who may read a region's
 * history.
 */
import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { makeContext } from '@test/harness';
import { requestIdentity, type RequestIdentity } from '@observability/requestIdentity';
import { RegionModel } from '@modules/clubs/region/region.model';
import { UserModel } from '@modules/access/user/user.model';
import { EntityChangeLogModel } from '../../entityAudit.model';
import { entityActorType, entityAuditService as service } from '../../entityAudit.service';
import { entityAuditResolvers } from '../../entityAudit.resolver';

// The first write in a fresh database creates its collections and indexes.
jest.setTimeout(30_000);

const Q = entityAuditResolvers.Query as Record<string, (...a: any[]) => Promise<any>>;
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const as = (id: string, surface?: string): RequestIdentity => ({ user: { id }, surface });
const logsFor = (id: unknown) => EntityChangeLogModel.find({ entity_id: id }).sort({ created_at: 1, _id: 1 }).lean();

/** Waits for the fire-and-forget log writes to land. */
async function waitForLogs(id: unknown, count: number) {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const rows = await logsFor(id);
    if (rows.length >= count) return rows;
    await pause(20);
  }
  throw new Error(`Expected ${count} entity log rows for ${String(id)}`);
}

/** Waits for one particular entry. */
async function waitForRow(id: unknown, match: (row: { action: string; field: string }) => boolean) {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const row = (await logsFor(id)).find(match);
    if (row) return row;
    await pause(20);
  }
  throw new Error(`No matching entity log row for ${String(id)}`);
}

const manager = new Types.ObjectId();
const admin = new Types.ObjectId();

describe('entityActorType', () => {
  it('is SYSTEM with no caller, OWNER for the record’s own account, and ADMIN for anybody else', () => {
    expect(entityActorType(null, 'o1')).toBe('SYSTEM');
    expect(entityActorType('o1', 'o1')).toBe('OWNER');
    expect(entityActorType('a1', 'o1')).toBe('ADMIN');
    expect(entityActorType('a1', null)).toBe('ADMIN');
  });
});

describe('the model hooks, through a region', () => {
  const make = (over: Record<string, unknown> = {}) =>
    requestIdentity.run(as(String(admin), 'ADMIN_PORTAL'), () => RegionModel.create({ manager_user_id: new Types.ObjectId(), region_name: 'North', ...over }));

  it('logs a create, and a save that moves a tracked field with the old and new values', async () => {
    const region = await make();
    await waitForLogs(region._id, 1);
    region.region_name = 'North Zone';
    await requestIdentity.run(as(String(admin)), () => region.save());
    const rows = await logsFor(region._id);
    const updated = await waitForRow(region._id, (row) => row.action === 'UPDATE' && row.field === 'region_name');
    expect(updated).toMatchObject({ entity_type: 'REGION', field: 'region_name', old_value: 'North', new_value: 'North Zone', action: 'UPDATE', actor_type: 'ADMIN', source: 'SERVER', entity_label: 'North Zone' });
    expect(rows.find((row) => row.action === 'CREATE')).toMatchObject({ source: 'ADMIN_PORTAL', actor_user_id: admin });
  });

  it('logs nothing for a save that changed nothing, or an update that only moved an untracked field', async () => {
    const region = await make();
    await waitForLogs(region._id, 1);
    const before = (await logsFor(region._id)).length;
    await region.save();
    await RegionModel.updateOne({ _id: region._id }, { $set: { updated_at: new Date() } }).exec();
    await pause(150);
    expect((await logsFor(region._id)).length).toBe(before);
  });

  it('logs an update and a find-and-update, and nothing when they match no record', async () => {
    const region = await make();
    await waitForLogs(region._id, 1);
    await requestIdentity.run(as(String(admin)), () => RegionModel.updateOne({ _id: region._id }, { $set: { is_active: false } }).exec());
    await requestIdentity.run(as(String(admin)), () => RegionModel.findOneAndUpdate({ _id: region._id }, { $set: { region_name: 'Moved' } }).exec());
    await waitForRow(region._id, (row) => row.action === 'UPDATE' && row.field === 'is_active');
    await waitForRow(region._id, (row) => row.action === 'UPDATE' && row.field === 'region_name');
    const count = await EntityChangeLogModel.countDocuments();
    await requestIdentity.run(as(String(admin)), () => RegionModel.updateOne({ _id: new Types.ObjectId() }, { $set: { is_active: false } }).exec());
    await pause(150);
    expect(await EntityChangeLogModel.countDocuments()).toBe(count);
  });

  it('logs a delete, whichever way it is made, and nothing when there is nothing to delete', async () => {
    const a = await make();
    const b = await make();
    await waitForLogs(a._id, 1);
    await waitForLogs(b._id, 1);
    await requestIdentity.run(as(String(admin)), () => RegionModel.deleteOne({ _id: a._id }).exec());
    await requestIdentity.run(as(String(admin)), () => RegionModel.findOneAndDelete({ _id: b._id }).exec());
    await waitForRow(a._id, (row) => row.action === 'DELETE');
    await waitForRow(b._id, (row) => row.action === 'DELETE');
    const count = await EntityChangeLogModel.countDocuments();
    await RegionModel.deleteOne({ _id: new Types.ObjectId() }).exec();
    await RegionModel.findOneAndDelete({ _id: new Types.ObjectId() }).exec();
    await pause(150);
    expect(await EntityChangeLogModel.countDocuments()).toBe(count);
  });

  it('logs a failure to write the log instead of failing the edit', async () => {
    const error = jest.spyOn(logs.server, 'error').mockImplementation(() => undefined as never);
    jest.spyOn(service, 'record').mockRejectedValue(new Error('log store down'));
    const region = await make();
    for (let attempt = 0; attempt < 100 && error.mock.calls.length === 0; attempt += 1) await pause(20);
    expect(await RegionModel.exists({ _id: region._id })).not.toBeNull();
    expect(error).toHaveBeenCalledWith('entityAudit', 'attach', expect.objectContaining({ entityType: 'REGION' }));
    jest.restoreAllMocks();
  });
});

describe('record', () => {
  const brand = (over: Record<string, unknown> = {}) => ({ brand_name: 'Audit Co', owner_user_id: new Types.ObjectId(), status: 'SUBMITTED', ...over });

  it('classifies the actor against the record’s owner, and as SYSTEM outside any request', async () => {
    const owner = new Types.ObjectId();
    const id = String(new Types.ObjectId());
    await requestIdentity.run(as(String(owner)), () => service.record({ entityType: 'BRAND', entityId: id, before: brand({ owner_user_id: owner }), after: brand({ owner_user_id: owner, status: 'APPROVED' }) }));
    await requestIdentity.run(as(String(admin)), () => service.record({ entityType: 'BRAND', entityId: id, before: brand({ owner_user_id: owner }), after: brand({ owner_user_id: owner, status: 'LIVE' }) }));
    await service.record({ entityType: 'BRAND', entityId: id, before: brand({ owner_user_id: owner }), after: brand({ owner_user_id: owner, status: 'PAUSED' }) });
    const rows = await EntityChangeLogModel.find({ entity_id: id }).sort({ _id: 1 }).lean();
    expect(rows.map((r) => [r.new_value, r.actor_type])).toEqual([['APPROVED', 'OWNER'], ['LIVE', 'ADMIN'], ['PAUSED', 'SYSTEM']]);
    expect(rows[2]).toMatchObject({ actor_user_id: null, actor_name: '', source: 'SERVER' });
  });

  it('names the actor from their account, and keeps no account link for an id that is not one', async () => {
    const person = await UserModel.create({ auth: { email: 'meera@duncit.com' }, profile: { first_name: 'Meera', last_name: 'Iyer' } });
    const id = String(new Types.ObjectId());
    await requestIdentity.run(as(String(person._id)), () => service.record({ entityType: 'BRAND', entityId: id, before: brand(), after: brand({ status: 'APPROVED' }) }));
    await requestIdentity.run(as('service-account-7'), () => service.record({ entityType: 'BRAND', entityId: id, before: brand(), after: brand({ status: 'LIVE' }) }));
    const rows = await EntityChangeLogModel.find({ entity_id: id }).sort({ _id: 1 }).lean();
    expect(rows[0]).toMatchObject({ actor_name: 'Meera Iyer', actor_user_id: person._id });
    expect(rows[1]).toMatchObject({ actor_user_id: null, actor_type: 'ADMIN' });
  });

  it('defaults the action to UPDATE, honours one given, and labels a delete from the record that was', async () => {
    const id = String(new Types.ObjectId());
    await service.record({ entityType: 'BRAND', entityId: id, before: brand(), after: brand({ status: 'APPROVED' }) });
    await service.record({ entityType: 'BRAND', entityId: id, before: brand({ brand_name: 'Gone Co' }), after: null, action: 'DELETE' });
    const rows = await EntityChangeLogModel.find({ entity_id: id }).sort({ _id: 1 }).lean();
    expect(rows[0]).toMatchObject({ action: 'UPDATE', entity_label: 'Audit Co' });
    expect(rows.at(-1)).toMatchObject({ action: 'DELETE', entity_label: 'Gone Co' });
  });

  it('reads an owner id however it is stored, and has none for an entity with no owner or an owner it cannot read', async () => {
    const owner = new Types.ObjectId();
    const cases: Array<[string, unknown, string]> = [
      ['BRAND', owner, 'OWNER'], ['BRAND', String(owner), 'OWNER'], ['BRAND', { not: 'an id' }, 'ADMIN'], ['BRAND', 0, 'ADMIN'], ['BRAND', true, 'ADMIN'], ['CLUB', owner, 'ADMIN'],
    ];
    for (const [type, stored, expected] of cases) {
      const id = String(new Types.ObjectId());
      const field = type === 'BRAND' ? { owner_user_id: stored, brand_name: 'X', status: 'A' } : { club_name: 'C', owner_user_id: stored, status: 'A' };
      const next = type === 'BRAND' ? { ...field, status: 'B' } : { ...field, club_name: 'C2' };
      await requestIdentity.run(as(String(owner)), () => service.record({ entityType: type as 'BRAND', entityId: id, before: field, after: next }));
      expect((await EntityChangeLogModel.findOne({ entity_id: id }).lean())?.actor_type).toBe(expected);
    }
  });

  it('leaves a record with no label name blank, and writes nothing for an id that is not one or a write that moved nothing', async () => {
    const id = String(new Types.ObjectId());
    await service.record({ entityType: 'CLUB', entityId: id, before: { status: 'x' }, after: { is_active: true } });
    expect((await EntityChangeLogModel.findOne({ entity_id: id }).lean())?.entity_label).toBe('');
    const count = await EntityChangeLogModel.countDocuments();
    await service.record({ entityType: 'BRAND', entityId: 'not-an-id', before: brand(), after: brand({ status: 'B' }) });
    await service.record({ entityType: 'BRAND', entityId: String(new Types.ObjectId()), before: brand(), after: brand() });
    expect(await EntityChangeLogModel.countDocuments()).toBe(count);
  });

  it('never throws, and logs, when the log cannot be written', async () => {
    const error = jest.spyOn(logs.server, 'error').mockImplementation(() => undefined as never);
    jest.spyOn(EntityChangeLogModel, 'insertMany').mockRejectedValue(new Error('db down') as never);
    await expect(service.record({ entityType: 'BRAND', entityId: String(new Types.ObjectId()), before: brand(), after: brand({ status: 'B' }) })).resolves.toBeUndefined();
    expect(error).toHaveBeenCalledWith('entityAudit', 'record', expect.objectContaining({ entityType: 'BRAND' }));
    jest.restoreAllMocks();
  });
});

describe('the tables', () => {
  it('shows one record’s history newest first, and an empty page for an id that is not one', async () => {
    const id = String(new Types.ObjectId());
    const brand = (status: string) => ({ brand_name: 'Audit Co', owner_user_id: new Types.ObjectId(), status });
    await requestIdentity.run(as(String(admin)), () => service.record({ entityType: 'BRAND', entityId: id, before: brand('A'), after: brand('B') }));
    await pause(5);
    await service.record({ entityType: 'BRAND', entityId: id, before: brand('B'), after: brand('C') });
    const page = await service.table('BRAND', id, { page: 1, page_size: 10 } as never);
    expect(page.rows.map((r) => r.new_value)).toEqual(['C', 'B']);
    expect(page.rows[0]).toMatchObject({ entity_type: 'BRAND', entity_id: id, actor_user_id: null, source: 'SERVER', created_at: expect.any(String) });
    expect(page.rows[1].actor_user_id).toBe(String(admin));
    expect((await service.table('BRAND', id)).total).toBe(2);
    await expect(service.table('BRAND', 'nope')).resolves.toEqual({ rows: [], total: 0, page: 1, page_size: 0 });
  });

  it('shows every record of one entity in the feed, and none of another’s', async () => {
    await service.record({ entityType: 'BRAND', entityId: String(new Types.ObjectId()), before: { brand_name: 'A', status: 'x' }, after: { brand_name: 'A', status: 'y' } });
    await service.record({ entityType: 'CLUB', entityId: String(new Types.ObjectId()), before: { club_name: 'C' }, after: { club_name: 'D' } });
    expect((await service.tableForType('BRAND', { page: 1, page_size: 10 } as never)).total).toBe(1);
    expect((await service.tableForType('CLUB')).total).toBe(1);
  });
});

describe('who may read a region’s history', () => {
  const region = async () => RegionModel.create({ manager_user_id: manager, region_name: 'East' });
  const read = (ctx: ReturnType<typeof makeContext>, entityId: string) => Q.entityChangeLogsTable({}, { entity_type: 'REGION', entity_id: entityId }, ctx);

  it('lets a platform admin read any region, and the region’s own manager read theirs', async () => {
    const r = await region();
    await expect(read(makeContext({ id: String(admin), roles: ['CITY_ADMIN'] }), String(r._id))).resolves.toMatchObject({ total: expect.any(Number) });
    await expect(read(makeContext({ id: String(manager), roles: ['REGIONAL_CLUB_ADMIN'] }), String(r._id))).resolves.toMatchObject({ total: expect.any(Number) });
  });

  it('refuses another regional admin, an unknown region and an id that is not one — and anyone with no role at all', async () => {
    const r = await region();
    const other = makeContext({ id: String(new Types.ObjectId()), roles: ['REGIONAL_CLUB_ADMIN'] });
    await expect(read(other, String(r._id))).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' }, message: 'That is not your region' });
    await expect(read(other, String(new Types.ObjectId()))).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } });
    await expect(read(other, 'nope')).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
    await expect(read(makeContext({ id: 'u', roles: ['USER'] }), String(r._id))).rejects.toThrow(/access denied/i);
  });

  it('keeps the console-wide feed from the regional role, and gives it to the roles that hold the whole directory', async () => {
    const feed = (roles: string[], entity_type = 'REGION') => Q.entityChangeFeedTable({}, { entity_type, query: { page: 1, page_size: 5 } }, makeContext({ id: String(admin), roles }));
    await expect(feed(['REGIONAL_CLUB_ADMIN'])).rejects.toThrow(/access denied/i);
    await expect(feed(['ALL_CLUB_ADMINS_ACCESS'])).resolves.toMatchObject({ total: expect.any(Number) });
    await expect(feed(['SUPER_ADMIN'])).resolves.toBeDefined();
    await expect(feed(['ALL_VENUES_ACCESS'], 'VENUE')).resolves.toBeDefined();
    await expect(feed(['ALL_VENUES_ACCESS'], 'HOST')).rejects.toThrow(/access denied/i);
  });

  it('serves the log of any other entity to the roles that read that entity', async () => {
    await expect(Q.entityChangeLogsTable({}, { entity_type: 'CLUB', entity_id: String(new Types.ObjectId()) }, makeContext({ id: 'a', roles: ['ALL_CLUBS_ACCESS'] }))).resolves.toMatchObject({ total: 0 });
    await expect(Q.entityChangeLogsTable({}, { entity_type: 'CLUB', entity_id: String(new Types.ObjectId()) }, makeContext({ id: 'a', roles: ['ALL_VENUES_ACCESS'] }))).rejects.toThrow(/access denied/i);
  });
});
