import { Schema, model, InferSchemaType } from 'mongoose';

// Access is portal-based: a Role is a single access grant (one console, or an
// app / admin scope). There are no resources, actions or permissions — holding
// the role grants the whole portal. See user.constants ROLE_CATALOG.
const roleSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    is_system: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export type RoleDoc = InferSchemaType<typeof roleSchema> & { _id: any };

export const RoleModel = model('Role', roleSchema);
