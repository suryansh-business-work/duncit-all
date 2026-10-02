import mongoose, { Schema, Types } from 'mongoose';
import { buildSchema, type GraphQLSchema } from 'graphql';
import type { AuthUser, GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import { requestIdentity, type RequestIdentity } from '@observability/requestIdentity';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';

const mockSchema: { current: GraphQLSchema | null } = { current: null };

jest.mock('@modules/platform/graphqlMonitor/graphqlMonitor.plugin', () => ({
  currentSchema: () => mockSchema.current,
}));

import { tableChangeLogPlugin } from '../../tableChangeLog.plugin';
import { TableChangeLogModel } from '../../tableChangeLog.model';
import { tableChangeLogResolvers } from '../../tableChangeLog.resolver';
import { fieldChanges, loggablePaths, readablePath, writeContext } from '../../tableChangeLog.recorder';

interface IDeal {
  title: string;
  city: string;
  amount: number;
  api_key: string;
  updated_at?: Date;
}

const dealSchema = new Schema<IDeal>({
  title: { type: String, required: true },
  city: { type: String, required: true },
  amount: { type: Number, default: 0 },
  api_key: { type: String, default: '' },
  updated_at: { type: Date },
});
dealSchema.plugin(tableChangeLogPlugin);
const DealModel = mongoose.model<IDeal>('ChangeLogTestDeal', dealSchema);
const COLLECTION = DealModel.collection.collectionName;

const DEAL_TABLE: TableEntityConfig = {
  searchFields: ['title'],
  sortFields: { title: 'title' },
  filterFields: { title: { type: 'string' } },
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
  type Deal {
    id: ID!
  }
  type DealPage {
    rows: [Deal!]!
    total: Int!
  }
  type Query {
    cityDealsTable(city: String!, query: TableQueryInput): DealPage!
  }
`;

function buildTestSchema(): GraphQLSchema {
  const schema = buildSchema(SDL);
  const field = schema.getQueryType()?.getFields().cityDealsTable;
  if (field) {
    field.resolve = async (_p, args: { city: string; query?: TableQueryInput }, ctx: GraphQLContext) => {
      requireRole(ctx, ['FINANCE_MANAGER']);
      const page = await runTableQuery<IDeal>(DealModel, { city: args.city }, args.query, DEAL_TABLE);
      return { rows: page.docs, total: page.total };
    };
  }
  return schema;
}

const finance: AuthUser = { id: new Types.ObjectId().toString(), email: 'asha@duncit.com', roles: ['FINANCE_MANAGER'] };
const person: RequestIdentity = {
  user: { id: finance.id, email: finance.email ?? '', roles: finance.roles },
  ip: '203.0.113.7',
  user_agent: 'Mozilla/5.0',
  surface: 'PORTAL',
};

const asPerson = <T>(fn: () => Promise<T>) => requestIdentity.run(person, fn);

/** The log is written after the edit returns; wait for it rather than racing it. */
async function logsFor(docId: unknown, count: number) {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const rows = await TableChangeLogModel.find({ doc_id: String(docId) }).sort({ created_at: 1, _id: 1 }).lean();
    if (rows.length >= count) return rows;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`Expected ${count} change log rows for ${String(docId)}`);
}

const ctxFor = (user: AuthUser) => ({ user }) as unknown as GraphQLContext;

beforeAll(() => {
  mockSchema.current = buildTestSchema();
});

describe('tableChangeLogPlugin — what a person changed', () => {
  it('logs a create, then one row per field an update moved, with who, when and from where', async () => {
    const deal = await asPerson(() => DealModel.create({ title: 'Annual plan', city: 'Pune', amount: 1200 }));
    await asPerson(() =>
      DealModel.updateOne({ _id: deal._id }, { $set: { amount: 1500, city: 'Pune', updated_at: new Date() } }).exec()
    );

    const rows = await logsFor(deal._id, 2);
    expect(rows[0]).toMatchObject({ collection_name: COLLECTION, action: 'CREATE', field: '' });
    // The unchanged city and the timestamp are not edits; the amount is.
    expect(rows.slice(1)).toEqual([
      expect.objectContaining({
        action: 'UPDATE',
        field: 'amount',
        old_value: '1200',
        new_value: '1500',
        actor_email: 'asha@duncit.com',
        actor_roles: ['FINANCE_MANAGER'],
        source: 'PORTAL',
        ip: '203.0.113.7',
        user_agent: 'Mozilla/5.0',
      }),
    ]);
  });

  it('logs a save and a delete, and never copies a secret into the log', async () => {
    const deal = await asPerson(() => DealModel.create({ title: 'Gateway', city: 'Goa', api_key: 'old-key' }));
    deal.api_key = 'new-key';
    deal.title = 'Gateway v2';
    await asPerson(() => deal.save());
    await asPerson(() => DealModel.findOneAndDelete({ _id: deal._id }).exec());

    const rows = await logsFor(deal._id, 4);
    const secret = rows.find((row) => row.field === 'api_key');
    expect(secret).toMatchObject({ old_value: '••••••', new_value: '••••••' });
    expect(rows.find((row) => row.field === 'title')).toMatchObject({ old_value: 'Gateway', new_value: 'Gateway v2' });
    expect(rows.at(-1)).toMatchObject({ action: 'DELETE' });
  });

  it('logs nothing for a write with no person behind it — a sweep, a webhook', async () => {
    const deal = await DealModel.create({ title: 'Swept', city: 'Delhi' });
    await DealModel.updateOne({ _id: deal._id }, { $set: { amount: 9 } }).exec();
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(await TableChangeLogModel.countDocuments({ doc_id: String(deal._id) })).toBe(0);
  });
});

describe('tableChangeLog recorder rules', () => {
  it('reads an array element write at the array, and drops a child its parent covers', () => {
    expect(readablePath('items.$.qty')).toBe('items');
    expect(readablePath('items.3.qty')).toBe('items');
    expect(loggablePaths(['address', 'address.city', 'updated_at', '__v', 'last_seen_at'])).toEqual(['address']);
  });

  it('skips log-like collections and writes outside a request', () => {
    expect(writeContext('emaillogs')).toBeNull();
    expect(writeContext('crmservicecatalogs')).toBeNull();
    expect(requestIdentity.run(person, () => writeContext('crmservicecatalogs'))).not.toBeNull();
    expect(requestIdentity.run(person, () => writeContext('shiprocketsessions'))).toBeNull();
  });

  it('reports only the fields whose value moved', () => {
    expect(fieldChanges(['a', 'b'], { a: 1, b: 2 }, { a: 1, b: 3 })).toEqual([
      { field: 'b', old_value: '2', new_value: '3' },
    ]);
  });
});

describe('tableChangeLogs — the history a table shows its caller', () => {
  const run = (user: AuthUser, variables: Record<string, unknown>, query?: TableQueryInput) =>
    asPerson(() =>
      tableChangeLogResolvers.Query.tableChangeLogs(
        undefined,
        { table: 'cityDealsTable', variables: JSON.stringify(variables), query },
        ctxFor(user)
      )
    );

  it("lists only the logs of the rows the caller's view holds", async () => {
    const pune = await asPerson(() => DealModel.create({ title: 'Pune lead', city: 'Pune' }));
    const goa = await asPerson(() => DealModel.create({ title: 'Goa lead', city: 'Goa' }));
    await logsFor(pune._id, 1);
    await logsFor(goa._id, 1);

    const page = await run(finance, { city: 'Pune' });
    const ids = new Set(page.rows.map((row) => row.doc_id));
    expect(ids.has(String(pune._id))).toBe(true);
    expect(ids.has(String(goa._id))).toBe(false);
    expect(page.total).toBe(page.rows.length);
  });

  it("refuses a caller the table's own resolver refuses", async () => {
    const outsider: AuthUser = { id: new Types.ObjectId().toString(), roles: ['USER'] };
    await expect(run(outsider, { city: 'Pune' })).rejects.toThrow();
  });

  it('refuses a name that is not a table query', async () => {
    await expect(
      tableChangeLogResolvers.Query.tableChangeLogs(undefined, { table: 'deleteEverything', variables: '{}' }, ctxFor(finance))
    ).rejects.toThrow(/has no change log/);
  });
});
