import { Types } from 'mongoose';
import { podIdeaService } from '../../podIdea.service';
import { podIdeaResolvers } from '../../podIdea.resolver';
import { makeContext } from '@test/harness';

const uid = new Types.ObjectId().toString();
const oid = () => new Types.ObjectId().toString();
const cats = { super_category_id: oid(), category_id: oid(), sub_category_id: oid() };

describe('podIdea unit', () => {
  it('create requires a title', async () => {
    await expect(podIdeaService.create(uid, { title: '  ', description: 'x' })).rejects.toThrow(/title is required/i);
  });

  it('create rejects a title longer than 160 chars', async () => {
    await expect(
      podIdeaService.create(uid, { title: 'a'.repeat(161), description: 'x' })
    ).rejects.toThrow(/title too long/i);
  });

  it('create requires a description', async () => {
    await expect(podIdeaService.create(uid, { title: 'Idea', description: '' })).rejects.toThrow(/description is required/i);
  });

  it('create rejects a description longer than 2001 chars', async () => {
    await expect(
      podIdeaService.create(uid, { title: 'Idea', description: 'a'.repeat(2002) })
    ).rejects.toThrow(/description too long/i);
  });

  it('create requires the full Super/Category/Sub hierarchy', async () => {
    await expect(
      podIdeaService.create(uid, { title: 'Idea', description: 'ok' })
    ).rejects.toThrow(/select a super category/i);
    await expect(
      podIdeaService.create(uid, {
        title: 'Idea',
        description: 'ok',
        super_category_id: cats.super_category_id,
      })
    ).rejects.toThrow(/select a category/i);
    await expect(
      podIdeaService.create(uid, {
        title: 'Idea',
        description: 'ok',
        super_category_id: cats.super_category_id,
        category_id: cats.category_id,
      })
    ).rejects.toThrow(/select a sub category/i);
  });

  it('create rejects an invalid category id', async () => {
    await expect(
      podIdeaService.create(uid, {
        title: 'Idea',
        description: 'ok',
        super_category_id: 'not-an-id',
        category_id: cats.category_id,
        sub_category_id: cats.sub_category_id,
      })
    ).rejects.toThrow(/invalid category/i);
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
