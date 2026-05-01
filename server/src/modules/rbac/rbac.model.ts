import { Schema, model, InferSchemaType } from 'mongoose';

const resourceSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    is_system: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

const actionSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    is_system: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

const permissionSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, lowercase: true, trim: true },
    resource_key: { type: String, required: true, lowercase: true, trim: true },
    action_key: { type: String, required: true, lowercase: true, trim: true },
    description: { type: String, default: '' },
    is_system: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);
permissionSchema.index({ resource_key: 1, action_key: 1 }, { unique: true });

const roleSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    is_system: { type: Boolean, default: false },
    permission_keys: { type: [String], default: [] },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export type ResourceDoc = InferSchemaType<typeof resourceSchema> & { _id: any };
export type ActionDoc = InferSchemaType<typeof actionSchema> & { _id: any };
export type PermissionDoc = InferSchemaType<typeof permissionSchema> & { _id: any };
export type RoleDoc = InferSchemaType<typeof roleSchema> & { _id: any };

export const ResourceModel = model('Resource', resourceSchema);
export const ActionModel = model('Action', actionSchema);
export const PermissionModel = model('Permission', permissionSchema);
export const RoleModel = model('Role', roleSchema);
