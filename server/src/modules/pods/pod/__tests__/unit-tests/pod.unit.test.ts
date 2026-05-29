import { podResolvers } from '../../pod.resolver';
import { makeContext } from '@test/harness';

describe('pod unit', () => {
  it('createPod is gated to admin write roles', async () => {
    await expect(
      (async () => (podResolvers.Mutation as any).createPod({}, { input: {} }, makeContext({ roles: ['USER'] })))()
    ).rejects.toThrow(/access denied/i);
  });

  it('updatePod is gated to admin write roles', async () => {
    await expect(
      (async () => (podResolvers.Mutation as any).updatePod({}, { pod_doc_id: 'x', input: {} }, makeContext({ roles: ['USER'] })))()
    ).rejects.toThrow(/access denied/i);
  });
});
