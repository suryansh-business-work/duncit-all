import { GraphQLError, buildSchema, print, type GraphQLFieldResolver, type GraphQLSchema } from 'graphql';
import { logs } from '@observability/log';
import { requestIdentity } from '@observability/requestIdentity';
import { runTableQuery, type TableQueryInput } from '@utils/table-query';

const mockSchema: { current: GraphQLSchema | null } = { current: null };

jest.mock('@modules/platform/graphqlMonitor/graphqlMonitor.plugin', () => ({
  currentSchema: () => mockSchema.current,
}));

jest.mock('../../bulkDelete.targets', () => ({
  BULK_DELETE_TARGETS: {
    podPlansTable: { mutation: 'deletePodPlan', idArg: 'plan_id', roles: ['SUPER_ADMIN', 'CITY_ADMIN'] },
    couponsTable: { mutation: 'deleteCoupon', roles: ['SUPER_ADMIN'] },
    faqsTable: { mutation: 'deleteFaq', roles: ['SUPER_ADMIN'] },
    policiesTable: { mutation: 'deletePolicy', roles: ['SUPER_ADMIN'] },
    contractsTable: { mutation: 'deleteContract', roles: ['SUPER_ADMIN'] },
    surveysTable: { mutation: 'deleteSurvey', roles: ['SUPER_ADMIN'] },
    brokenPageTable: { mutation: 'deleteCoupon', roles: ['SUPER_ADMIN'] },
    noQueryTable: { mutation: 'deleteCoupon', roles: ['SUPER_ADMIN'] },
    noMutationTable: { mutation: 'deleteCoupon', roles: ['SUPER_ADMIN'] },
    computedTable: { mutation: 'deleteCoupon', roles: ['SUPER_ADMIN'] },
  },
}));

import {
  bulkDeleteOperations,
  captureScope,
  jobContext,
  runAs,
} from '../../bulkDelete.operations';

const SDL = /* GraphQL */ `
  input TableQueryInput {
    search: String
    page: Int
    page_size: Int
  }
  type Plan {
    id: ID!
    name: String
  }
  type PlanPage {
    rows: [Plan!]!
    total: Int!
  }
  type NoTotalPage {
    rows: [Plan!]!
  }
  type Query {
    podPlansTable(city: String!, query: TableQueryInput): PlanPage!
    couponsTable: PlanPage!
    faqsTable(query: TableQueryInput): PlanPage!
    policiesTable(query: TableQueryInput): PlanPage!
    contractsTable(query: TableQueryInput): PlanPage!
    brokenPageTable(query: TableQueryInput): NoTotalPage!
    computedTable(query: TableQueryInput): PlanPage!
  }
  type Mutation {
    deletePodPlan(plan_id: ID!, reason: String, notify: Boolean! = false): Plan
    deleteCoupon(id: ID!): Boolean!
    deleteFaq(faq_doc_id: ID): Boolean!
    deletePolicy(id: ID!, confirm: String!): Boolean!
  }
`;

const actor = { id: 'u-asha', email: 'asha@duncit.com', roles: ['SUPER_ADMIN'] };
const identity = { user: { id: 'u-asha', email: 'asha@duncit.com' }, ip: '10.1.2.3', surface: 'PORTAL' };

const planRows = [{ id: 'DUN-PLAN-11', name: 'Weekend Badminton' }];
const planModel = {
  find: () => {
    const query = {
      sort: () => query,
      skip: () => query,
      limit: () => query,
      then: (resolve: (rows: unknown[]) => unknown) => resolve(planRows),
    };
    return query;
  },
  countDocuments: () => Promise.resolve(planRows.length),
};

const seen: { args?: Record<string, unknown>; ip?: string; user?: unknown } = {};

function resolve(schema: GraphQLSchema, type: 'Query' | 'Mutation', field: string, fn: GraphQLFieldResolver<unknown, any>) {
  const target = type === 'Query' ? schema.getQueryType() : schema.getMutationType();
  const definition = target?.getFields()[field];
  if (definition) definition.resolve = fn;
}

function fullSchema(): GraphQLSchema {
  const schema = buildSchema(SDL);
  resolve(schema, 'Query', 'podPlansTable', async (_p, args: { city: string; query?: TableQueryInput }) => {
    seen.args = args;
    const page = await runTableQuery(planModel, { city: args.city }, args.query, {
      searchFields: ['name'],
      sortFields: {},
      filterFields: {},
      defaultSort: { created_at: -1 },
    });
    return { rows: page.docs, total: page.total };
  });
  resolve(schema, 'Query', 'computedTable', () => ({ rows: planRows, total: 1 }));
  resolve(schema, 'Mutation', 'deletePodPlan', (_p, args, ctx: { user: unknown }) => {
    seen.args = args;
    seen.user = ctx.user;
    seen.ip = requestIdentity.current()?.ip;
    return { id: args.plan_id, name: 'Weekend Badminton' };
  });
  resolve(schema, 'Mutation', 'deleteCoupon', () => {
    throw new GraphQLError('That coupon has been redeemed', { extensions: { code: 'BAD_USER_INPUT' } });
  });
  return schema;
}

beforeEach(() => {
  mockSchema.current = fullSchema();
  delete seen.args;
  delete seen.ip;
  delete seen.user;
});

describe('jobContext', () => {
  it('is a signed-in context with no request behind it', () => {
    const ctx = jobContext(actor);
    expect(ctx.user).toEqual({ id: 'u-asha', email: 'asha@duncit.com', roles: ['SUPER_ADMIN'] });
    expect(ctx.device_id).toBeNull();
    expect(ctx.noRedis).toBe(true);
    expect(ctx.isClientGone()).toBe(false);
  });
});

describe('bulkDeleteOperations', () => {
  it('builds the table read and the row delete from the schema, once', () => {
    const ops = bulkDeleteOperations('podPlansTable');
    expect(ops?.idArg).toBe('plan_id');
    expect(ops?.roles).toEqual(['SUPER_ADMIN', 'CITY_ADMIN']);
    expect(print(ops!.scope)).toContain('podPlansTable(city: $city, query: $query) {\n    total\n  }');
    expect(print(ops!.remove)).toContain(
      'deletePodPlan(plan_id: $plan_id, reason: $reason, notify: $notify) {\n    __typename\n  }',
    );
    mockSchema.current = fullSchema();
    expect(bulkDeleteOperations('podPlansTable')).toBe(ops);
  });

  it('selects nothing under a mutation that answers a scalar, and defaults the id argument', () => {
    const ops = bulkDeleteOperations('couponsTable');
    expect(ops?.idArg).toBe('id');
    expect(print(ops!.scope)).toContain('couponsTable {');
    expect(print(ops!.remove)).toContain('deleteCoupon(id: $id)\n}');
  });

  it('refuses a table that is not registered', () => {
    expect(bulkDeleteOperations('usersTable')).toBeNull();
  });

  it('answers null until Apollo has a schema, without caching that', () => {
    mockSchema.current = null;
    expect(bulkDeleteOperations('surveysTable')).toBeNull();
  });

  it('drops a registration the schema cannot honour', () => {
    const error = jest.spyOn(logs.server, 'error').mockImplementation(() => undefined);
    // No such table query, no such mutation, an id argument the mutation lacks,
    // and a second required argument the job cannot fill.
    expect(bulkDeleteOperations('surveysTable')).toBeNull();
    expect(bulkDeleteOperations('contractsTable')).toBeNull();
    expect(bulkDeleteOperations('faqsTable')).toBeNull();
    expect(bulkDeleteOperations('policiesTable')).toBeNull();
    expect(bulkDeleteOperations('policiesTable')).toBeNull();
    expect(error).toHaveBeenCalledWith('backgroundJob', 'target', { msg: 'Unusable bulk delete target', table: 'surveysTable' });
    error.mockRestore();
  });

  it('drops a table whose page carries no total', () => {
    const error = jest.spyOn(logs.server, 'error').mockImplementation(() => undefined);
    expect(bulkDeleteOperations('brokenPageTable')).toBeNull();
    expect(error).toHaveBeenCalledWith(
      'backgroundJob',
      'buildDocument',
      expect.objectContaining({ msg: expect.stringContaining('total') }),
    );
    error.mockRestore();
  });

  it('copes with a schema that has no query or no mutation root', () => {
    const error = jest.spyOn(logs.server, 'error').mockImplementation(() => undefined);
    mockSchema.current = buildSchema('schema { mutation: Mutation } type Mutation { deleteCoupon(id: ID!): Boolean }');
    expect(bulkDeleteOperations('noQueryTable')).toBeNull();
    mockSchema.current = buildSchema('type Query { noMutationTable: Int }');
    expect(bulkDeleteOperations('noMutationTable')).toBeNull();
    error.mockRestore();
  });
});

describe('runAs', () => {
  it('runs as the actor inside the starting request identity', async () => {
    const ops = bulkDeleteOperations('podPlansTable')!;
    await runAs(ops.remove, { plan_id: 'DUN-PLAN-11' }, actor, identity);
    expect(seen.args).toEqual({ plan_id: 'DUN-PLAN-11', notify: false });
    expect(seen.user).toEqual(jobContext(actor).user);
    expect(seen.ip).toBe('10.1.2.3');
  });

  it('throws the first error the operation returned', async () => {
    const ops = bulkDeleteOperations('couponsTable')!;
    await expect(runAs(ops.remove, { id: 'CPN-DIWALI' }, actor, identity)).rejects.toThrow(
      'That coupon has been redeemed',
    );
  });

  it('refuses to run before the schema exists', async () => {
    const ops = bulkDeleteOperations('podPlansTable')!;
    mockSchema.current = null;
    await expect(runAs(ops.remove, { plan_id: 'DUN-PLAN-11' }, actor, identity)).rejects.toThrow(
      'The GraphQL schema is not ready yet.',
    );
  });
});

describe('captureScope', () => {
  it("captures the table's collection and asks it for one row only", async () => {
    const ops = bulkDeleteOperations('podPlansTable')!;
    const scope = await captureScope(ops, { city: 'Lucknow' }, actor, identity);
    expect(scope.model).toBe(planModel);
    expect(scope.filter).toEqual({ city: 'Lucknow' });
    expect(seen.args).toEqual({ city: 'Lucknow', query: { page: 1, page_size: 1 } });
  });

  it("keeps the view's own search while shrinking the page", async () => {
    const ops = bulkDeleteOperations('podPlansTable')!;
    const scope = await captureScope(
      ops,
      { city: 'Lucknow', query: { search: 'Weekend', page: 4, page_size: 50 } },
      actor,
      identity,
    );
    expect(scope.filter).toEqual({ $and: [{ city: 'Lucknow' }, { $or: [{ name: /Weekend/i }] }] });
    expect(seen.args).toEqual({ city: 'Lucknow', query: { search: 'Weekend', page: 1, page_size: 1 } });
  });

  it('refuses a table that is not read from one collection', async () => {
    const ops = bulkDeleteOperations('computedTable')!;
    await expect(captureScope(ops, {}, actor, identity)).rejects.toThrow(
      'This table is not read from a single collection, so it cannot be deleted in bulk.',
    );
  });
});
