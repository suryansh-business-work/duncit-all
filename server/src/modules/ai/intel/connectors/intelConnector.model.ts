import { Schema, model, type Types } from 'mongoose';
import { INTEL_CONNECTOR_KINDS, INTEL_ENV_CHOICES, type IntelConnectorKind, type IntelEnvChoice } from '../intel.constants';

/**
 * One configured source: a MongoDB database, an MCP server, a Slack workspace,
 * a Gmail mailbox or a set of GitHub repositories. Credentials are NOT here —
 * `env_entry_id` points at a named Tech portal entry (intel.credentials.ts).
 *
 * `environment` is the data the connector holds: STAGING, PRODUCTION, or BOTH
 * for sources that are not environment-specific (a Slack workspace). A MongoDB
 * connection is always exactly one environment — "both" is two connections.
 */

export type ConnectorStatus = 'IDLE' | 'SYNCING' | 'OK' | 'ERROR';

export interface IIntelConnector {
  _id: Types.ObjectId;
  kind: IntelConnectorKind;
  name: string;
  environment: IntelEnvChoice;
  env_entry_id: string;
  enabled: boolean;
  /** Kind-specific options, validated per kind in intelConnector.schema.ts. */
  config: Record<string, unknown>;
  /** Discovered MCP tools, with the admin's classification override. */
  tools: Array<{ name: string; description: string; class: string; override: string | null; input_schema: string }>;
  status: ConnectorStatus;
  sync_paused: boolean;
  last_sync_at: Date | null;
  last_success_at: Date | null;
  last_error: string;
  indexed_count: number;
  /** Incremental-sync position per kind (Slack channel ts, Gmail epoch, GitHub commit sha). */
  cursor: Record<string, unknown>;
  lock_until: Date | null;
  created_by: Types.ObjectId | null;
  updated_by: Types.ObjectId | null;
  created_at: Date;
  updated_at: Date;
}

const toolSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: '' },
    class: { type: String, enum: ['READ', 'WRITE', 'DESTRUCTIVE'], default: 'WRITE' },
    override: { type: String, enum: ['READ', 'WRITE', 'DESTRUCTIVE', null], default: null },
    input_schema: { type: String, default: '{}' },
  },
  { _id: false }
);

const intelConnectorSchema = new Schema<IIntelConnector>(
  {
    kind: { type: String, enum: INTEL_CONNECTOR_KINDS, required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    environment: { type: String, enum: INTEL_ENV_CHOICES, required: true, index: true },
    env_entry_id: { type: String, required: true },
    enabled: { type: Boolean, default: true, index: true },
    config: { type: Schema.Types.Mixed, default: {} },
    tools: { type: [toolSchema], default: [] },
    status: { type: String, enum: ['IDLE', 'SYNCING', 'OK', 'ERROR'], default: 'IDLE' },
    sync_paused: { type: Boolean, default: false },
    last_sync_at: { type: Date, default: null },
    last_success_at: { type: Date, default: null },
    last_error: { type: String, default: '' },
    indexed_count: { type: Number, default: 0 },
    cursor: { type: Schema.Types.Mixed, default: {} },
    lock_until: { type: Date, default: null },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updated_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, minimize: false }
);

intelConnectorSchema.index({ kind: 1, name: 1 }, { unique: true });

export const IntelConnectorModel = model<IIntelConnector>('IntelConnector', intelConnectorSchema, 'intel_connectors');
