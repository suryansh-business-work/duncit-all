import { Schema, model, InferSchemaType } from 'mongoose';
import { ROLES } from '../user.constants';

// Many-to-many: a user may have several roles, each scoped to a city or zone.
// CITY_ADMIN / ZONAL_ADMIN must carry the corresponding scope — enforced in
// the service layer + a validator on save.

const userRoleSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, required: true, enum: ROLES as readonly string[] },
    scope: {
      city: { type: String, default: null },
      zone: { type: String, default: null },
    },
    assigned_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    assigned_at: { type: Date, default: () => new Date() },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// Compound unique: a user cannot hold the same role + scope twice. The zone
// component of the unique key ensures distinct zone scopes are separate rows.
userRoleSchema.index(
  { user_id: 1, role: 1, 'scope.zone': 1, 'scope.city': 1 },
  { unique: true }
);

userRoleSchema.pre('validate', function (next) {
  const doc = this as any;
  if (doc.role === 'CITY_ADMIN' && !doc.scope?.city) {
    return next(new Error('CITY_ADMIN role requires scope.city'));
  }
  if (doc.role === 'ZONAL_ADMIN' && !doc.scope?.zone) {
    return next(new Error('ZONAL_ADMIN role requires scope.zone'));
  }
  next();
});

export type UserRoleDoc = InferSchemaType<typeof userRoleSchema> & { _id: any };
export const UserRoleModel = model('UserRole', userRoleSchema);
