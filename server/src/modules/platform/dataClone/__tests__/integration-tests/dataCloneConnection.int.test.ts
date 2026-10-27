/**
 * The two database connections a clone runs between, against a real database:
 * seeded from the environment the first time they are read, saved and then
 * PROVED by really connecting (the in-memory Mongo stands in for a cluster),
 * never returned unmasked, and refused when they would make a clone overwrite
 * its own source or write somewhere the server does not allow.
 */
jest.mock('@observability/log', () => ({ logs: { server: { error: jest.fn(), warn: jest.fn(), info: jest.fn() } } }));

import mongoose, { mongo } from 'mongoose';
import { makeContext } from '@test/harness';
import * as config from '../../dataClone.config';
import { clusterKey, describeCloneEndpoints, resolveCloneEndpoints, targetPinViolation, EXCLUDED_COLLECTIONS } from '../../dataClone.config';
import { DataCloneConnectionModel } from '../../dataCloneConnection.model';
import { dataCloneConnectionService as service, maskUri, scrubUri } from '../../dataCloneConnection.service';
import { dataCloneResolvers } from '../../dataClone.resolver';
import { dataCloneService } from '../../dataClone.service';

jest.setTimeout(30_000);

const REAL_URI = process.env.MONGO_URI as string;
const ENV_KEYS = ['DATA_CLONE_SOURCE_URI', 'DATA_CLONE_SOURCE_DB', 'DATA_CLONE_TARGET_URI', 'DATA_CLONE_TARGET_DB', 'MONGO_DB_NAME'] as const;
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of ENV_KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
});
afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
  jest.restoreAllMocks();
});

describe('how a connection string is shown and scrubbed', () => {
  it('masks the password, keeps the user and host, and shows nothing for what is not a connection string', () => {
    expect(maskUri('mongodb+srv://ops:s3cret@cluster0.abc.mongodb.net/prod?retryWrites=true')).toBe('mongodb+srv://ops:••••@cluster0.abc.mongodb.net');
    expect(maskUri('mongodb://localhost:27017/db')).toBe('mongodb://localhost:27017');
    expect(maskUri('')).toBe('');
    expect(maskUri('just some text')).toBe('••••');
  });

  it('removes both the string and its password from a driver message', () => {
    const uri = 'mongodb+srv://ops:s3cret@cluster0.abc.mongodb.net/prod';
    expect(scrubUri(`bad url ${uri} and password s3cret`, uri)).toBe('bad url mongodb+srv://ops:••••@cluster0.abc.mongodb.net and password ••••');
    expect(scrubUri('plain message', 'mongodb://localhost:27017')).toBe('plain message');
    expect(scrubUri('plain message', 'no-scheme-uri')).toBe('plain message');
    expect(scrubUri('plain message', 'mongodb://user@host')).toBe('plain message');
  });

  it('compares clusters by host alone, whatever the scheme, credentials, path or case', () => {
    expect(clusterKey('mongodb+srv://a:b@Cluster0.Abc.mongodb.net/db?x=1')).toBe('cluster0.abc.mongodb.net');
    expect(clusterKey('mongodb://localhost:27017/db')).toBe('localhost:27017');
    expect(clusterKey('cluster0.abc.mongodb.net/db')).toBe('cluster0.abc.mongodb.net');
  });
});

describe('seeding from the environment', () => {
  it('seeds production from the source variables and staging from the target ones, unproved', async () => {
    process.env.DATA_CLONE_SOURCE_URI = 'mongodb://prod-host/x';
    process.env.DATA_CLONE_SOURCE_DB = 'duncit';
    process.env.DATA_CLONE_TARGET_URI = 'mongodb://stage-host/y';
    process.env.DATA_CLONE_TARGET_DB = 'duncit-staging';
    const settings = await service.settings();
    expect(settings.production).toEqual({ role: 'PRODUCTION', uriMasked: 'mongodb://prod-host', hasUri: true, database: 'duncit', connected: false, collectionCount: 0, lastTestedAt: null, lastTestError: null });
    expect(settings.staging).toMatchObject({ role: 'STAGING', uriMasked: 'mongodb://stage-host', database: 'duncit-staging', connected: false });
  });

  it('falls back to the server’s own connection string and database, and staging shares the source cluster by default', async () => {
    process.env.MONGO_DB_NAME = 'duncit-from-env';
    const settings = await service.settings();
    expect(settings.production).toMatchObject({ hasUri: true, database: 'duncit-from-env' });
    expect(settings.staging).toMatchObject({ hasUri: true, database: '' });
  });

  it('uses the database the server is actually connected to when nothing names one', async () => {
    expect((await service.settings()).production.database).toBe(mongoose.connection.db?.databaseName);
  });

  it('seeds an empty database name when the server is not connected to any', async () => {
    const real = mongoose.connection.db;
    Object.assign(mongoose.connection, { db: undefined });
    try {
      expect((await service.settings()).production.database).toBe('');
    } finally {
      Object.assign(mongoose.connection, { db: real });
    }
  });

  it('seeds once: an operator’s edit is never overwritten by the environment', async () => {
    process.env.DATA_CLONE_SOURCE_DB = 'first';
    await service.settings();
    process.env.DATA_CLONE_SOURCE_DB = 'second';
    expect((await service.settings()).production.database).toBe('first');
    expect(await DataCloneConnectionModel.countDocuments()).toBe(2);
  });

  it('says the connection could not be created when it vanishes between the seed and the read', async () => {
    jest.spyOn(config, 'findConnection').mockResolvedValue(null);
    await expect(service.settings()).rejects.toMatchObject({ message: 'The connection could not be created.' });
  });
});

describe('save', () => {
  it('saves and proves a connection by actually reaching it, counting its collections', async () => {
    await mongoose.connection.db?.collection('probe_target').insertOne({ x: 1 });
    const out = await service.save('PRODUCTION', { uri: ` ${REAL_URI} `, database: ` ${mongoose.connection.db?.databaseName} ` });
    expect(out.production.connected).toBe(true);
    expect(out.production.collectionCount).toBeGreaterThan(0);
    expect(out.production.lastTestedAt).toEqual(expect.any(String));
    expect(out.production.lastTestError).toBeNull();
    expect(JSON.stringify(out)).not.toContain(REAL_URI);
  });

  it('keeps the stored string when the uri is left blank, so only the database name changes', async () => {
    await service.save('PRODUCTION', { uri: REAL_URI, database: 'duncit_a' });
    const out = await service.save('PRODUCTION', { database: 'duncit_b' });
    expect(out.production).toMatchObject({ database: 'duncit_b', connected: true });
    expect((await DataCloneConnectionModel.findOne({ role: 'PRODUCTION' }).lean())?.uri).toBe(REAL_URI);
    await service.save('PRODUCTION', { uri: '   ', database: 'duncit_c' });
    expect((await DataCloneConnectionModel.findOne({ role: 'PRODUCTION' }).lean())?.database).toBe('duncit_c');
  });

  it('refuses what is not a usable connection, saving nothing', async () => {
    await DataCloneConnectionModel.create({ role: 'PRODUCTION', uri: '', database: '' });
    await expect(service.save('PRODUCTION', { uri: '', database: 'x' })).rejects.toMatchObject({ message: 'Paste the connection string for this database.' });
    await expect(service.save('PRODUCTION', { database: 'x' })).rejects.toMatchObject({ message: 'Paste the connection string for this database.' });
    await expect(service.save('PRODUCTION', { uri: 'postgres://x', database: 'x' })).rejects.toMatchObject({ message: expect.stringContaining('starts with mongodb://') });
    await expect(service.save('PRODUCTION', { uri: REAL_URI, database: '  ' })).rejects.toMatchObject({ message: 'Name the database this connection points at.', extensions: { code: 'BAD_USER_INPUT' } });
    expect(await DataCloneConnectionModel.findOne({ role: 'PRODUCTION', uri: 'postgres://x' })).toBeNull();
  });

  it('keeps a string the driver refuses to parse for correction, unproved, with its password scrubbed from the message', async () => {
    const bad = 'mongodb+srv://ops:hunter22@cluster0.abc.mongodb.net:27017/db';
    const out = await service.save('STAGING', { uri: bad, database: 'duncit-staging' });
    expect(out.staging).toMatchObject({ connected: false, collectionCount: 0, hasUri: true });
    expect(out.staging.lastTestError).toEqual(expect.any(String));
    expect(out.staging.lastTestError).not.toContain('hunter22');
    expect(out.staging.lastTestedAt).toEqual(expect.any(String));
  });

  it('reports a failure that is not an Error under a generic message', async () => {
    jest.spyOn(mongo, 'MongoClient').mockImplementation(() => {
      throw 'weird';
    });
    const out = await service.save('PRODUCTION', { uri: REAL_URI, database: 'duncit_a' });
    expect(out.production).toMatchObject({ connected: false, lastTestError: 'Connection failed' });
  });

  it('refuses a staging connection that would make the clone overwrite its source, and says why', async () => {
    const name = mongoose.connection.db?.databaseName as string;
    await service.save('PRODUCTION', { uri: REAL_URI, database: name });
    const out = await service.save('STAGING', { uri: REAL_URI, database: name });
    expect(out.staging.connected).toBe(false);
    expect(out.staging.lastTestError).toContain('same cluster and database as the production connection');
    const refusedFirst = await service.save('PRODUCTION', { uri: REAL_URI, database: name });
    expect(refusedFirst.production.lastTestError).toContain('same cluster and database as the staging connection');
  });

  it('accepts staging on the same cluster when it names a different database', async () => {
    await service.save('PRODUCTION', { uri: REAL_URI, database: 'duncit_prod_like' });
    const out = await service.save('STAGING', { uri: REAL_URI, database: 'duncit_stage_like' });
    expect(out.staging).toMatchObject({ connected: true, lastTestError: null });
  });

  it('refuses a staging database the server does not allow writing to, but not a production one', async () => {
    process.env.DATA_CLONE_TARGET_DB = 'duncit-staging';
    const refused = await service.save('STAGING', { uri: REAL_URI, database: 'something_else' });
    expect(refused.staging.lastTestError).toContain('only allows a clone to write to duncit-staging');
    const allowed = await service.save('STAGING', { uri: REAL_URI, database: 'duncit-staging' });
    expect(allowed.staging.connected).toBe(true);
    const production = await service.save('PRODUCTION', { uri: REAL_URI, database: 'something_else' });
    expect(production.production.connected).toBe(true);
  });
});

describe('test (re-proving what is saved)', () => {
  it('re-proves a saved connection, and refuses one with no string or database', async () => {
    await service.save('PRODUCTION', { uri: REAL_URI, database: 'duncit_a' });
    expect((await service.test('PRODUCTION')).production.connected).toBe(true);
    await DataCloneConnectionModel.updateOne({ role: 'STAGING' }, { $set: { uri: '', database: '' } }, { upsert: true });
    await expect(service.test('STAGING')).rejects.toMatchObject({ message: 'Add the connection string and database name first.', extensions: { code: 'BAD_USER_INPUT' } });
  });

  it('does not stamp a verdict onto a string that was replaced while it was being proved', async () => {
    await service.save('PRODUCTION', { uri: REAL_URI, database: 'duncit_a' });
    const proving = service.test('PRODUCTION');
    await DataCloneConnectionModel.updateOne({ role: 'PRODUCTION' }, { $set: { database: 'duncit_replaced', connected: false } });
    await proving;
    expect((await DataCloneConnectionModel.findOne({ role: 'PRODUCTION' }).lean())?.connected).toBe(false);
  });
});

describe('resolving what a clone would do', () => {
  const connect = async (production = 'duncit_prod_like', staging = 'duncit_stage_like') => {
    await service.save('PRODUCTION', { uri: REAL_URI, database: production });
    await service.save('STAGING', { uri: REAL_URI, database: staging });
  };

  it('resolves both ends once they are proved, and describes them for the page', async () => {
    await connect();
    await expect(resolveCloneEndpoints()).resolves.toEqual({ sourceUri: REAL_URI, sourceDb: 'duncit_prod_like', targetUri: REAL_URI, targetDb: 'duncit_stage_like' });
    await expect(describeCloneEndpoints()).resolves.toMatchObject({ sourceDatabase: 'duncit_prod_like', targetDatabase: 'duncit_stage_like', ready: true, error: null, excluded: [...EXCLUDED_COLLECTIONS] });
  });

  it('says exactly what to fix, in the order an operator fixes it', async () => {
    await expect(describeCloneEndpoints()).resolves.toMatchObject({ ready: false, sourceDatabase: '', error: 'Add the production connection in Data Clone -> Settings.' });
    await DataCloneConnectionModel.create({ role: 'PRODUCTION', uri: REAL_URI, database: 'duncit_prod_like', connected: true });
    await expect(resolveCloneEndpoints()).rejects.toMatchObject({ message: 'Add the staging connection in Data Clone -> Settings.' });
    await DataCloneConnectionModel.create({ role: 'STAGING', uri: REAL_URI, database: 'duncit_stage_like', connected: false });
    await expect(resolveCloneEndpoints()).rejects.toMatchObject({ message: expect.stringContaining('The staging connection has not been verified') });
    await DataCloneConnectionModel.updateOne({ role: 'STAGING' }, { $set: { database: '' } });
    await expect(resolveCloneEndpoints()).rejects.toMatchObject({ message: 'Add the staging connection in Data Clone -> Settings.' });
  });

  it('refuses a pinned target that is not the pinned database, and a target that is the source itself', async () => {
    await connect();
    process.env.DATA_CLONE_TARGET_DB = 'duncit-staging';
    await expect(resolveCloneEndpoints()).rejects.toMatchObject({ message: expect.stringContaining('only allows a clone to write to duncit-staging') });
    delete process.env.DATA_CLONE_TARGET_DB;
    await DataCloneConnectionModel.updateOne({ role: 'STAGING' }, { $set: { database: 'duncit_prod_like', connected: true } });
    await expect(resolveCloneEndpoints()).rejects.toMatchObject({ message: expect.stringContaining('Refusing to clone: staging resolves to the same cluster and database as production') });
  });

  it('describes a refusal that is not an Error under a generic message', async () => {
    jest.spyOn(DataCloneConnectionModel, 'findOne').mockImplementation((() => ({ lean: () => ({ exec: () => Promise.reject('weird') }) })) as never);
    await expect(describeCloneEndpoints()).resolves.toMatchObject({ ready: false, error: 'Data clone is not configured' });
  });

  it('allows any target when the server pins none, and only the pinned one when it does', () => {
    expect(targetPinViolation('anything')).toBeNull();
    process.env.DATA_CLONE_TARGET_DB = ' duncit-staging ';
    expect(targetPinViolation('duncit-staging')).toBeNull();
    expect(targetPinViolation('prod')).toContain('duncit-staging');
  });
});

describe('the resolvers', () => {
  const Q = dataCloneResolvers.Query as Record<string, (...a: any[]) => any>;
  const M = dataCloneResolvers.Mutation as Record<string, (...a: any[]) => any>;
  const exec = makeContext({ id: 'u1', roles: ['SUPER_ADMIN'] });
  const lesser = makeContext({ id: 'u2', roles: ['SUPPORT_USER'] });

  it('reach their services for the Tech executive role, and for nobody else', async () => {
    jest.spyOn(dataCloneService, 'targets').mockResolvedValue({ ready: true } as never);
    jest.spyOn(dataCloneService, 'job').mockResolvedValue(null);
    const start = jest.spyOn(dataCloneService, 'start').mockResolvedValue({ id: 'j1' } as never);
    await expect(Q.dataCloneTargets({}, {}, exec)).resolves.toEqual({ ready: true });
    await expect(Q.dataCloneJob({}, { id: 'j1' }, exec)).resolves.toBeNull();
    await expect(Q.dataCloneSettings({}, {}, exec)).resolves.toMatchObject({ production: { role: 'PRODUCTION' }, staging: { role: 'STAGING' } });
    await expect(M.startDataClone({}, {}, exec)).resolves.toEqual({ id: 'j1' });
    expect(start).toHaveBeenCalledWith(expect.objectContaining({ id: 'u1' }));
    await expect(M.saveDataCloneConnection({}, { role: 'PRODUCTION', input: { uri: REAL_URI, database: 'duncit_a' } }, exec)).resolves.toMatchObject({ production: { connected: true } });
    await expect(M.testDataCloneConnection({}, { role: 'PRODUCTION' }, exec)).resolves.toMatchObject({ production: { connected: true } });
    for (const call of [
      () => Q.dataCloneTargets({}, {}, lesser), () => Q.dataCloneJob({}, {}, lesser), () => Q.dataCloneSettings({}, {}, lesser),
      () => M.startDataClone({}, {}, lesser), () => M.saveDataCloneConnection({}, { role: 'STAGING', input: { database: 'x' } }, lesser), () => M.testDataCloneConnection({}, { role: 'STAGING' }, lesser),
    ]) {
      expect(call).toThrow();
    }
  });
});
