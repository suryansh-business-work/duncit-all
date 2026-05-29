import { uploadResolvers } from '../../upload.resolver';
import { makeContext } from '@test/harness';

describe('upload unit', () => {
  it('getImagekitAuth requires authentication', async () => {
    await expect(
      (async () => (uploadResolvers.Query as any).getImagekitAuth({}, {}, makeContext(null)))()
    ).rejects.toThrow();
  });

  it('pexelsSearch requires authentication', async () => {
    await expect(
      (async () => (uploadResolvers.Query as any).pexelsSearch({}, { query: 'cats' }, makeContext(null)))()
    ).rejects.toThrow();
  });
});
