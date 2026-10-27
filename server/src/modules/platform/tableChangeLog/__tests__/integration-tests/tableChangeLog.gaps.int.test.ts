/**
 * The change log's remaining corners, against a real database: edits that are
 * only timestamps, deletes with nobody behind them or nothing to delete, a
 * person whose token carries little, and the history a table shows when the
 * view is the whole collection, when it is not read from one collection at all,
 * and when it is asked for outside a request.
 */
import mongoose, { Schema, Types } from 'mongoose';
import { buildSchema, type GraphQLSchema } from 'graphql';
import type { AuthUser, GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import { logs } from '@observability/log';
import { requestIdentity, type RequestIdentity } from '@observability/requestIdentity';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';

const mockSchema: { current: GraphQLSchema | null } = { current: null };

jest.mock('@modules/platform/graphqlMonitor/graphqlMonitor.plugin', () => ({
  currentSchema: () => mockSchema.current,
}));

import { tableChangeLogPlugin } from '../../tableChangeLog.plugin';
import { TableChangeLogModel } from '../../tableChangeLog.model';
import { tableChangeLogResolvers } from '../../tableChangeLog.resolver';

interface IGadget {
  title: string;
  city: string;
  updated_at?: Date;
}

const gadgetSchema = new Schema<IGadget>({
  title: { type: String, required: true },
  city: { type: String, required: true },
  updated_at: { type: Date },
});
gadgetSchema.plugin(tableChangeLogPlugin);
const GadgetModel = mongoose.model<IGadget>('ChangeLogGapsGadget', gadgetSchema);

const GADGET_TABLE: TableEntityConfig = {
  searchFields: ['title'],
  sortFields: { title: 'title' },
  filterFields: { title: { type: 'string' } },
  defaultSort: { _id: -1 },
};

const SDL = /* GraphQL */ `
  input TableQueryInput {
    search: String
    page: Int
    page_size: Int
  }
  type Gadget {
    id: ID!
  }
  type GadgetPage {
    rows: [Gadget!]!
    total: Int!
  }
  type Query {
    cityGadgetsTable(city: String, query: TableQueryInput): GadgetPage!
    summaryGadgetsTable(query: TableQueryInput): GadgetPage!
  }
`;

function buildTestSchema(): GraphQLSchema {
  const schema = buildSchema(SDL);
  const fields = schema.getQueryType()?.getFields() ?? {};
  fields.cityGadgetsTable.resolve = async (_p, args: { city?: string; query?: TableQueryInput }, ctx: GraphQLContext) => {
    requireRole(ctx, ['FINANCE_MANAGER']);
    const page = await runTableQuery<IGadget>(GadgetModel, args.city ? { city: args.city } : {}, args.query, GADGET_TABLE);
    return { rows: page.docs, total: page.total };
  };
  // A table that is not read from one collection: it never goes through runTableQuery.
  fields.summaryGadgetsTable.resolve = async (_p, _a, ctx: GraphQLContext) => {
    requireRole(ctx, ['FINANCE_MANAGER']);
    return { rows: [], total: 0 };
  };
  return schema;
}

const finance: AuthUser = { id: new Types.ObjectId().toString(), email: 'asha@duncit.com', roles: ['FINANCE_MANAGER'] };
const person: RequestIdentity = { user: { id: finance.id, email: finance.email ?? '', roles: finance.roles }, ip: '203.0.113.7', user_agent: 'UA/1', surface: 'PORTAL' };
const asPerson = <T>(fn: () => Promise<T>) => requestIdentity.run(person, fn);
const ctxFor = (user: AuthUser) => ({ user }) as unknown as GraphQLContext;
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** The log is written after the edit returns; wait for it rather than racing it. */
async function logsFor(docId: unknown, count: number) {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const rows = await TableChangeLogModel.find({ doc_id: String(docId) }).sort({ created_at: 1, _id: 1 }).lean();
    if (rows.length >= count) return rows;
    await pause(20);
  }
  throw new Error(`Expected ${count} change log rows for ${String(docId)}`);
}

const countFor = (docId: unknown) => TableChangeLogModel.countDocuments({ doc_id: String(docId) });

beforeAll(() => {
  mockSchema.current = buildTestSchema();
});

describe('edits that are not edits', () => {
  it('logs nothing for a save or an update that only moved a timestamp', async () => {
    const gadget = await asPerson(() => GadgetModel.create({ title: 'Lamp', city: 'Pune' }));
    await logsFor(gadget._id, 1);
    gadget.updated_at = new Date();
    await asPerson(() => gadget.save());
    await asPerson(() => GadgetModel.updateOne({ _id: gadget._id }, { $set: { updated_at: new Date() } }).exec());
    await pause(150);
    expect(await countFor(gadget._id)).toBe(1);
  });

  it('logs nothing for an update that wrote the value already stored', async () => {
    const gadget = await asPerson(() => GadgetModel.create({ title: 'Lamp', city: 'Pune' }));
    await logsFor(gadget._id, 1);
    await asPerson(() => GadgetModel.updateOne({ _id: gadget._id }, { $set: { city: 'Pune' } }).exec());
    await pause(150);
    expect(await countFor(gadget._id)).toBe(1);
  });
});

describe('a log that cannot be written', () => {
  it('does not fail the edit, and says so in the log', async () => {
    const error = jest.spyOn(logs.server, 'error').mockImplementation(() => undefined as never);
    const insert = jest.spyOn(TableChangeLogModel, 'insertMany').mockRejectedValue(new Error('log store down') as never);
    const gadget = await asPerson(() => GadgetModel.create({ title: 'Lamp', city: 'Pune' }));
    for (let attempt = 0; attempt < 100 && error.mock.calls.length === 0; attempt += 1) await pause(20);
    insert.mockRestore();
    expect(await GadgetModel.exists({ _id: gadget._id })).not.toBeNull();
    expect(error).toHaveBeenCalledWith('tableChangeLog', 'record', expect.objectContaining({ error: expect.any(Error) }));
    error.mockRestore();
  });
});

describe('deletes', () => {
  it('logs a delete made by a person, and nothing for a delete with nobody behind it', async () => {
    const mine = await GadgetModel.create({ title: 'Swept', city: 'Delhi' });
    await GadgetModel.deleteOne({ _id: mine._id }).exec();
    await pause(150);
    expect(await countFor(mine._id)).toBe(0);
    const theirs = await asPerson(() => GadgetModel.create({ title: 'Removed', city: 'Goa' }));
    await asPerson(() => GadgetModel.deleteOne({ _id: theirs._id }).exec());
    expect((await logsFor(theirs._id, 2)).at(-1)).toMatchObject({ action: 'DELETE' });
  });

  it('logs nothing for a delete that found nothing to delete', async () => {
    const before = await TableChangeLogModel.countDocuments();
    await asPerson(() => GadgetModel.deleteOne({ _id: new Types.ObjectId() }).exec());
    await asPerson(() => GadgetModel.findOneAndDelete({ _id: new Types.ObjectId() }).exec());
    await pause(150);
    expect(await TableChangeLogModel.countDocuments()).toBe(before);
  });
});

describe('a person whose token carries little', () => {
  it('is logged with blanks for what the token and the request did not say, and no account link for an id that is not one', async () => {
    const sparse: RequestIdentity = { user: { id: 'service-account-7' } };
    const gadget = await requestIdentity.run(sparse, () => GadgetModel.create({ title: 'Lamp', city: 'Pune' }));
    const [row] = await logsFor(gadget._id, 1);
    expect(row).toMatchObject({ action: 'CREATE', actor_user_id: null, actor_email: '', actor_roles: [], ip: '', user_agent: '' });
  });
});

describe('the history a table shows', () => {
  const run = (variables: Record<string, unknown>, table = 'cityGadgetsTable', user = finance, query?: TableQueryInput) =>
    asPerson(() => tableChangeLogResolvers.Query.tableChangeLogs(undefined, { table, variables: JSON.stringify(variables), query }, ctxFor(user)));

  it('shows every record’s history when the view is the whole collection, rows with no account link included', async () => {
    const a = await requestIdentity.run({ user: { id: 'service-account-7' } }, () => GadgetModel.create({ title: 'A', city: 'Pune' }));
    const b = await asPerson(() => GadgetModel.create({ title: 'B', city: 'Goa' }));
    await logsFor(a._id, 1);
    await logsFor(b._id, 1);
    const page = await run({});
    expect(new Set(page.rows.map((r) => r.doc_id))).toEqual(new Set([String(a._id), String(b._id)]));
    expect(page.rows.find((r) => r.doc_id === String(a._id))?.actor_user_id).toBeNull();
    expect(page.rows.find((r) => r.doc_id === String(b._id))?.actor_user_id).toBe(finance.id);
  });

  it('refuses a table that is not read from a single collection', async () => {
    await expect(run({}, 'summaryGadgetsTable')).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' }, message: expect.stringContaining('single collection') });
  });

  it('works for a caller whose request carries no identity of its own', async () => {
    const gadget = await asPerson(() => GadgetModel.create({ title: 'A', city: 'Pune' }));
    await logsFor(gadget._id, 1);
    const page = await tableChangeLogResolvers.Query.tableChangeLogs(
      undefined,
      { table: 'cityGadgetsTable', variables: JSON.stringify({ city: 'Pune' }) },
      ctxFor(finance),
    );
    expect(page.rows.map((r) => r.doc_id)).toEqual([String(gadget._id)]);
  });
});
