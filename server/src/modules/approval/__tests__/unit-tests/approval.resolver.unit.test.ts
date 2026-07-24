import { GraphQLError } from 'graphql';
import type { GraphQLContext } from '@context';

jest.mock('../../approval.service', () => ({
  approvalService: {
    listWarehouseApprovals: jest.fn().mockResolvedValue([{ id: 'w1' }]),
    reviewWarehouse: jest.fn().mockResolvedValue({ id: 'w1', status: 'APPROVED' }),
  },
}));

import { approvalResolvers } from '../../approval.resolver';
import { approvalService } from '../../approval.service';

const ctx = (roles: string[] | null, email: string | null = 'pm@x.com'): GraphQLContext =>
  ({ user: roles ? { id: 'u1', roles, email } : null }) as unknown as GraphQLContext;

const list = approvalService.listWarehouseApprovals as jest.Mock;
const review = approvalService.reviewWarehouse as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe('approvalResolvers — warehouse approval (products portal)', () => {
  it('lists warehouse approvals with and without a status for a products reviewer', async () => {
    await approvalResolvers.Query.warehouseApprovalRequests({}, { status: 'PENDING' }, ctx(['PRODUCTS_MANAGER']));
    expect(list).toHaveBeenCalledWith('PENDING');
    await approvalResolvers.Query.warehouseApprovalRequests({}, {}, ctx(['PRODUCTS_MANAGER']));
    expect(list).toHaveBeenLastCalledWith(null);
  });

  it('denies warehouse listing for a non-reviewer', () => {
    expect(() => approvalResolvers.Query.warehouseApprovalRequests({}, {}, ctx(['USER']))).toThrow(
      GraphQLError,
    );
    expect(list).not.toHaveBeenCalled();
  });

  it('approves a warehouse request, forwarding the reviewer (email present, then null)', async () => {
    await approvalResolvers.Mutation.approveWarehouseRequest({}, { id: 'w1', notes: 'ok' }, ctx(['PRODUCTS_MANAGER'], 'pm@x.com'));
    expect(review).toHaveBeenLastCalledWith('w1', 'APPROVE', { id: 'u1', name: 'pm@x.com' }, 'ok');
    await approvalResolvers.Mutation.approveWarehouseRequest({}, { id: 'w2' }, ctx(['SUPER_ADMIN'], null));
    expect(review).toHaveBeenLastCalledWith('w2', 'APPROVE', { id: 'u1', name: null }, undefined);
  });

  it('denies a warehouse request, forwarding the reviewer (email present, then null)', async () => {
    await approvalResolvers.Mutation.denyWarehouseRequest({}, { id: 'w1', notes: 'no' }, ctx(['CITY_ADMIN'], 'a@x.com'));
    expect(review).toHaveBeenLastCalledWith('w1', 'DENY', { id: 'u1', name: 'a@x.com' }, 'no');
    await approvalResolvers.Mutation.denyWarehouseRequest({}, { id: 'w2' }, ctx(['PRODUCTS_MANAGER'], null));
    expect(review).toHaveBeenLastCalledWith('w2', 'DENY', { id: 'u1', name: null }, undefined);
  });

  it('denies approve/deny for a non-reviewer', () => {
    expect(() => approvalResolvers.Mutation.approveWarehouseRequest({}, { id: 'w1' }, ctx(['USER']))).toThrow(
      GraphQLError,
    );
    expect(() => approvalResolvers.Mutation.denyWarehouseRequest({}, { id: 'w1' }, ctx(null))).toThrow(
      GraphQLError,
    );
    expect(review).not.toHaveBeenCalled();
  });
});
