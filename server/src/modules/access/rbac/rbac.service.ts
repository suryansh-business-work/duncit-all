import { GraphQLError } from 'graphql';
import { RoleModel } from './rbac.model';
import { ROLE_CATALOG } from '@modules/access/user/user.constants';

const toRolePub = (d: any) => {
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

function notFound(what: string): never {
  throw new GraphQLError(`${what} not found`, { extensions: { code: 'NOT_FOUND' } });
}

export const rbacService = {
  async listRoles() {
    const r = await RoleModel.find().sort({ key: 1 });
    return r.map(toRolePub);
  },
  async getRole(id: string) {
    const r = await RoleModel.findById(id);
    return toRolePub(r);
  },
  async createRole(input: { key: string; name: string; description?: string }) {
    const key = input.key.toUpperCase();
    const exists = await RoleModel.findOne({ key });
    if (exists) throw new GraphQLError('Role key exists', { extensions: { code: 'CONFLICT' } });
    const created = await RoleModel.create({ ...input, key });
    return toRolePub(created);
  },
  async updateRole(id: string, input: { name?: string; description?: string }) {
    const updated = await RoleModel.findByIdAndUpdate(id, input, { new: true });
    if (!updated) notFound('Role');
    return toRolePub(updated);
  },
  async deleteRole(id: string) {
    const r = await RoleModel.findById(id);
    if (!r) notFound('Role');
    if (r!.is_system) {
      throw new GraphQLError('System role cannot be deleted', { extensions: { code: 'FORBIDDEN' } });
    }
    await r!.deleteOne();
    return true;
  },

  // Bootstrap: ensure a Role doc exists for every catalog entry (one access per
  // portal). Idempotent — safe to run on every boot. Names/descriptions are
  // refreshed so the admin picker stays in sync with the catalog.
  async seedDefaults(): Promise<void> {
    for (const role of ROLE_CATALOG) {
      await RoleModel.updateOne(
        { key: role.key },
        {
          $set: { name: role.name, description: role.description, is_system: true },
          $setOnInsert: { key: role.key },
        },
        { upsert: true }
      );
    }
  },
};
