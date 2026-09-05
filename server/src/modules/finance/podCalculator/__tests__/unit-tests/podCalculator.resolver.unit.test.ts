/**
 * Who may read and write a saved calculation.
 *
 * Saved calculations are shared across the finance team, so the ONLY thing
 * standing between them and any signed-in account is the role check on every
 * field. A resolver added later without one would be invisible in review —
 * hence a test that walks every entry point rather than a sample.
 */
jest.mock('@middleware/rbac', () => ({
  requireRole: jest.fn(() => ({ id: 'user-1' })),
}));

jest.mock('../../podCalculator.service', () => ({
  podCalculatorService: {
    list: jest.fn(async () => []),
    get: jest.fn(async () => null),
    create: jest.fn(async () => ({ id: 'c1' })),
    update: jest.fn(async () => ({ id: 'c1' })),
    remove: jest.fn(async () => true),
    pdfBase64: jest.fn(async () => 'base64'),
    email: jest.fn(async () => true),
  },
}));

import { requireRole } from '@middleware/rbac';
import { podCalculatorService } from '../../podCalculator.service';
import { podCalculatorResolvers } from '../../podCalculator.resolver';
import type { GraphQLContext } from '@context';

const role = requireRole as unknown as jest.Mock;
const service = podCalculatorService as unknown as Record<string, jest.Mock>;
const ctx = {} as GraphQLContext;

const FINANCE_RW = ['SUPER_ADMIN', 'CITY_ADMIN', 'FINANCE_MANAGER'];

beforeEach(() => {
  jest.clearAllMocks();
  role.mockReturnValue({ id: 'user-1' });
});

describe('every entry point is role-gated', () => {
  const calls: [string, () => Promise<unknown>][] = [
    ['Query.podCalculators', () => podCalculatorResolvers.Query.podCalculators(null, { kind: 'MULTI' }, ctx)],
    [
      'Query.podCalculator',
      () => podCalculatorResolvers.Query.podCalculator(null, { calculator_doc_id: 'c1' }, ctx),
    ],
    [
      'Query.podCalculatorPdfBase64',
      () => podCalculatorResolvers.Query.podCalculatorPdfBase64(null, { calculator_doc_id: 'c1' }, ctx),
    ],
    [
      'Mutation.createPodCalculator',
      () => podCalculatorResolvers.Mutation.createPodCalculator(null, { input: { name: 'Q4', pods: [] } }, ctx),
    ],
    [
      'Mutation.updatePodCalculator',
      () =>
        podCalculatorResolvers.Mutation.updatePodCalculator(
          null,
          { calculator_doc_id: 'c1', input: { name: 'Q4', pods: [] } },
          ctx
        ),
    ],
    [
      'Mutation.deletePodCalculator',
      () => podCalculatorResolvers.Mutation.deletePodCalculator(null, { calculator_doc_id: 'c1' }, ctx),
    ],
    [
      'Mutation.emailPodCalculator',
      () =>
        podCalculatorResolvers.Mutation.emailPodCalculator(
          null,
          { calculator_doc_id: 'c1', to: 'a@b.com' },
          ctx
        ),
    ],
  ];

  it.each(calls)('%s asks for a finance role', async (_name, run) => {
    await run();

    expect(role).toHaveBeenCalledWith(ctx, FINANCE_RW);
  });

  it.each(calls)('%s refuses when the role check throws', async (_name, run) => {
    role.mockImplementation(() => {
      throw new Error('Forbidden');
    });

    await expect(run()).rejects.toThrow('Forbidden');
  });
});

describe('arguments reach the service unchanged', () => {
  it('passes the kind through to the list', async () => {
    await podCalculatorResolvers.Query.podCalculators(null, { kind: 'SINGLE' }, ctx);

    expect(service.list).toHaveBeenCalledWith('SINGLE');
  });

  it('records the signed-in account as the author on create', async () => {
    const input = { name: 'Q4', pods: [] };
    await podCalculatorResolvers.Mutation.createPodCalculator(null, { input }, ctx);

    expect(service.create).toHaveBeenCalledWith(input, 'user-1');
  });

  it('passes the id and the input on update', async () => {
    const input = { name: 'Q4', pods: [] };
    await podCalculatorResolvers.Mutation.updatePodCalculator(
      null,
      { calculator_doc_id: 'c9', input },
      ctx
    );

    expect(service.update).toHaveBeenCalledWith('c9', input);
  });

  it('passes the id and the address on email', async () => {
    await podCalculatorResolvers.Mutation.emailPodCalculator(
      null,
      { calculator_doc_id: 'c9', to: 'finance@duncit.com' },
      ctx
    );

    expect(service.email).toHaveBeenCalledWith('c9', 'finance@duncit.com');
  });

  it('returns the report string from the pdf query', async () => {
    await expect(
      podCalculatorResolvers.Query.podCalculatorPdfBase64(null, { calculator_doc_id: 'c1' }, ctx)
    ).resolves.toBe('base64');
  });

  it('returns the service verdict from delete', async () => {
    await expect(
      podCalculatorResolvers.Mutation.deletePodCalculator(null, { calculator_doc_id: 'c1' }, ctx)
    ).resolves.toBe(true);
  });

  it('returns the stored calculation from the single read', async () => {
    service.get.mockResolvedValue({ id: 'c1' });

    await expect(
      podCalculatorResolvers.Query.podCalculator(null, { calculator_doc_id: 'c1' }, ctx)
    ).resolves.toEqual({ id: 'c1' });
  });
});
