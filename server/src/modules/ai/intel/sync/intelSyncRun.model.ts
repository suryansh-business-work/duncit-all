import { Schema, model, type Types } from 'mongoose';

/** One sync of one connector: what triggered it, what it read and wrote, and its log. Kept 30 days. */

export type SyncRunStatus = 'QUEUED' | 'RUNNING' | 'SUCCESS' | 'PARTIAL' | 'FAILED' | 'SKIPPED';

export interface IIntelSyncRun {
  _id: Types.ObjectId;
  connector_id: string;
  connector_name: string;
  kind: string;
  mode: 'FULL' | 'INCREMENTAL';
  trigger: 'MANUAL' | 'SCHEDULE' | 'WEBHOOK' | 'CREATE' | 'REBUILD';
  status: SyncRunStatus;
  stats: { seen: number; indexed: number; unchanged: number; failed: number; deleted: number };
  error: string;
  log: string[];
  started_by: string;
  started_at: Date | null;
  finished_at: Date | null;
  created_at: Date;
}

const intelSyncRunSchema = new Schema<IIntelSyncRun>(
  {
    connector_id: { type: String, required: true, index: true },
    connector_name: { type: String, default: '' },
    kind: { type: String, required: true },
    mode: { type: String, enum: ['FULL', 'INCREMENTAL'], required: true },
    trigger: { type: String, enum: ['MANUAL', 'SCHEDULE', 'WEBHOOK', 'CREATE', 'REBUILD'], required: true },
    status: { type: String, enum: ['QUEUED', 'RUNNING', 'SUCCESS', 'PARTIAL', 'FAILED', 'SKIPPED'], default: 'QUEUED', index: true },
    stats: {
      seen: { type: Number, default: 0 },
      indexed: { type: Number, default: 0 },
      unchanged: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      deleted: { type: Number, default: 0 },
    },
    error: { type: String, default: '' },
    log: { type: [String], default: [] },
    started_by: { type: String, default: '' },
    started_at: { type: Date, default: null },
    finished_at: { type: Date, default: null },
    created_at: { type: Date, default: () => new Date() },
  },
  { versionKey: false }
);

intelSyncRunSchema.index({ created_at: 1 }, { expireAfterSeconds: 30 * 24 * 3600 });

export const IntelSyncRunModel = model<IIntelSyncRun>('IntelSyncRun', intelSyncRunSchema, 'intel_sync_runs');
