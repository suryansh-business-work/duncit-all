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
});
