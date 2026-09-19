import mongoose, { Schema, Types } from 'mongoose';
import { GraphQLError, buildSchema, type GraphQLFieldResolver, type GraphQLSchema } from 'graphql';
import type { AuthUser, GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import { logs } from '@observability/log';
import { requestIdentity } from '@observability/requestIdentity';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';

const mockSchema: { current: GraphQLSchema | null } = { current: null };

jest.mock('@modules/platform/graphqlMonitor/graphqlMonitor.plugin', () => ({
  currentSchema: () => mockSchema.current,
}));

jest.mock('../../bulkDelete.targets', () => ({
  BULK_DELETE_TARGETS: {
    clubLeadsTable: { mutation: 'deleteClubLead', idArg: 'lead_id', roles: ['CRM_MANAGER', 'SUPPORT_USER'] },
    archivedLeadsTable: { mutation: 'deleteClubLead', idArg: 'lead_id', roles: ['CRM_MANAGER'] },
    flakyLeadsTable: { mutation: 'deleteClubLead', idArg: 'lead_id', roles: ['CRM_MANAGER'] },
    retiredLeadsTable: { mutation: 'deleteRetiredLead', roles: ['CRM_MANAGER'] },
  },
}));

import { BackgroundJobModel } from '../../backgroundJob.model';
import { backgroundJobResolvers } from '../../backgroundJob.resolver';
import { backgroundJobService } from '../../backgroundJob.service';
import { resumeBackgroundJobs, scheduleJob } from '../../backgroundJob.runner';

interface ILead {
  name: string;
  city: string;
}

const LeadModel = mongoose.model<ILead>(
  'BulkDeleteTestLead',
  new Schema<ILead>({ name: { type: String, required: true }, city: { type: String, required: true } })
);

const LEAD_TABLE: TableEntityConfig = {
  searchFields: ['name'],
  sortFields: { name: 'name' },
  filterFields: { name: { type: 'string' } },
  defaultSort: { _id: -1 },
};

const SDL = /* GraphQL */ `
  input TableFilterInput {
    field: String!
    op: String!
    value: String
  }
  input TableQueryInput {
    search: String
    page: Int
    page_size: Int
    filters: [TableFilterInput!]
  }
  type Lead {
    id: ID!
  }
  type LeadPage {
    rows: [Lead!]!
    total: Int!
  }
  type Query {
    clubLeadsTable(city: String!, query: TableQueryInput): LeadPage!
    archivedLeadsTable(query: TableQueryInput): LeadPage!
    flakyLeadsTable(query: TableQueryInput): LeadPage!
  }
  type Mutation {
    deleteClubLead(lead_id: ID!): Boolean!
  }
`;

/** What the delete mutation saw — who asked, and from which address. */
const deletes: Array<{ id: string; user?: string; ip?: string }> = [];
/** A lead the delete waits on until the test lets it through. */
const hold: { name: string; release: (() => void) | null } = { name: '', release: null };
let flakyReads = 0;

const page = async (base: Record<string, unknown>, query: TableQueryInput | undefined, includeDeleted = false) => {
  const result = await runTableQuery<ILead>(LeadModel, base, query, LEAD_TABLE, { includeDeleted });
  return { rows: result.docs, total: result.total };
};

function attach(schema: GraphQLSchema, field: string, fn: GraphQLFieldResolver<unknown, GraphQLContext, any>) {
  const root = schema.getQueryType()?.getFields()[field] ?? schema.getMutationType()?.getFields()[field];
  if (root) root.resolve = fn;
}

function buildTestSchema(): GraphQLSchema {
  const schema = buildSchema(SDL);
  attach(schema, 'clubLeadsTable', (_p, args: { city: string; query?: TableQueryInput }, ctx) => {
    requireRole(ctx, ['CRM_MANAGER']);
    return page({ city: args.city }, args.query);
  });
  attach(schema, 'archivedLeadsTable', (_p, args: { query?: TableQueryInput }) => page({}, args.query, true));
  attach(schema, 'flakyLeadsTable', (_p, args: { query?: TableQueryInput }) => {
    flakyReads += 1;
    if (flakyReads > 1) throw new Error('Lead store is offline');
    return page({}, args.query);
  });
  attach(schema, 'deleteClubLead', async (_p, args: { lead_id: string }, ctx) => {
    const lead = await LeadModel.findById(args.lead_id).lean();
    if (lead?.name === 'Locked Lead') throw new GraphQLError('This lead has an open deal');
    if (lead?.name === hold.name) {
      await new Promise<void>((resolve) => {
        hold.release = resolve;
      });
    }
    deletes.push({ id: args.lead_id, user: ctx.user?.id, ip: requestIdentity.current()?.ip });
    await LeadModel.deleteOne({ _id: args.lead_id });
    return true;
  });
  return schema;
}

const manager: AuthUser = { id: new Types.ObjectId().toString(), email: 'meera@duncit.com', roles: ['CRM_MANAGER'] };
const support: AuthUser = { id: new Types.ObjectId().toString(), roles: ['SUPPORT_USER'] };

const vars = (value: Record<string, unknown>) => JSON.stringify(value);

async function seedLeads(city: string, names: string[]) {
  const docs = await LeadModel.insertMany(names.map((name) => ({ name, city })));
  return docs.map((doc) => String(doc._id));
}

async function settled(id: string) {
  for (let attempt = 0; attempt < 400; attempt += 1) {
    const job = await BackgroundJobModel.findById(id).lean();
    if (job && job.status !== 'RUNNING') return job;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`Job ${id} never settled`);
}

async function until(check: () => boolean) {
  for (let attempt = 0; attempt < 400 && !check(); attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

beforeEach(() => {
  mockSchema.current = buildTestSchema();
  deletes.length = 0;
  hold.name = '';
  hold.release = null;
  flakyReads = 0;
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('backgroundJobService.deletableTables', () => {
  it("offers only the tables the person's roles reach and the schema can run", () => {
    const error = jest.spyOn(logs.server, 'error').mockImplementation(() => undefined);
    expect(backgroundJobService.deletableTables(manager)).toEqual([
      'clubLeadsTable',
      'archivedLeadsTable',
      'flakyLeadsTable',
    ]);
    expect(backgroundJobService.deletableTables(support)).toEqual(['clubLeadsTable']);
    expect(error).toHaveBeenCalledWith('backgroundJob', 'target', expect.objectContaining({ table: 'retiredLeadsTable' }));
  });
});

describe('backgroundJobService.startBulkDelete — ALL', () => {
  it('deletes every matching lead in batches, as the actor, and leaves the rest', async () => {
    const lucknow = await seedLeads(
      'Lucknow',
      Array.from({ length: 27 }, (_, n) => `Gomti Nagar Lead ${n + 1}`)
    );
    await seedLeads('Lucknow', ['Hazratganj Lead']);
    await seedLeads('Pune', ['Gomti Nagar Lead Pune']);

    const started = await requestIdentity.run({ user: { id: manager.id }, ip: '103.21.4.9' }, () =>
      backgroundJobService.startBulkDelete(manager, {
        table: 'clubLeadsTable',
        mode: 'ALL',
        variables: vars({ city: 'Lucknow', query: { search: 'Gomti', page: 3, page_size: 10 } }),
        label: 'Club leads',
        url: 'https://staging.crm.duncit.com/club-leads',
      })
    );
    expect(started).toMatchObject({ table: 'clubLeadsTable', mode: 'ALL', status: 'RUNNING', total: 27 });

    const job = await settled(started.id);
    expect(job).toMatchObject({ status: 'COMPLETED', succeeded: 27, failed: 0, error_message: '' });
    expect(deletes.map((row) => row.id).sort((a, b) => a.localeCompare(b))).toEqual(
      [...lucknow].sort((a, b) => a.localeCompare(b))
    );
    expect(deletes.every((row) => row.user === manager.id && row.ip === '103.21.4.9')).toBe(true);
    const left = await LeadModel.find().lean();
    expect(left.map((lead) => lead.name).sort((a, b) => a.localeCompare(b))).toEqual([
      'Gomti Nagar Lead Pune',
      'Hazratganj Lead',
    ]);

    const mine = await backgroundJobService.mine(manager);
    expect(mine[0]).toMatchObject({ id: started.id, label: 'Club leads', status: 'COMPLETED' });
    expect(typeof mine[0]?.finished_at).toBe('string');
  });

  it("honours a table's soft-delete opt-in and runs without a request identity", async () => {
    await seedLeads('Lucknow', ['Aliganj Lead', 'Indira Nagar Lead']);
    const started = await backgroundJobService.startBulkDelete(manager, {
      table: 'archivedLeadsTable',
      mode: 'ALL',
      variables: vars({}),
    });
    expect(started).toMatchObject({ label: '', url: '', finished_at: null });
    expect(await settled(started.id)).toMatchObject({ status: 'COMPLETED', succeeded: 2 });
    expect(deletes.every((row) => row.ip === undefined)).toBe(true);
  });

  it('fails the job with the reason when the table can no longer be read', async () => {
    const error = jest.spyOn(logs.server, 'error').mockImplementation(() => undefined);
    await seedLeads('Lucknow', ['Kapoorthala Lead']);
    const started = await backgroundJobService.startBulkDelete(manager, {
      table: 'flakyLeadsTable',
      mode: 'ALL',
      variables: vars({}),
    });
    expect(await settled(started.id)).toMatchObject({ status: 'FAILED', error_message: 'Lead store is offline' });
    expect(error).toHaveBeenCalledWith('backgroundJob', 'step', expect.objectContaining({ table: 'flakyLeadsTable' }));
    expect(await LeadModel.countDocuments()).toBe(1);
  });
});

describe('backgroundJobService.startBulkDelete — SELECTED', () => {
  it('deletes only the ticked leads and records the ones their delete refused', async () => {
    const [first, second, third] = await seedLeads('Lucknow', ['Mahanagar Lead', 'Locked Lead', 'Chowk Lead']);
    const started = await backgroundJobService.startBulkDelete(manager, {
      table: 'clubLeadsTable',
      mode: 'SELECTED',
      variables: vars({ city: 'Lucknow' }),
      ids: [` ${first} `, String(second), String(first), ''],
      label: null,
      url: null,
    });
    expect(started.total).toBe(2);
    const job = await settled(started.id);
    expect(job).toMatchObject({ status: 'COMPLETED', succeeded: 1, failed: 1 });
    expect(job.failures).toEqual([{ id: second, message: 'This lead has an open deal' }]);
    expect((await backgroundJobService.mine(manager))[0]?.failures).toEqual([
      { id: second, message: 'This lead has an open deal' },
    ]);
    expect(await LeadModel.exists({ _id: third })).not.toBeNull();
    expect(await LeadModel.exists({ _id: first })).toBeNull();
  });
});

describe('backgroundJobService.startBulkDelete — refusals', () => {
  const start = (user: AuthUser, input: Partial<Parameters<typeof backgroundJobService.startBulkDelete>[1]>) =>
    backgroundJobService.startBulkDelete(user, {
      table: 'clubLeadsTable',
      mode: 'SELECTED',
      variables: vars({ city: 'Lucknow' }),
      ids: [new Types.ObjectId().toString()],
      ...input,
    });

  it('refuses a table that is not registered, and a person without its roles', async () => {
    await expect(start(manager, { table: 'paymentsTable' })).rejects.toThrow('This table does not support bulk delete.');
    await expect(start({ id: 'u-ravi', roles: ['HOST'] }, {})).rejects.toMatchObject({
      extensions: { code: 'FORBIDDEN' },
    });
  });

  it("carries the table's own refusal to read", async () => {
    await expect(start(support, {})).rejects.toThrow('Access Denied');
  });

  it('refuses an empty, oversized or unreadable selection', async () => {
    await expect(start(manager, { ids: [' ', ''] })).rejects.toThrow('Select at least one row to delete.');
    await expect(start(manager, { ids: null })).rejects.toThrow('Select at least one row to delete.');
    const many = Array.from({ length: 501 }, () => new Types.ObjectId().toString());
    await expect(start(manager, { ids: many })).rejects.toThrow('Select at most 500 rows at a time.');
    await expect(start(manager, { ids: ['DUN-LEAD-4821'] })).rejects.toThrow(
      'The selected rows could not be identified.'
    );
  });

  it('refuses variables that are not a JSON object', async () => {
    for (const variables of ['{city:', '[]', 'null', '42']) {
      await expect(start(manager, { variables })).rejects.toThrow('The table query could not be read.');
    }
  });

  it('refuses a scope with nothing in it', async () => {
    await expect(start(manager, { mode: 'ALL', variables: vars({ city: 'Kanpur' }) })).rejects.toThrow(
      'No rows match — there is nothing to delete.'
    );
  });
});

describe('cancel, dismiss and clear', () => {
  it('stops a running job after the batch in hand', async () => {
    await seedLeads('Lucknow', ['Hold Lead']);
    await seedLeads('Lucknow', Array.from({ length: 30 }, (_, n) => `Batch Lead ${n + 1}`));
    hold.name = 'Hold Lead';
    const started = await backgroundJobService.startBulkDelete(manager, {
      table: 'clubLeadsTable',
      mode: 'ALL',
      variables: vars({ city: 'Lucknow' }),
    });
    await until(() => hold.release !== null);

    expect(await backgroundJobService.dismiss(manager, started.id)).toBe(false);
    const cancelled = await backgroundJobService.cancel(manager, started.id);
    expect(cancelled).toMatchObject({ status: 'CANCELLED' });
    hold.release?.();

    await until(() => deletes.length === 25);
    await new Promise((resolve) => setTimeout(resolve, 200));
    const job = await BackgroundJobModel.findById(started.id).lean();
    expect(job).toMatchObject({ status: 'CANCELLED', succeeded: 25 });
    expect(await LeadModel.countDocuments()).toBe(6);
    await expect(backgroundJobService.cancel(manager, started.id)).rejects.toThrow('That job is no longer running.');

    expect(await backgroundJobService.dismiss(manager, started.id)).toBe(true);
    expect(await backgroundJobService.mine(manager)).toEqual([]);
  });

  it('clears every finished job at once', async () => {
    await BackgroundJobModel.create([
      { table: 'clubLeadsTable', mode: 'ALL', status: 'COMPLETED', finished_at: new Date(), actor: manager },
      { table: 'clubLeadsTable', mode: 'ALL', status: 'FAILED', finished_at: new Date(), actor: manager },
      { table: 'clubLeadsTable', mode: 'ALL', status: 'COMPLETED', finished_at: new Date(), actor: support },
    ]);
    expect(await backgroundJobService.clearFinished(manager)).toBe(2);
    expect(await backgroundJobService.mine(manager)).toEqual([]);
    expect(await backgroundJobService.mine(support)).toHaveLength(1);
  });
});

describe('bulk delete runner', () => {
  it('waits out a lease another process holds, then takes the job over', async () => {
    const ids = await seedLeads('Lucknow', ['Vikas Nagar Lead']);
    const job = await BackgroundJobModel.create({
      table: 'clubLeadsTable',
      mode: 'SELECTED',
      ids,
      variables: { city: 'Lucknow' },
      total: 1,
      actor: manager,
      lease_owner: 'old-container',
      lease_until: new Date(Date.now() + 60_000),
    });
    const realSetTimeout = globalThis.setTimeout;
    let retry: (() => void) | null = null;
    jest.spyOn(globalThis, 'setTimeout').mockImplementation(((fn: () => void, ms?: number) => {
      if (ms === 120_000) {
        retry = fn;
        return 0;
      }
      return realSetTimeout(fn, ms);
    }) as unknown as typeof setTimeout);

    await resumeBackgroundJobs();
    await until(() => retry !== null);
    expect(await BackgroundJobModel.findById(job._id).lean()).toMatchObject({ status: 'RUNNING', succeeded: 0 });

    await BackgroundJobModel.updateOne({ _id: job._id }, { $set: { lease_until: new Date(Date.now() - 1000) } });
    (retry as unknown as () => void)();
    expect(await settled(String(job._id))).toMatchObject({ status: 'COMPLETED', succeeded: 1 });
  });

  it('fails a job whose table was unregistered while it waited', async () => {
    const error = jest.spyOn(logs.server, 'error').mockImplementation(() => undefined);
    const job = await BackgroundJobModel.create({
      table: 'retiredLeadsTable',
      mode: 'ALL',
      actor: manager,
    });
    scheduleJob(String(job._id));
    scheduleJob(String(job._id));
    expect(await settled(String(job._id))).toMatchObject({
      status: 'FAILED',
      error_message: 'This table no longer supports bulk delete.',
    });
    expect(error).toHaveBeenCalledWith('backgroundJob', 'step', expect.anything());
  });

  it('records a non-Error failure as text', async () => {
    jest.spyOn(logs.server, 'error').mockImplementation(() => undefined);
    await seedLeads('Lucknow', ['Rajajipuram Lead']);
    const realUpdate = BackgroundJobModel.updateOne.bind(BackgroundJobModel);
    // A driver can reject with anything; the job still has to say what happened.
    const conflict: unknown = 'write conflict';
    let calls = 0;
    jest.spyOn(BackgroundJobModel, 'updateOne').mockImplementation(((...args: Parameters<typeof realUpdate>) => {
      calls += 1;
      if (calls === 1) return Promise.reject(conflict);
      return realUpdate(...args);
    }) as unknown as typeof BackgroundJobModel.updateOne);
    const started = await backgroundJobService.startBulkDelete(manager, {
      table: 'clubLeadsTable',
      mode: 'ALL',
      variables: vars({ city: 'Lucknow' }),
    });
    expect(await settled(started.id)).toMatchObject({ status: 'FAILED', error_message: 'write conflict' });
  });

  it('logs and lets go of a job when the claim itself breaks', async () => {
    const error = jest.spyOn(logs.server, 'error').mockImplementation(() => undefined);
    const job = await BackgroundJobModel.create({
      table: 'clubLeadsTable',
      mode: 'ALL',
      variables: { city: 'Lucknow' },
      actor: manager,
    });
    const realClaim = BackgroundJobModel.findOneAndUpdate.bind(BackgroundJobModel);
    const claim = jest.spyOn(BackgroundJobModel, 'findOneAndUpdate').mockImplementationOnce((() => ({
      lean: () => Promise.reject(new Error('Mongo primary stepped down')),
    })) as unknown as typeof realClaim);
    scheduleJob(String(job._id));
    await until(() => error.mock.calls.some((call) => call[1] === 'loop'));
    expect(error).toHaveBeenCalledWith('backgroundJob', 'loop', expect.objectContaining({ job_id: String(job._id) }));
    claim.mockRestore();

    // Let go means a later schedule picks it up again.
    scheduleJob(String(job._id));
    expect(await settled(String(job._id))).toMatchObject({ status: 'COMPLETED', succeeded: 0 });
  });
});

describe('backgroundJobResolvers', () => {
  const ctx = (user: AuthUser | null) => ({ user }) as GraphQLContext;

  it('scopes every operation to the signed-in person', async () => {
    jest.spyOn(logs.server, 'error').mockImplementation(() => undefined);
    const ids = await seedLeads('Lucknow', ['Alambagh Lead']);
    const { Query, Mutation } = backgroundJobResolvers;
    expect(Query.bulkDeletableTables(null, {}, ctx(support))).toEqual(['clubLeadsTable']);
    const started = await Mutation.startBulkDelete(
      null,
      { input: { table: 'clubLeadsTable', mode: 'SELECTED', ids, variables: vars({ city: 'Lucknow' }) } },
      ctx(manager)
    );
    await settled(started.id);
    expect(await Query.myBackgroundJobs(null, {}, ctx(manager))).toHaveLength(1);
    await expect(Mutation.cancelBackgroundJob(null, { id: started.id }, ctx(manager))).rejects.toThrow(
      'That job is no longer running.'
    );
    expect(await Mutation.dismissBackgroundJob(null, { id: started.id }, ctx(manager))).toBe(true);
    expect(await Mutation.clearFinishedBackgroundJobs(null, {}, ctx(manager))).toBe(0);
    expect(() => Query.myBackgroundJobs(null, {}, ctx(null))).toThrow('Not authenticated');
  });
});
