import { Schema, model, InferSchemaType } from 'mongoose';

export const PORTAL_MODES = ['LIVE', 'MAINTENANCE', 'DEVELOPMENT'] as const;
export type PortalMode = (typeof PORTAL_MODES)[number];

export const PORTAL_KINDS = ['PORTAL', 'WEBSITE', 'APP'] as const;
export type PortalKind = (typeof PORTAL_KINDS)[number];

/**
 * Operational mode for a single portal / website / app. A single enum makes
 * Maintenance and Development inherently mutually exclusive. Every Duncit app
 * reads its own row (public, unauthenticated) on load and blocks itself with a
 * maintenance or "under development" screen when not LIVE.
 */
const portalModeSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    kind: { type: String, enum: PORTAL_KINDS, default: 'PORTAL' },
    mode: { type: String, enum: PORTAL_MODES, default: 'LIVE', index: true },
    note: { type: String, default: '' },
    updated_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export type PortalModeDoc = InferSchemaType<typeof portalModeSchema> & { _id: any };
export const PortalModeModel = model('PortalMode', portalModeSchema);
