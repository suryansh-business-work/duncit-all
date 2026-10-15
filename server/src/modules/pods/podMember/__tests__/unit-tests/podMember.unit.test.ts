import { podMemberResolvers } from '../../podMember.resolver';
import { makeContext } from '@test/harness';
import { podMemberService } from '../../podMember.service';

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

  it('cancelFreeSpot requires authentication and never reaches the service without it', async () => {
    const cancel = jest.spyOn(podMemberService, 'cancelFreeSpot');
    try {
      await expect(
        (async () => podMemberResolvers.Mutation.cancelFreeSpot({}, { pod_doc_id: 'x' }, makeContext(null)))()
      ).rejects.toThrow(/authentication required/i);
      expect(cancel).not.toHaveBeenCalled();
    } finally {
      cancel.mockRestore();
    }
  });

  it("cancelFreeSpot cancels the caller's own booking — the user id comes from the session", async () => {
    const answer = { id: 'm-1', status: 'BACKED_OUT' } as unknown as Awaited<
      ReturnType<typeof podMemberService.cancelFreeSpot>
    >;
    const cancel = jest.spyOn(podMemberService, 'cancelFreeSpot').mockResolvedValue(answer);
    try {
      const out = await podMemberResolvers.Mutation.cancelFreeSpot(
        {},
        { pod_doc_id: 'pod-1' },
        makeContext({ id: '65b000000000000000000009', roles: ['USER'] })
      );
      expect(out).toBe(answer);
      expect(cancel).toHaveBeenCalledWith('pod-1', '65b000000000000000000009');
    } finally {
      cancel.mockRestore();
    }
  });
});
