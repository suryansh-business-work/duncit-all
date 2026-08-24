/**
 * Pod Expenses resolvers — the role gate, and what each entry point forwards.
 *
 * This module is Duncit's own money leaving the building, so every one of the
 * seven entry points is behind the same finance allow-list as the company
 * ledger. The service is faked: what is worth holding here is that NO path
 * reaches it without a role, and that `createPodExpense` stamps the signed-in
 * reader onto the row rather than trusting anything the client sent.
 */
jest.mock('../../podExpense.service', () => ({
  podExpenseService: {
    podsTable: jest.fn().mockResolvedValue({ rows: [], total: 0, page: 1, page_size: 25 }),
    podSummary: jest.fn().mockResolvedValue(null),
    podExpensesTable: jest.fn().mockResolvedValue({ rows: [], total: 0, page: 1, page_size: 25 }),
    summary: jest.fn().mockResolvedValue({ total_spent: 0 }),
    create: jest.fn().mockResolvedValue({ id: 'pe1' }),
    update: jest.fn().mockResolvedValue({ id: 'pe1' }),
    remove: jest.fn().mockResolvedValue(true),
  },
}));

import { GraphQLError } from 'graphql';
import type { GraphQLContext } from '@context';
import { podExpenseResolvers } from '../../podExpense.resolver';
import { podExpenseService } from '../../podExpense.service';

const service = podExpenseService as unknown as Record<string, jest.Mock>;

const ctx = (roles: string[] | null): GraphQLContext =>
  ({ user: roles ? { id: 'u1', roles, email: 'fm@duncit.com' } : null }) as unknown as GraphQLContext;

const POD_ID = '65b000000000000000000001';
const EXPENSE_ID = '65b000000000000000000002';
const QUERY = { page: 2, page_size: 10 };
const INPUT = { date: '2026-08-20', category: 'VENUE_RENT', amount: 2500 };

beforeEach(() => {
  jest.clearAllMocks();
});

describe('podExpense queries', () => {
  it('lists the pods table for a finance reader, forwarding the table query', async () => {
    await podExpenseResolvers.Query.podExpensePodsTable({}, { query: QUERY }, ctx(['FINANCE_MANAGER']));

    expect(service.podsTable).toHaveBeenCalledWith(QUERY);
  });

  it('reads one pod back for the drawer header', async () => {
    await podExpenseResolvers.Query.podExpensePodSummary({}, { pod_doc_id: POD_ID }, ctx(['CITY_ADMIN']));

    expect(service.podSummary).toHaveBeenCalledWith(POD_ID);
  });

  it("lists one pod's entries, forwarding both the pod and the table query", async () => {
    await podExpenseResolvers.Query.podExpensesTable(
      {},
      { pod_doc_id: POD_ID, query: QUERY },
      ctx(['SUPER_ADMIN'])
    );

    expect(service.podExpensesTable).toHaveBeenCalledWith(POD_ID, QUERY);
  });

  it('serves the KPI summary', async () => {
    await podExpenseResolvers.Query.podExpenseSummary({}, {}, ctx(['FINANCE_MANAGER']));

    expect(service.summary).toHaveBeenCalledTimes(1);
  });

  it('denies every read to a reader without a finance role', async () => {
    const outsider = ctx(['USER']);

    await expect(podExpenseResolvers.Query.podExpensePodsTable({}, {}, outsider)).rejects.toThrow(GraphQLError);
    await expect(
      podExpenseResolvers.Query.podExpensePodSummary({}, { pod_doc_id: POD_ID }, outsider)
    ).rejects.toThrow(GraphQLError);
    await expect(
      podExpenseResolvers.Query.podExpensesTable({}, { pod_doc_id: POD_ID }, outsider)
    ).rejects.toThrow(GraphQLError);
    await expect(podExpenseResolvers.Query.podExpenseSummary({}, {}, ctx(null))).rejects.toThrow(GraphQLError);

    expect(service.podsTable).not.toHaveBeenCalled();
    expect(service.podSummary).not.toHaveBeenCalled();
    expect(service.podExpensesTable).not.toHaveBeenCalled();
    expect(service.summary).not.toHaveBeenCalled();
  });
});

describe('podExpense mutations', () => {
  it('stamps the signed-in reader onto a created entry', async () => {
    await podExpenseResolvers.Mutation.createPodExpense(
      {},
      { pod_doc_id: POD_ID, input: INPUT },
      ctx(['FINANCE_MANAGER'])
    );

    expect(service.create).toHaveBeenCalledWith(POD_ID, INPUT, 'u1');
  });

  it('updates and deletes one entry by its document id', async () => {
    await podExpenseResolvers.Mutation.updatePodExpense(
      {},
      { expense_doc_id: EXPENSE_ID, input: INPUT },
      ctx(['CITY_ADMIN'])
    );
    await podExpenseResolvers.Mutation.deletePodExpense(
      {},
      { expense_doc_id: EXPENSE_ID },
      ctx(['SUPER_ADMIN'])
    );

    expect(service.update).toHaveBeenCalledWith(EXPENSE_ID, INPUT);
    expect(service.remove).toHaveBeenCalledWith(EXPENSE_ID);
  });

  it('denies every write to a reader without a finance role', async () => {
    const outsider = ctx(['HOST']);

    await expect(
      podExpenseResolvers.Mutation.createPodExpense({}, { pod_doc_id: POD_ID, input: INPUT }, outsider)
    ).rejects.toThrow(GraphQLError);
    await expect(
      podExpenseResolvers.Mutation.updatePodExpense({}, { expense_doc_id: EXPENSE_ID, input: INPUT }, outsider)
    ).rejects.toThrow(GraphQLError);
    await expect(
      podExpenseResolvers.Mutation.deletePodExpense({}, { expense_doc_id: EXPENSE_ID }, ctx(null))
    ).rejects.toThrow(GraphQLError);

    expect(service.create).not.toHaveBeenCalled();
    expect(service.update).not.toHaveBeenCalled();
    expect(service.remove).not.toHaveBeenCalled();
  });
});
