import { userResolvers } from '../../user.resolver';
import { makeContext } from '@test/harness';

describe('user unit', () => {
  it('users query is gated to admin roles', async () => {
    await expect(
      (async () => (userResolvers.Query as any).users({}, { filter: {} }, makeContext({ roles: ['USER'] })))()
    ).rejects.toThrow(/access denied/i);
  });

  it('user query is gated to admin roles', async () => {
    await expect(
      (async () => (userResolvers.Query as any).user({}, { user_id: 'x' }, makeContext({ roles: ['USER'] })))()
    ).rejects.toThrow(/access denied/i);
  });
});
