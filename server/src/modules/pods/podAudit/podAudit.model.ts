import { Schema, model, Types, type Document } from 'mongoose';

/**
 * Immutable AI-monitored audit trail of every pod edit, status change and
 * critical action — powers the "Pod Monitoring" pages in the Admin and
 * Partners (Club Admin) portals. Entries are append-only: nothing ever
 * updates or deletes them except the async AI review enriching its own row.
 */
export type PodAuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'RESUBMIT'
  | 'DELETE'
  | 'VENUE_APPROVED'
  | 'VENUE_DECLINED'
  | 'COMPLETE';
export const POD_AUDIT_ACTIONS: PodAuditAction[] = [
  'CREATE',
  'UPDATE',
  'RESUBMIT',
  'DELETE',
  'VENUE_APPROVED',
  'VENUE_DECLINED',
  'COMPLETE',
];

/** Which surface performed the action. */
export type PodAuditSource = 'ADMIN' | 'CLUB_ADMIN' | 'HOST' | 'VENUE_OWNER' | 'SYSTEM';
export const POD_AUDIT_SOURCES: PodAuditSource[] = [
  'ADMIN',
  'CLUB_ADMIN',
  'HOST',
  'VENUE_OWNER',
  'SYSTEM',
];

/** AI risk verdict; PENDING until the async review lands. */
export type PodAuditRisk = 'PENDING' | 'LOW' | 'MEDIUM' | 'HIGH';
export const POD_AUDIT_RISKS: PodAuditRisk[] = ['PENDING', 'LOW', 'MEDIUM', 'HIGH'];

export interface IPodAuditChange {
  field: string;
  from: string;
  to: string;
}

export interface IPodAuditLog extends Document {
  pod_id: Types.ObjectId;
  /** Denormalized for list rendering + search (pods may be soft-deleted). */
  pod_title: string;
  /** Scopes club-admin visibility (a pod always belongs to one club). */
  club_id: Types.ObjectId | null;
  actor_user_id: Types.ObjectId | null;
  actor_name: string;
  source: PodAuditSource;
  action: PodAuditAction;
  changes: IPodAuditChange[];
  /** Free-text context (delete reason, venue decline reason, …). */
  note: string;
  ai_risk: PodAuditRisk;
  ai_summary: string;
  ai_reviewed_at: Date | null;
  created_at: Date;
}

const changeSchema = new Schema<IPodAuditChange>(
  {
    field: { type: String, required: true },
    from: { type: String, default: '' },
    to: { type: String, default: '' },
  },
  { _id: false }
);

const podAuditSchema = new Schema<IPodAuditLog>(
  {
    pod_id: { type: Schema.Types.ObjectId, ref: 'Pod', required: true, index: true },
    pod_title: { type: String, default: '' },
    club_id: { type: Schema.Types.ObjectId, ref: 'Club', default: null, index: true },
    actor_user_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    actor_name: { type: String, default: '' },
    source: { type: String, enum: POD_AUDIT_SOURCES, required: true, index: true },
    action: { type: String, enum: POD_AUDIT_ACTIONS, required: true, index: true },
    changes: { type: [changeSchema], default: [] },
    note: { type: String, default: '', maxlength: 1000 },
    ai_risk: { type: String, enum: POD_AUDIT_RISKS, default: 'PENDING', index: true },
    ai_summary: { type: String, default: '', maxlength: 1000 },
    ai_reviewed_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

podAuditSchema.index({ created_at: -1 });
podAuditSchema.index({ club_id: 1, created_at: -1 });
podAuditSchema.index({ pod_id: 1, created_at: -1 });

export const PodAuditLogModel = model<IPodAuditLog>('PodAuditLog', podAuditSchema);
