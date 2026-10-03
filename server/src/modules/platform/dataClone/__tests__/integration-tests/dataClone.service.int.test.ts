/**
 * The production -> staging clone, run for real against the shared in-memory
 * Mongo: two throwaway databases stand in for "production" and "staging", and
 * only the endpoint resolution (which reads the operator's saved connections)
 * is faked. What is under test is the background walk — every cloneable
 * collection dropped and refilled in batches with its indexes, excluded
 * collections and views left alone, one bad collection never costing the rest —
 * plus the stale-heartbeat repair and the one-clone-at-a-time guard.
 */
import { mongo } from 'mongoose';

jest.mock('@observability/log', () => ({
  logs: { server: { error: jest.fn(), warn: jest.fn(), info: jest.fn() } },
}));
jest.mock('../../dataClone.config', () => ({
  ...jest.requireActual('../../dataClone.config'),
  resolveCloneEndpoints: jest.fn(),
  describeCloneEndpoints: jest.fn(),
}));

import { logs } from '@observability/log';
import { describeCloneEndpoints, resolveCloneEndpoints } from '../../dataClone.config';
import { DataCloneJobModel } from '../../dataClone.model';
import { dataCloneService, type PublicCloneJob } from '../../dataClone.service';

const resolveEndpoints = resolveCloneEndpoints as jest.Mock;
const describeEndpoints = describeCloneEndpoints as jest.Mock;
const logError = logs.server.error as jest.Mock;
const logWarn = logs.server.warn as jest.Mock;

// A real clone walk runs in the background; give it more than the 5 s default.
jest.setTimeout(30_000);

const SOURCE_DB = 'dataclone_it_source';
const TARGET_DB = 'dataclone_it_target';
const OPERATOR = { id: '65f400000000000000000001', email: 'ops@example.test', roles: ['SUPER_ADMIN'] } as any;
const INTERRUPTED =
  'The server restarted while this clone was running, so it stopped part-way. Start it again.';

let client: mongo.MongoClient;
let source: mongo.Db;
let target: mongo.Db;

const endpoints = () => ({
  sourceUri: process.env.MONGO_URI as string,
  sourceDb: SOURCE_DB,
  targetUri: process.env.MONGO_URI as string,
  targetDb: TARGET_DB,
});

/** The walk runs in the background; wait (bounded) for it to leave RUNNING. */
async function settled(jobId: string): Promise<PublicCloneJob> {
  for (let i = 0; i < 400; i += 1) {
    const job = await dataCloneService.job(jobId);
    if (job && job.status !== 'RUNNING') return job;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`clone ${jobId} never finished`);
}

beforeAll(async () => {
  client = new mongo.MongoClient(process.env.MONGO_URI as string);
  await client.connect();
  source = client.db(SOURCE_DB);
  target = client.db(TARGET_DB);
});

afterEach(async () => {
  jest.restoreAllMocks();
  await source.dropDatabase();
  await target.dropDatabase();
});

afterAll(async () => {
  await client.close();
});

beforeEach(() => {
  resolveEndpoints.mockResolvedValue(endpoints());
});

describe('dataCloneService.targets', () => {
  it('describes the endpoints the clone would use', async () => {
    const described = { ready: true, source: 'prod', target: 'staging' };
    describeEndpoints.mockResolvedValue(described);
    await expect(dataCloneService.targets()).resolves.toBe(described);
  });
});

describe('dataCloneService.job', () => {
  it('returns null when no clone has ever run', async () => {
    await expect(dataCloneService.job()).resolves.toBeNull();
    await expect(dataCloneService.job('65f4000000000000000000ff')).resolves.toBeNull();
  });

  it('returns the most recent job when no id is given, shaped with derived totals', async () => {
    await DataCloneJobModel.create({
      status: 'SUCCEEDED',
      source_database: 'old_src',
      target_database: 'old_tgt',
      started_at: new Date('2026-01-01T00:00:00Z'),
    });
    const latest = await DataCloneJobModel.create({
      status: 'FAILED',
      source_database: 'src',
      target_database: 'tgt',
      started_at: new Date('2026-02-01T00:00:00Z'),
      finished_at: new Date('2026-02-01T01:00:00Z'),
      error: '1 collection(s) failed — see the list below.',
      started_by: 'ops@example.test',
      excluded: ['apikeys'],
      collections: [
        {
          name: 'alphas',
          status: 'DONE',
          source_count: 3,
          copied_count: 3,
          bytes: 120,
          started_at: new Date('2026-02-01T00:10:00Z'),
          finished_at: new Date('2026-02-01T00:20:00Z'),
        },
        { name: 'betas', status: 'FAILED', source_count: 2, copied_count: 1, bytes: 40, error: 'dup key' },
        { name: 'gammas', status: 'COPYING', source_count: 5, copied_count: 0, bytes: 0 },
      ],
    });

    const job = await dataCloneService.job();

    expect(job).toEqual({
      id: String(latest._id),
      status: 'FAILED',
      sourceDatabase: 'src',
      targetDatabase: 'tgt',
      currentCollection: null,
      collectionsTotal: 3,
      collectionsDone: 2,
      documentsCopied: 4,
      bytesCopied: 160,
      collections: [
        {
          name: 'alphas',
          status: 'DONE',
          sourceCount: 3,
          copiedCount: 3,
          bytes: 120,
          error: null,
          startedAt: '2026-02-01T00:10:00.000Z',
          finishedAt: '2026-02-01T00:20:00.000Z',
        },
        {
          name: 'betas',
          status: 'FAILED',
          sourceCount: 2,
          copiedCount: 1,
          bytes: 40,
          error: 'dup key',
          startedAt: null,
          finishedAt: null,
        },
        {
          name: 'gammas',
          status: 'COPYING',
          sourceCount: 5,
          copiedCount: 0,
          bytes: 0,
          error: null,
          startedAt: null,
          finishedAt: null,
        },
      ],
      excluded: ['apikeys'],
      error: '1 collection(s) failed — see the list below.',
      startedBy: 'ops@example.test',
      startedAt: '2026-02-01T00:00:00.000Z',
      finishedAt: '2026-02-01T01:00:00.000Z',
    });
  });

  it('leaves a RUNNING job with a fresh heartbeat alone', async () => {
    const doc = await DataCloneJobModel.create({
      status: 'RUNNING',
      source_database: 'src',
      target_database: 'tgt',
      heartbeat_at: new Date(),
    });

    const job = await dataCloneService.job(String(doc._id));

    expect(job).toMatchObject({ status: 'RUNNING', error: null, finishedAt: null });
  });

  it('flips a RUNNING job whose heartbeat went stale to FAILED, and persists it', async () => {
    const doc = await DataCloneJobModel.create({
      status: 'RUNNING',
      source_database: 'src',
      target_database: 'tgt',
      current_collection: 'alphas',
      heartbeat_at: new Date(Date.now() - 5 * 60_000),
    });

    const job = await dataCloneService.job(String(doc._id));

    expect(job).toMatchObject({ status: 'FAILED', error: INTERRUPTED, currentCollection: null });
    expect(job?.finishedAt).toEqual(expect.any(String));
    const stored = await DataCloneJobModel.findById(doc._id).lean();
    expect(stored).toMatchObject({ status: 'FAILED', error: INTERRUPTED, current_collection: null });
  });

  it('falls back to started_at when the job has no heartbeat at all', async () => {
    const doc = await DataCloneJobModel.create({
      status: 'RUNNING',
      source_database: 'src',
      target_database: 'tgt',
      started_at: new Date(Date.now() - 10 * 60_000),
      heartbeat_at: null,
    });

    await expect(dataCloneService.job(String(doc._id))).resolves.toMatchObject({
      status: 'FAILED',
      error: INTERRUPTED,
    });
  });
});

describe('dataCloneService.start', () => {
  it('refuses while another clone is still running', async () => {
    await DataCloneJobModel.create({
      status: 'RUNNING',
      source_database: 'src',
      target_database: 'tgt',
      heartbeat_at: new Date(),
    });

    await expect(dataCloneService.start(OPERATOR)).rejects.toMatchObject({
      message: 'A clone is already running — wait for it to finish.',
      extensions: { code: 'BAD_USER_INPUT' },
    });
    expect(await DataCloneJobModel.countDocuments()).toBe(1);
  });

  it('copies every cloneable collection with its indexes, replacing what staging had', async () => {
    const alphas = [
      { _id: 'a1', code: 'A-1', n: 1 },
      { _id: 'a2', code: 'A-2', n: 2 },
      { _id: 'a3', code: 'A-3', n: 3 },
    ];
    await source.collection('alphas').insertMany(alphas);
    await source.collection('alphas').createIndex({ code: 1 }, { unique: true, name: 'code_unique' });
    // More than one 500-document batch.
    const betas = Array.from({ length: 501 }, (_, i) => ({ _id: `b${i}`, i }));
    await source.collection('betas').insertMany(betas);
    // Excluded (credentials) and a view: neither is copied.
    await source.collection('apikeys').insertOne({ _id: 'prod-key', hash: 'fake-hash' });
    await source.createCollection('alphas_view', { viewOn: 'alphas', pipeline: [] });
    // Staging's own rows: alphas is replaced, apikeys is never touched.
    await target.collection('alphas').insertOne({ _id: 'stale', code: 'OLD' });
    await target.collection('apikeys').insertOne({ _id: 'staging-key', hash: 'fake-staging-hash' });

    const started = await dataCloneService.start(OPERATOR);

    expect(started).toMatchObject({
      status: 'RUNNING',
      sourceDatabase: SOURCE_DB,
      targetDatabase: TARGET_DB,
      startedBy: 'ops@example.test',
    });
    expect(started.excluded).toContain('apikeys');
    expect(logWarn).toHaveBeenCalledWith('dataClone', 'start', {
      userId: OPERATOR.id,
      source: SOURCE_DB,
      target: TARGET_DB,
    });

    const job = await settled(started.id);

    expect(job.status).toBe('SUCCEEDED');
    expect(job.error).toBeNull();
    expect(job.currentCollection).toBeNull();
    expect(job.finishedAt).toEqual(expect.any(String));
    expect(job.collections.map((c) => c.name)).toEqual(['alphas', 'betas']);
    expect(job.collections.map((c) => [c.status, c.sourceCount, c.copiedCount])).toEqual([
      ['DONE', 3, 3],
      ['DONE', 501, 501],
    ]);
    expect(job.collectionsDone).toBe(2);
    expect(job.documentsCopied).toBe(504);
    const expectedBytes = [...alphas, ...betas].reduce((sum, d) => sum + mongo.BSON.calculateObjectSize(d), 0);
    expect(job.bytesCopied).toBe(expectedBytes);

    expect(await target.collection('alphas').find({}).sort({ _id: 1 }).toArray()).toEqual(alphas);
    expect(await target.collection('betas').countDocuments()).toBe(501);
    const indexes = await target.collection('alphas').indexes();
    expect(indexes.find((i) => i.name === 'code_unique')).toMatchObject({ key: { code: 1 }, unique: true });
    expect(await target.collection('apikeys').find({}).toArray()).toEqual([
      { _id: 'staging-key', hash: 'fake-staging-hash' },
    ]);
    expect(await target.listCollections({ name: 'alphas_view' }).toArray()).toEqual([]);
  });

  it('marks one failing collection FAILED, still copies the rest, and fails the job', async () => {
    await source.collection('alphas').insertOne({ _id: 'a1' });
    await source.collection('brokens').insertOne({ _id: 'x1' });
    await source.collection('crashes').insertOne({ _id: 'y1' });
    const realInsertMany = mongo.Collection.prototype.insertMany;
    jest.spyOn(mongo.Collection.prototype, 'insertMany').mockImplementation(function (
      this: mongo.Collection,
      ...args: Parameters<mongo.Collection['insertMany']>
    ) {
      if (this.dbName === TARGET_DB && this.collectionName === 'brokens') {
        return Promise.reject(new Error('disk full on staging'));
      }
      if (this.dbName === TARGET_DB && this.collectionName === 'crashes') {
        return Promise.reject('driver gave no Error');
      }
      return realInsertMany.apply(this, args);
    } as any);

    const started = await dataCloneService.start(OPERATOR);
    const job = await settled(started.id);

    expect(job.status).toBe('FAILED');
    expect(job.error).toBe('2 collection(s) failed — see the list below.');
    expect(job.collections.map((c) => [c.name, c.status, c.error])).toEqual([
      ['alphas', 'DONE', null],
      ['brokens', 'FAILED', 'disk full on staging'],
      ['crashes', 'FAILED', 'Copy failed'],
    ]);
    expect(job.collections[1].finishedAt).toEqual(expect.any(String));
    expect(logError).toHaveBeenCalledWith('dataClone', 'copyCollection', {
      error: expect.any(Error),
      jobId: started.id,
      collection: 'brokens',
    });
    expect(await target.collection('alphas').countDocuments()).toBe(1);
  });

  it('fails loudly when the source database has no collections', async () => {
    const started = await dataCloneService.start(OPERATOR);
    const job = await settled(started.id);

    expect(job.status).toBe('FAILED');
    expect(job.error).toBe(
      `Nothing to copy: ${SOURCE_DB} has no collections. Check the production database name in Data Clone -> Settings.`
    );
    expect(job.collections).toEqual([]);
    expect(logError).toHaveBeenCalledWith('dataClone', 'runClone', {
      error: expect.any(Error),
      jobId: started.id,
    });
  });

  it('records a generic message when the walk fails with a non-Error', async () => {
    const realList = mongo.Db.prototype.listCollections;
    jest.spyOn(mongo.Db.prototype, 'listCollections').mockImplementation(function (
      this: mongo.Db,
      ...args: Parameters<mongo.Db['listCollections']>
    ) {
      if (this.databaseName === SOURCE_DB) return { toArray: () => Promise.reject('listing refused') };
      return realList.apply(this, args);
    } as any);

    const started = await dataCloneService.start(OPERATOR);
    const job = await settled(started.id);

    expect(job).toMatchObject({ status: 'FAILED', error: 'Clone failed' });
  });

  it('starts over a stale RUNNING job after repairing it', async () => {
    const stale = await DataCloneJobModel.create({
      status: 'RUNNING',
      source_database: 'src',
      target_database: 'tgt',
      started_at: new Date(Date.now() - 60 * 60_000),
      heartbeat_at: new Date(Date.now() - 60 * 60_000),
    });
    await source.collection('alphas').insertOne({ _id: 'a1' });

    const started = await dataCloneService.start(OPERATOR);
    await settled(started.id);

    expect(started.id).not.toBe(String(stale._id));
    expect(await DataCloneJobModel.findById(stale._id).lean()).toMatchObject({
      status: 'FAILED',
      error: INTERRUPTED,
    });
  });

  it('names the starter by id when the caller has no email', async () => {
    await source.collection('alphas').insertOne({ _id: 'a1' });

    const started = await dataCloneService.start({ ...OPERATOR, email: null });
    await settled(started.id);

    expect(started.startedBy).toBe(OPERATOR.id);
  });

  it('logs (rather than crashes) when the background walk itself throws before it can record anything', async () => {
    resolveEndpoints.mockResolvedValue({ ...endpoints(), sourceUri: 'not-a-mongo-uri' });

    const started = await dataCloneService.start(OPERATOR);
    await new Promise((resolve) => setImmediate(resolve));

    expect(started.status).toBe('RUNNING');
    expect(logError).toHaveBeenCalledWith('dataClone', 'start', {
      error: expect.any(Error),
      jobId: started.id,
    });
  });

  it('propagates an endpoint-resolution refusal without creating a job', async () => {
    resolveEndpoints.mockRejectedValue(new Error('Target resolves to the source database'));

    await expect(dataCloneService.start(OPERATOR)).rejects.toThrow('Target resolves to the source database');
    expect(await DataCloneJobModel.countDocuments()).toBe(0);
  });
});
