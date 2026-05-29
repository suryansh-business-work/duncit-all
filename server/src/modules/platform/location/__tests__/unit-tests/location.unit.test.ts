import { locationResolvers } from '../../location.resolver';
import { makeContext } from '@test/harness';

describe('location unit', () => {
  it('createLocation is gated to admin write roles', async () => {
    await expect(
      (locationResolvers.Mutation as any).createLocation({}, { input: {} }, makeContext({ roles: ['USER'] }))
    ).rejects.toThrow(/access denied/i);
  });

  it('deleteLocation requires authentication', async () => {
    await expect(
      (locationResolvers.Mutation as any).deleteLocation({}, { location_doc_id: 'x' }, makeContext(null))
    ).rejects.toThrow(/not authenticated/i);
  });
});
