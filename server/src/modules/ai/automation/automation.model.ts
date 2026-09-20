import mongoose, { Schema, type Document, type Types } from 'mongoose';

/**
 * Automation — a flow the AI portal draws and the server walks.
 *
 * A FLOW is the graph: one trigger node, then sends, AI steps, branches and
 * waits, joined by edges whose `source_handle` names the exit taken. Nodes keep
 * their canvas position because the graph is the operator's document, not a
 * compiled artefact — what they saved is what they reopen.
 *
 * A RUN is one walk of a flow for one contact. It snapshots the graph it walks,
 * so editing a flow never changes what a paused run does next, and it carries
 * every step and message so the test window and the run history are the same
 * record read two ways.
 */

export const AUTOMATION_CHANNELS = ['WHATSAPP', 'EMAIL'] as const;
export type AutomationChannel = (typeof AUTOMATION_CHANNELS)[number];

export const FLOW_STATUSES = ['DRAFT', 'ACTIVE', 'PAUSED'] as const;
export type AutomationFlowStatus = (typeof FLOW_STATUSES)[number];

export const RUN_MODES = ['LIVE', 'TEST'] as const;
export type AutomationRunMode = (typeof RUN_MODES)[number];

export const RUN_STATUSES = [
  'RUNNING',
  'WAITING_REPLY',
  'WAITING_DELAY',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
] as const;
export type AutomationRunStatus = (typeof RUN_STATUSES)[number];

export const STEP_STATUSES = ['OK', 'SKIPPED', 'FAILED', 'WAITING'] as const;
export type AutomationStepStatus = (typeof STEP_STATUSES)[number];

/** One box on the canvas. `data` is the kind's own settings, kept as JSON. */
export interface AutomationNode {
  id: string;
  kind: string;
  x: number;
  y: number;
  data: Record<string, unknown>;
}

/** One arrow. `source_handle` is the exit it leaves by — `next` for single-exit steps. */
export interface AutomationEdge {
  id: string;
  source: string;
  source_handle: string;
  target: string;
}

export interface AutomationGraph {
  nodes: AutomationNode[];
  edges: AutomationEdge[];
}

export interface AutomationContact {
  name: string;
  /** Country code + number, digits only. Empty on an email flow. */
  phone: string;
  /** Lower-cased. Empty on a WhatsApp flow. */
  email: string;
}

export interface AutomationStep {
  node_id: string;
  kind: string;
  title: string;
  status: AutomationStepStatus;
  /** What happened, in a sentence — the exit taken, the reason it was skipped, the error. */
  detail: string;
  at: Date;
}

export interface AutomationMessage {
  id: string;
  /** IN from the contact, OUT from the flow, SYSTEM for a note in the transcript. */
  direction: 'IN' | 'OUT' | 'SYSTEM';
  /** text, whatsapp_template or email — what the transcript draws. */
  kind: string;
  text: string;
  subject: string;
  html: string;
  template_name: string;
  buttons: string[];
  /** False for a test preview that was never handed to a provider. */
  delivered: boolean;
  at: Date;
}

export interface AutomationFlowFields {
  name: string;
  description: string;
  channel: AutomationChannel;
  status: AutomationFlowStatus;
  nodes: AutomationNode[];
  edges: AutomationEdge[];
  run_count: number;
  last_run_at: Date | null;
  created_by: string;
  updated_by: string;
  created_at: Date;
  updated_at: Date;
}
export type IAutomationFlow = AutomationFlowFields & Document;

export interface AutomationRunFields {
  flow_id: Types.ObjectId;
  flow_name: string;
  channel: AutomationChannel;
  mode: AutomationRunMode;
  /** TEST only: sends and webhooks act for real instead of previewing. */
  deliver: boolean;
  status: AutomationRunStatus;
  contact: AutomationContact;
  /** The phone digits or the lower-cased email — what an incoming reply is matched on. */
  contact_key: string;
  trigger_text: string;
  trigger_subject: string;
  variables: Record<string, unknown>;
  graph: AutomationGraph;
  current_node_id: string;
  /** WAITING_DELAY: when the scheduler moves it on. */
  resume_at: Date | null;
  /** WAITING_REPLY: when the No reply exit runs instead. */
  wait_until: Date | null;
  steps: AutomationStep[];
  messages: AutomationMessage[];
  error: string;
  started_at: Date;
  finished_at: Date | null;
  created_at: Date;
  updated_at: Date;
}
export type IAutomationRun = AutomationRunFields & Document;

const nodeSchema = new Schema<AutomationNode>(
  {
    id: { type: String, required: true },
    kind: { type: String, required: true },
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
    data: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const edgeSchema = new Schema<AutomationEdge>(
  {
    id: { type: String, required: true },
    source: { type: String, required: true },
    source_handle: { type: String, default: 'next' },
    target: { type: String, required: true },
  },
  { _id: false }
);

const flowSchema = new Schema<IAutomationFlow>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, default: '', trim: true, maxlength: 300 },
    channel: { type: String, enum: AUTOMATION_CHANNELS, required: true, index: true },
    status: { type: String, enum: FLOW_STATUSES, default: 'DRAFT', index: true },
    nodes: { type: [nodeSchema], default: [] },
    edges: { type: [edgeSchema], default: [] },
    run_count: { type: Number, default: 0 },
    last_run_at: { type: Date, default: null },
    created_by: { type: String, default: '' },
    updated_by: { type: String, default: '' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, collection: 'automation_flows' }
);

const contactSchema = new Schema<AutomationContact>(
  {
    name: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
  },
  { _id: false }
);

const stepSchema = new Schema<AutomationStep>(
  {
    node_id: { type: String, required: true },
    kind: { type: String, required: true },
    title: { type: String, default: '' },
    status: { type: String, enum: STEP_STATUSES, required: true },
    detail: { type: String, default: '' },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const messageSchema = new Schema<AutomationMessage>(
  {
    id: { type: String, required: true },
    direction: { type: String, enum: ['IN', 'OUT', 'SYSTEM'], required: true },
    kind: { type: String, default: 'text' },
    text: { type: String, default: '' },
    subject: { type: String, default: '' },
    html: { type: String, default: '' },
    template_name: { type: String, default: '' },
    buttons: { type: [String], default: [] },
    delivered: { type: Boolean, default: false },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const runSchema = new Schema<IAutomationRun>(
  {
    flow_id: { type: Schema.Types.ObjectId, ref: 'AutomationFlow', required: true, index: true },
    flow_name: { type: String, default: '' },
    channel: { type: String, enum: AUTOMATION_CHANNELS, required: true },
    mode: { type: String, enum: RUN_MODES, required: true, index: true },
    deliver: { type: Boolean, default: false },
    status: { type: String, enum: RUN_STATUSES, default: 'RUNNING', index: true },
    contact: { type: contactSchema, default: () => ({}) },
    contact_key: { type: String, default: '', index: true },
    trigger_text: { type: String, default: '' },
    trigger_subject: { type: String, default: '' },
    variables: { type: Schema.Types.Mixed, default: {} },
    graph: {
      nodes: { type: [nodeSchema], default: [] },
      edges: { type: [edgeSchema], default: [] },
    },
    current_node_id: { type: String, default: '' },
    resume_at: { type: Date, default: null, index: true },
    wait_until: { type: Date, default: null, index: true },
    steps: { type: [stepSchema], default: [] },
    messages: { type: [messageSchema], default: [] },
    error: { type: String, default: '' },
    started_at: { type: Date, default: Date.now },
    finished_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, collection: 'automation_runs' }
);

// Test runs are scaffolding: gone after a month so the collection stays the
// size of what actually happened to real contacts.
runSchema.index(
  { created_at: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60, partialFilterExpression: { mode: 'TEST' } }
);

export const AutomationFlowModel =
  mongoose.models.AutomationFlow ?? mongoose.model<IAutomationFlow>('AutomationFlow', flowSchema);
export const AutomationRunModel =
  mongoose.models.AutomationRun ?? mongoose.model<IAutomationRun>('AutomationRun', runSchema);
