import { authResolvers } from '../../auth.resolver';
import { makeContext } from '@test/harness';
import { loginActivityService } from '../../login-activity/loginActivity.service';

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

  it('myLoginActivity requires authentication', async () => {
    await expect(
      authResolvers.Query.myLoginActivity({}, { limit: 10 }, makeContext(null))
    ).rejects.toThrow(/authenticat/i);
  });

  it("myLoginActivity reads only the caller's own sign-ins, with the asked-for limit", async () => {
    const history = { retention_days: 90, entries: [] };
    const listMine = jest.spyOn(loginActivityService, 'listMine').mockResolvedValueOnce(history);

    await expect(
      authResolvers.Query.myLoginActivity({}, { limit: 10 }, makeContext({ id: 'user-1', roles: ['USER'] }))
    ).resolves.toBe(history);
    expect(listMine).toHaveBeenCalledWith('user-1', 10);
    listMine.mockRestore();
  });
});
