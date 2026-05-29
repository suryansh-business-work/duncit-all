import { uploadResolvers } from '../../upload.resolver';
import { makeContext } from '@test/harness';

// Upload talks to ImageKit/Pexels, so only the auth-guard branch is exercised
// (it short-circuits before any external call).
describe('upload integration', () => {
  it('blocks getImagekitAuth without authentication', async () => {
    await expect(
      (async () => (uploadResolvers.Query as any).getImagekitAuth({}, {}, makeContext(null)))()
    ).rejects.toThrow();
  });
});
