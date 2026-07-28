import { rbacResolvers } from '../../rbac.resolver';
import { makeContext } from '@test/harness';

describe('rbac unit', () => {
  it('roles query is gated to read roles', async () => {
    await expect(
      (rbacResolvers.Query as any).roles({}, {}, makeContext({ roles: ['USER'] }))
    ).rejects.toThrow(/access denied/i);
  });

  it('createRole is gated to super admin', () => {
    expect(() =>
      (rbacResolvers.Mutation as any).createRole(
        {},
        { input: { key: 'X', name: 'X' } },
        makeContext({ roles: ['CITY_ADMIN'] })
      )
    ).toThrow(/access denied/i);
  });
});
