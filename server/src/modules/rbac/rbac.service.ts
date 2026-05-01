import { GraphQLError } from 'graphql';
import {
  ResourceModel,
  ActionModel,
  PermissionModel,
  RoleModel,
} from './rbac.model';
import { ROLES, ROLE_PERMISSIONS, PERMISSIONS } from '../user/user.constants';

const toPub = (d: any) => {
  if (!d) return null;
  return {
    id: String(d._id),
    key: d.key,
    name: d.name,
    description: d.description ?? '',
    is_system: !!d.is_system,
    created_at: d.created_at?.toISOString?.() ?? '',
    updated_at: d.updated_at?.toISOString?.() ?? '',
  };
};

const toPermPub = (d: any) => {
  if (!d) return null;
  return { ...toPub(d), resource_key: d.resource_key, action_key: d.action_key };
};

const toRolePub = (d: any) => {
  if (!d) return null;
  return { ...toPub(d), permission_keys: d.permission_keys ?? [] };
};

function notFound(what: string): never {
  throw new GraphQLError(`${what} not found`, { extensions: { code: 'NOT_FOUND' } });
}

export const rbacService = {
  // ----- Resources -----
  async listResources() {
    const r = await ResourceModel.find().sort({ key: 1 });
    return r.map(toPub);
  },
  async createResource(input: { key: string; name: string; description?: string }) {
    const exists = await ResourceModel.findOne({ key: input.key.toLowerCase() });
    if (exists) throw new GraphQLError('Resource key exists', { extensions: { code: 'CONFLICT' } });
    const created = await ResourceModel.create({ ...input, key: input.key.toLowerCase() });
    return toPub(created);
  },
  async updateResource(id: string, input: { name?: string; description?: string }) {
    const updated = await ResourceModel.findByIdAndUpdate(id, input, { new: true });
    if (!updated) notFound('Resource');
    return toPub(updated);
  },
  async deleteResource(id: string) {
    const r = await ResourceModel.findById(id);
    if (!r) notFound('Resource');
    if (r!.is_system) throw new GraphQLError('System resource cannot be deleted', { extensions: { code: 'FORBIDDEN' } });
    await PermissionModel.deleteMany({ resource_key: r!.key });
    await r!.deleteOne();
    return true;
  },

  // ----- Actions -----
  async listActions() {
    const a = await ActionModel.find().sort({ key: 1 });
    return a.map(toPub);
  },
  async createAction(input: { key: string; name: string; description?: string }) {
    const exists = await ActionModel.findOne({ key: input.key.toLowerCase() });
    if (exists) throw new GraphQLError('Action key exists', { extensions: { code: 'CONFLICT' } });
    const created = await ActionModel.create({ ...input, key: input.key.toLowerCase() });
    return toPub(created);
  },
  async updateAction(id: string, input: { name?: string; description?: string }) {
    const updated = await ActionModel.findByIdAndUpdate(id, input, { new: true });
    if (!updated) notFound('Action');
    return toPub(updated);
  },
  async deleteAction(id: string) {
    const a = await ActionModel.findById(id);
    if (!a) notFound('Action');
    if (a!.is_system) throw new GraphQLError('System action cannot be deleted', { extensions: { code: 'FORBIDDEN' } });
    await PermissionModel.deleteMany({ action_key: a!.key });
    await a!.deleteOne();
    return true;
  },

  // ----- Permissions -----
  async listPermissions() {
    const p = await PermissionModel.find().sort({ key: 1 });
    return p.map(toPermPub);
  },
  async createPermission(input: { resource_key: string; action_key: string; description?: string }) {
    const resource = await ResourceModel.findOne({ key: input.resource_key.toLowerCase() });
    if (!resource) notFound('Resource');
    const action = await ActionModel.findOne({ key: input.action_key.toLowerCase() });
    if (!action) notFound('Action');
    const key = `${resource!.key}:${action!.key}`;
    const exists = await PermissionModel.findOne({ key });
    if (exists) throw new GraphQLError('Permission already exists', { extensions: { code: 'CONFLICT' } });
    const created = await PermissionModel.create({
      key,
      resource_key: resource!.key,
      action_key: action!.key,
      description: input.description ?? '',
    });
    return toPermPub(created);
  },
  async deletePermission(id: string) {
    const p = await PermissionModel.findById(id);
    if (!p) notFound('Permission');
    if (p!.is_system) throw new GraphQLError('System permission cannot be deleted', { extensions: { code: 'FORBIDDEN' } });
    // remove from all roles
    await RoleModel.updateMany({}, { $pull: { permission_keys: p!.key } });
    await p!.deleteOne();
    return true;
  },

  // ----- Roles -----
  async listRoles() {
    const r = await RoleModel.find().sort({ key: 1 });
    return r.map(toRolePub);
  },
  async getRole(id: string) {
    const r = await RoleModel.findById(id);
    return toRolePub(r);
  },
  async createRole(input: { key: string; name: string; description?: string; permission_keys?: string[] }) {
    const exists = await RoleModel.findOne({ key: input.key.toUpperCase() });
    if (exists) throw new GraphQLError('Role key exists', { extensions: { code: 'CONFLICT' } });
    const created = await RoleModel.create({
      ...input,
      key: input.key.toUpperCase(),
      permission_keys: input.permission_keys ?? [],
    });
    return toRolePub(created);
  },
  async updateRole(
    id: string,
    input: { name?: string; description?: string; permission_keys?: string[] }
  ) {
    const updated = await RoleModel.findByIdAndUpdate(id, input, { new: true });
    if (!updated) notFound('Role');
    return toRolePub(updated);
  },
  async deleteRole(id: string) {
    const r = await RoleModel.findById(id);
    if (!r) notFound('Role');
    if (r!.is_system) throw new GraphQLError('System role cannot be deleted', { extensions: { code: 'FORBIDDEN' } });
    await r!.deleteOne();
    return true;
  },
  async setRolePermissions(id: string, permission_keys: string[]) {
    const updated = await RoleModel.findByIdAndUpdate(
      id,
      { permission_keys },
      { new: true }
    );
    if (!updated) notFound('Role');
    return toRolePub(updated);
  },

  // ----- Aggregations -----
  async permissionsForRoleKeys(roleKeys: string[]): Promise<string[]> {
    if (!roleKeys?.length) return [];
    const roles = await RoleModel.find({ key: { $in: roleKeys.map((k) => k.toUpperCase()) } });
    const set = new Set<string>();
    for (const r of roles) for (const p of r.permission_keys ?? []) set.add(p);
    return Array.from(set);
  },

  // ----- Bootstrap seed -----
  async seedDefaults(): Promise<void> {
    const defaultResources = [
      { key: 'user', name: 'User', description: 'User accounts' },
      { key: 'venue', name: 'Venue', description: 'Venues' },
      { key: 'pod', name: 'Pod', description: 'Pods' },
      { key: 'finance', name: 'Finance', description: 'Financial data' },
      { key: 'city', name: 'City', description: 'City scope' },
      { key: 'zone', name: 'Zone', description: 'Zone scope' },
    ];
    const defaultActions = [
      { key: 'create', name: 'Create' },
      { key: 'read', name: 'Read' },
      { key: 'update', name: 'Update' },
      { key: 'delete', name: 'Delete' },
      { key: 'manage', name: 'Manage' },
      { key: 'view', name: 'View' },
    ];
    for (const r of defaultResources) {
      await ResourceModel.updateOne(
        { key: r.key },
        { $setOnInsert: { ...r, is_system: true } },
        { upsert: true }
      );
    }
    for (const a of defaultActions) {
      await ActionModel.updateOne(
        { key: a.key },
        { $setOnInsert: { ...a, is_system: true } },
        { upsert: true }
      );
    }

    // Map legacy PERMISSIONS to resource:action pairs
    const legacyMap: Record<string, { resource: string; action: string }> = {
      CREATE_POD: { resource: 'pod', action: 'create' },
      DELETE_USER: { resource: 'user', action: 'delete' },
      VIEW_FINANCE: { resource: 'finance', action: 'view' },
      MANAGE_USERS: { resource: 'user', action: 'manage' },
      MANAGE_VENUES: { resource: 'venue', action: 'manage' },
      MANAGE_CITY: { resource: 'city', action: 'manage' },
      MANAGE_ZONE: { resource: 'zone', action: 'manage' },
    };

    for (const legacy of PERMISSIONS) {
      const m = legacyMap[legacy];
      if (!m) continue;
      const key = `${m.resource}:${m.action}`;
      await PermissionModel.updateOne(
        { key },
        {
          $setOnInsert: {
            key,
            resource_key: m.resource,
            action_key: m.action,
            description: legacy,
            is_system: true,
          },
        },
        { upsert: true }
      );
    }

    for (const role of ROLES) {
      const perms = (ROLE_PERMISSIONS[role] ?? [])
        .map((p) => legacyMap[p])
        .filter(Boolean)
        .map((m) => `${m.resource}:${m.action}`);
      await RoleModel.updateOne(
        { key: role },
        {
          $setOnInsert: {
            key: role,
            name: role
              .split('_')
              .map((s) => s[0] + s.slice(1).toLowerCase())
              .join(' '),
            description: '',
            is_system: true,
          },
          $set: {}, // no-op
        },
        { upsert: true }
      );
      // For system roles, ensure they have at least the default perms on first create.
      const existing = await RoleModel.findOne({ key: role });
      if (existing && (!existing.permission_keys || existing.permission_keys.length === 0)) {
        existing.permission_keys = perms;
        await existing.save();
      }
    }
  },
};
