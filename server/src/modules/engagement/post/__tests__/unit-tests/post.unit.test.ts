import { Types } from 'mongoose';
import { postService } from '../../post.service';
import { postResolvers } from '../../post.resolver';
import { makeContext } from '@test/harness';

const uid = new Types.ObjectId().toString();

describe('post unit', () => {
  it('create requires an image url', async () => {
    await expect(postService.create(uid, { image_url: '' })).rejects.toThrow(/image_url is required/i);
  });

  it('create rejects a non-http image url', async () => {
    await expect(postService.create(uid, { image_url: 'data:image/png;base64,abc' })).rejects.toThrow(/http\(s\) URL/i);
  });

  it('getById rejects an invalid id', async () => {
    await expect(postService.getById('bad')).rejects.toThrow(/invalid id/i);
  });

  it('createPost requires authentication', async () => {
    await expect(
      (async () => (postResolvers.Mutation as any).createPost({}, { input: {} }, makeContext(null)))()
    ).rejects.toThrow(/authenticat/i);
  });
});
