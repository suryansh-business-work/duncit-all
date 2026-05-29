import { badgeResolvers } from '../../badge.resolver';
import { makeContext } from '@test/harness';

describe('badge unit', () => {
  it('createBadge is gated to admin write roles', async () => {
    await expect(
      (badgeResolvers.Mutation as any).createBadge({}, { input: {} }, makeContext({ roles: ['USER'] }))
    ).rejects.toThrow(/access denied/i);
  });

  it('myBadges requires authentication', async () => {
    await expect(
      (badgeResolvers.Query as any).myBadges({}, {}, makeContext(null))
    ).rejects.toThrow(/authenticat/i);
  });
});
