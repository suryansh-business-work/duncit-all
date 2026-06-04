import { rbacService } from '../../rbac.service';
import { ROLE_CATALOG } from '@modules/access/user/user.constants';

describe('rbacService integration', () => {
  it('runs the role lifecycle and blocks duplicates', async () => {
    const role = await rbacService.createRole({ key: 'ops_manager', name: 'Ops Manager' });
    expect(role!.key).toBe('OPS_MANAGER');
    expect((await rbacService.getRole(role!.id))?.name).toBe('Ops Manager');

    const updated = await rbacService.updateRole(role!.id, { name: 'Operations Manager' });
    expect(updated!.name).toBe('Operations Manager');

    await expect(rbacService.createRole({ key: 'OPS_MANAGER', name: 'dup' })).rejects.toThrow(
      /exists/i
    );
    expect(await rbacService.deleteRole(role!.id)).toBe(true);
  });

  it('seeds one role per catalog entry idempotently and protects system rows', async () => {
    await rbacService.seedDefaults();
    await rbacService.seedDefaults();

    const roles = await rbacService.listRoles();
    // Every portal/app/admin role from the catalog must be assignable.
    for (const entry of ROLE_CATALOG) {
      expect(roles.find((r) => r!.key === entry.key)).toBeTruthy();
    }
    // The roles that gate the previously-broken portals must exist.
    for (const key of ['HR_MANAGER', 'EMPLOYEE', 'ONBOARDING_MANAGER']) {
      expect(roles.find((r) => r!.key === key)).toBeTruthy();
    }

    const systemRole = roles.find((r) => r!.is_system)!;
    await expect(rbacService.deleteRole(systemRole.id)).rejects.toThrow(
      /system role cannot be deleted/i
    );
  });
});
