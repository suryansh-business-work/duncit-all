import { podMemberResolvers } from '../../podMember.resolver';
import { makeContext } from '@test/harness';

// joinFreePod/backoutPod resolve the user synchronously, so wrap the call in an
// async IIFE to normalise both sync throws and rejected promises.
describe('podMember unit', () => {
  it('joinFreePod requires authentication', async () => {
    await expect(
      (async () => (podMemberResolvers.Mutation as any).joinFreePod({}, { pod_doc_id: 'x' }, makeContext(null)))()
    ).rejects.toThrow(/authentication required/i);
  });

  it('backoutPod requires authentication', async () => {
    await expect(
      (async () => (podMemberResolvers.Mutation as any).backoutPod({}, { pod_doc_id: 'x' }, makeContext(null)))()
    ).rejects.toThrow(/authentication required/i);
  });

  it('cancelBackoutPod requires authentication', async () => {
    await expect(
      (async () =>
        (podMemberResolvers.Mutation as any).cancelBackoutPod({}, { pod_doc_id: 'x' }, makeContext(null)))()
    ).rejects.toThrow(/authentication required/i);
  });

  it('processBackoutRefund is finance/admin gated', async () => {
    await expect(
      (async () =>
        (podMemberResolvers.Mutation as any).processBackoutRefund({}, { id: 'x' }, makeContext(null)))()
    ).rejects.toThrow(/not authenticated/i);
    await expect(
      (async () =>
        (podMemberResolvers.Mutation as any).processBackoutRefund({}, { id: 'x' }, makeContext({ roles: ['USER'] })))()
    ).rejects.toThrow(/access denied/i);
  });

  it('rejoinPod requires authentication', async () => {
    await expect(
      (async () => (podMemberResolvers.Mutation as any).rejoinPod({}, { pod_doc_id: 'x' }, makeContext(null)))()
    ).rejects.toThrow(/authentication required/i);
  });

  it('backoutRefundRequests is finance/admin gated', async () => {
    await expect(
      (async () => (podMemberResolvers.Query as any).backoutRefundRequests({}, {}, makeContext(null)))()
    ).rejects.toThrow(/not authenticated/i);
    await expect(
      (async () => (podMemberResolvers.Query as any).backoutRefundRequests({}, {}, makeContext({ roles: [] })))()
    ).rejects.toThrow(/access denied/i);
  });

  it('backoutRefundRequest is finance/admin gated', async () => {
    await expect(
      (async () =>
        (podMemberResolvers.Query as any).backoutRefundRequest({}, { id: 'x' }, makeContext({ roles: ['USER'] })))()
    ).rejects.toThrow(/access denied/i);
  });
});
