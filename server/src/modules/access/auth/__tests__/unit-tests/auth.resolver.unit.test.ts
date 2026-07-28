import { authResolvers } from '../../auth.resolver';
import { makeContext } from '@test/harness';

describe('auth unit', () => {
  it('requestPasswordChangeOtp requires authentication', async () => {
    await expect(
      (authResolvers.Mutation as any).requestPasswordChangeOtp(
        {},
        { input: { current_password: 'StrongPass123' } },
        makeContext(null)
      )
    ).rejects.toThrow(/authenticat/i);
  });

  it('changePasswordWithOtp requires authentication', async () => {
    await expect(
      (authResolvers.Mutation as any).changePasswordWithOtp(
        {},
        { input: { otp: '123456', new_password: 'BrandNew123' } },
        makeContext(null)
      )
    ).rejects.toThrow(/authenticat/i);
  });

  it('requestAccountDeletionOtp requires authentication', async () => {
    await expect(
      (authResolvers.Mutation as any).requestAccountDeletionOtp({}, {}, makeContext(null))
    ).rejects.toThrow(/authenticat/i);
  });

  it('deleteMyAccount requires authentication', async () => {
    await expect(
      (authResolvers.Mutation as any).deleteMyAccount({}, { input: { otp: '123456' } }, makeContext(null))
    ).rejects.toThrow(/authenticat/i);
  });
});
