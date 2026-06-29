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

  it('hostUpdatePod requires authentication', async () => {
    await expect(
      (async () => (podResolvers.Mutation as any).hostUpdatePod({}, { pod_doc_id: 'x', input: {} }, makeContext()))()
    ).rejects.toThrow(/not authenticated/i);
  });

  it('hostDeletePod requires authentication', async () => {
    await expect(
      (async () => (podResolvers.Mutation as any).hostDeletePod({}, { pod_doc_id: 'x', reason_subject: 'Other' }, makeContext()))()
    ).rejects.toThrow(/not authenticated/i);
  });

  it('hostPodDeleteImpact requires authentication', async () => {
    await expect(
      (async () => (podResolvers.Query as any).hostPodDeleteImpact({}, { pod_doc_id: 'x' }, makeContext()))()
    ).rejects.toThrow(/not authenticated/i);
  });

  describe('PodComment field resolvers (explore item 4)', () => {
    const PodComment = (podResolvers as any).PodComment;

    it('like_count counts the likes array and treats a missing array as 0', () => {
      expect(PodComment.like_count({ likes: ['a', 'b'] })).toBe(2);
      expect(PodComment.like_count({})).toBe(0);
    });

    it('liked_by_me reflects the viewer membership and is false when anonymous', () => {
      expect(PodComment.liked_by_me({ likes: ['u1', 'u2'] }, {}, makeContext({ id: 'u1' }))).toBe(true);
      expect(PodComment.liked_by_me({ likes: ['u2'] }, {}, makeContext({ id: 'u1' }))).toBe(false);
      expect(PodComment.liked_by_me({ likes: ['u1'] }, {}, makeContext())).toBe(false);
    });
  });
});
