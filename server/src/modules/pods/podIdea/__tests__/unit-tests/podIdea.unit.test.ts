import { Types } from 'mongoose';
import { podIdeaService } from '../../podIdea.service';
import { podIdeaResolvers } from '../../podIdea.resolver';
import { makeContext } from '@test/harness';

const uid = new Types.ObjectId().toString();

describe('podIdea unit', () => {
  it('create requires a title', async () => {
    await expect(podIdeaService.create(uid, { title: '  ', description: 'x' })).rejects.toThrow(/title is required/i);
  });

  it('create requires a description', async () => {
    await expect(podIdeaService.create(uid, { title: 'Idea', description: '' })).rejects.toThrow(/description is required/i);
  });

  it('getById rejects an invalid id', async () => {
    await expect(podIdeaService.getById('not-an-id')).rejects.toThrow(/invalid id/i);
  });

  it('createPodIdea requires authentication', () => {
    expect(() =>
      (podIdeaResolvers.Mutation as any).createPodIdea({}, { input: {} }, makeContext(null))
    ).toThrow(/not authenticated/i);
  });
});
