import { rbacService } from '../../rbac.service';
import { RoleModel } from '../../rbac.model';
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

  it('serves the rolesTable page with search, filters, sort and paging', async () => {
    await rbacService.createRole({ key: 'ALPHA_ROLE', name: 'Alpha Access' });
    await rbacService.createRole({ key: 'BETA_ROLE', name: 'Beta Access', description: 'beta console' });
    await RoleModel.create({ key: 'GAMMA_ROLE', name: 'Gamma Access', is_system: true });

    // Plain envelope with the default sort (key asc) and clamp defaults.
    const all = await rbacService.table();
    expect(all.total).toBe(3);
    expect(all.rows.map((r) => r!.key)).toEqual(['ALPHA_ROLE', 'BETA_ROLE', 'GAMMA_ROLE']);
    expect(all.page).toBe(1);
    expect(all.page_size).toBe(25);

    // Search spans key, name and description.
    const byDescription = await rbacService.table({ search: 'beta console' });
    expect(byDescription.rows.map((r) => r!.key)).toEqual(['BETA_ROLE']);
    expect(byDescription.total).toBe(1);

    // Boolean filter narrows to system roles.
    const system = await rbacService.table({ filters: [{ field: 'is_system', op: 'is_true' }] });
    expect(system.rows.map((r) => r!.key)).toEqual(['GAMMA_ROLE']);

    // Allowlisted sort, descending.
    const desc = await rbacService.table({ sort_by: 'name', sort_dir: 'desc' });
    expect(desc.rows.map((r) => r!.name)).toEqual(['Gamma Access', 'Beta Access', 'Alpha Access']);

    // Paging keeps total and reports the clamped page/page_size back.
    const page2 = await rbacService.table({ page: 2, page_size: 1 });
    expect(page2.rows.map((r) => r!.key)).toEqual(['BETA_ROLE']);
    expect(page2.total).toBe(3);
    expect(page2.page).toBe(2);
    expect(page2.page_size).toBe(1);
  });
});
