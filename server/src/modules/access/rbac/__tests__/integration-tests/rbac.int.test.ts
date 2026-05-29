import { rbacService } from '../../rbac.service';

describe('rbacService integration', () => {
  it('runs the resource lifecycle and blocks duplicates', async () => {
    const created = await rbacService.createResource({ key: 'Report', name: 'Report' });
    expect(created!.key).toBe('report');
    expect(await rbacService.listResources()).toHaveLength(1);

    const updated = await rbacService.updateResource(created!.id, { name: 'Reports' });
    expect(updated!.name).toBe('Reports');

    await expect(rbacService.createResource({ key: 'report', name: 'dup' })).rejects.toThrow(/exists/i);
    expect(await rbacService.deleteResource(created!.id)).toBe(true);
  });

  it('creates a permission from a resource + action pair', async () => {
    await rbacService.createResource({ key: 'invoice', name: 'Invoice' });
    await rbacService.createAction({ key: 'approve', name: 'Approve' });

    const perm = await rbacService.createPermission({ resource_key: 'invoice', action_key: 'approve' });
    expect(perm!.key).toBe('invoice:approve');

    await expect(
      rbacService.createPermission({ resource_key: 'invoice', action_key: 'approve' })
    ).rejects.toThrow(/already exists/i);

    await expect(
      rbacService.createPermission({ resource_key: 'ghost', action_key: 'approve' })
    ).rejects.toThrow(/not found/i);
  });

  it('runs the role lifecycle and resolves permissions for role keys', async () => {
    const role = await rbacService.createRole({
      key: 'ops_manager',
      name: 'Ops Manager',
      permission_keys: ['invoice:approve'],
    });
    expect(role!.key).toBe('OPS_MANAGER');

    expect((await rbacService.getRole(role!.id))?.name).toBe('Ops Manager');

    const withPerms = await rbacService.setRolePermissions(role!.id, ['invoice:approve', 'invoice:read']);
    expect(withPerms!.permission_keys).toHaveLength(2);

    const resolved = await rbacService.permissionsForRoleKeys(['OPS_MANAGER']);
    expect(resolved).toEqual(expect.arrayContaining(['invoice:approve', 'invoice:read']));

    await expect(rbacService.createRole({ key: 'OPS_MANAGER', name: 'dup' })).rejects.toThrow(/exists/i);
    expect(await rbacService.deleteRole(role!.id)).toBe(true);
  });

  it('seeds defaults idempotently and protects system rows', async () => {
    await rbacService.seedDefaults();
    await rbacService.seedDefaults();

    const resources = await rbacService.listResources();
    expect(resources.length).toBeGreaterThanOrEqual(6);

    const systemResource = resources.find((r) => r!.is_system)!;
    await expect(rbacService.deleteResource(systemResource.id)).rejects.toThrow(/system resource cannot be deleted/i);

    const roles = await rbacService.listRoles();
    expect(roles.find((r) => r!.key === 'SUPER_ADMIN')).toBeTruthy();
  });
});
