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

  it('requestPasswordChangeOtp requires authentication', async () => {
    await expect(
      (userResolvers.Mutation as any).requestPasswordChangeOtp(
        {},
        { input: { current_password: 'StrongPass123' } },
        makeContext(null)
      )
    ).rejects.toThrow(/authenticat/i);
  });

  it('changePasswordWithOtp requires authentication', async () => {
    await expect(
      (userResolvers.Mutation as any).changePasswordWithOtp(
        {},
        { input: { otp: '123456', new_password: 'BrandNew123' } },
        makeContext(null)
      )
    ).rejects.toThrow(/authenticat/i);
  });

  it('requestAccountDeletionOtp requires authentication', async () => {
    await expect(
      (userResolvers.Mutation as any).requestAccountDeletionOtp({}, {}, makeContext(null))
    ).rejects.toThrow(/authenticat/i);
  });

  it('deleteMyAccount requires authentication', async () => {
    await expect(
      (userResolvers.Mutation as any).deleteMyAccount({}, { input: { otp: '123456' } }, makeContext(null))
    ).rejects.toThrow(/authenticat/i);
  });
});
