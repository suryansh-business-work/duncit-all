import { GraphQLError } from 'graphql';
import mongoose from 'mongoose';
import {
  AUTOMATION_CHANNELS,
  AutomationFlowModel,
  AutomationRunModel,
  FLOW_STATUSES,
  type AutomationChannel,
  type AutomationContact,
  type AutomationFlowStatus,
  type AutomationGraph,
  type AutomationRunMode,
  type IAutomationFlow,
  type IAutomationRun,
} from './automation.model';
import { normalizeGraph, triggerOf, validateGraph, type GraphIssue } from './automation.graph';
import { advance, cancelRun, resumeTimeout, resumeWithReply, startRun } from './automation.engine';
import { isWhatsappDestination } from '@utils/phone';

const badInput = (message: string) => new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
const notFound = (message: string) => new GraphQLError(message, { extensions: { code: 'NOT_FOUND' } });

const str = (value: unknown): string => String(value ?? '').trim();
const iso = (value: Date | null | undefined): string | null => (value ? value.toISOString() : null);

export interface GraphInput {
  nodes?: Array<{ id: string; kind: string; x?: number | null; y?: number | null; data?: string | null }> | null;
  edges?: Array<{ id: string; source: string; source_handle?: string | null; target: string }> | null;
}

export interface SaveFlowInput extends GraphInput {
  id?: string | null;
  name: string;
  description?: string | null;
  channel: AutomationChannel;
}

export interface ContactInput {
  name: string;
  phone?: string | null;
  email?: string | null;
}

export interface TestInput extends GraphInput {
  flow_id: string;
  contact: ContactInput;
  text?: string | null;
  subject?: string | null;
  deliver?: boolean | null;
}

export interface TestReplyInput {
  run_id: string;
  text?: string | null;
  timed_out?: boolean | null;
}

/** A flow as the API returns it: the graph with each node's data as JSON, plus what is wrong with it. */
export function toPubFlow(doc: IAutomationFlow) {
  const graph: AutomationGraph = { nodes: doc.nodes, edges: doc.edges };
  return {
    id: String(doc._id),
    name: doc.name,
    description: doc.description,
    channel: doc.channel,
    status: doc.status,
    nodes: doc.nodes.map((node) => ({ id: node.id, kind: node.kind, x: node.x, y: node.y, data: JSON.stringify(node.data ?? {}) })),
    edges: doc.edges.map((edge) => ({ id: edge.id, source: edge.source, source_handle: edge.source_handle, target: edge.target })),
    trigger: triggerOf(graph),
    issues: validateGraph(graph, doc.channel),
    run_count: doc.run_count,
    last_run_at: iso(doc.last_run_at),
    created_at: iso(doc.created_at),
    updated_at: iso(doc.updated_at),
  };
}

export function toPubRun(doc: IAutomationRun) {
  return {
    id: String(doc._id),
    flow_id: String(doc.flow_id),
    flow_name: doc.flow_name,
    channel: doc.channel,
    mode: doc.mode,
    deliver: doc.deliver,
    status: doc.status,
    contact: doc.contact,
    trigger_text: doc.trigger_text,
    trigger_subject: doc.trigger_subject,
    variables_json: JSON.stringify(doc.variables ?? {}),
    current_node_id: doc.current_node_id,
    steps: doc.steps.map((step) => ({ ...step, at: step.at.toISOString() })),
    messages: doc.messages.map((message) => ({ ...message, at: message.at.toISOString() })),
    error: doc.error,
    started_at: iso(doc.started_at),
    finished_at: iso(doc.finished_at),
    resume_at: iso(doc.resume_at),
    wait_until: iso(doc.wait_until),
  };
}

/** Refuse a graph that cannot run, naming every fix at once. */
function assertRunnable(graph: AutomationGraph, channel: AutomationChannel): void {
  const issues: GraphIssue[] = validateGraph(graph, channel);
  if (!issues.length) return;
  throw new GraphQLError(`The flow is not ready: ${issues.map((issue) => issue.message).join('; ')}`, {
    extensions: { code: 'BAD_USER_INPUT', issues },
  });
}

/** The contact a run is for, checked for the channel it is on. */
function toContact(channel: AutomationChannel, input: ContactInput): AutomationContact {
  const name = str(input.name).slice(0, 120);
  if (!name) throw badInput('Give the contact a name');
  if (channel === 'WHATSAPP') {
    const phone = str(input.phone).replace(/^\+/, '');
    if (!isWhatsappDestination(phone)) throw badInput('Enter the WhatsApp number as digits with its country code');
    return { name, phone, email: '' };
  }
  const email = str(input.email).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw badInput('Enter a valid email address');
  return { name, phone: '', email };
}

async function flowOrThrow(id: string): Promise<IAutomationFlow> {
  if (!mongoose.isValidObjectId(id)) throw notFound('Flow not found');
  const doc = await AutomationFlowModel.findById(id);
  if (!doc) throw notFound('Flow not found');
  return doc;
}

async function runOrThrow(id: string): Promise<IAutomationRun> {
  if (!mongoose.isValidObjectId(id)) throw notFound('Run not found');
  const doc = await AutomationRunModel.findById(id);
  if (!doc) throw notFound('Run not found');
  return doc;
}

export const automationService = {
  list: (channel: AutomationChannel) =>
    AutomationFlowModel.find({ channel }).sort({ updated_at: -1 }).exec(),

  get: (id: string) => (mongoose.isValidObjectId(id) ? AutomationFlowModel.findById(id).exec() : null),

  async save(input: SaveFlowInput, actor: string): Promise<IAutomationFlow> {
    if (!AUTOMATION_CHANNELS.includes(input.channel)) throw badInput('Pick a channel');
    const name = str(input.name).slice(0, 80);
    if (!name) throw badInput('Give the flow a name');
    const graph = normalizeGraph(input);
    const set = {
      name,
      description: str(input.description).slice(0, 300),
      nodes: graph.nodes,
      edges: graph.edges,
      updated_by: actor,
    };
    if (input.id) {
      const doc = await flowOrThrow(input.id);
      if (doc.channel !== input.channel) throw badInput('A flow cannot change channel');
      // An active flow that stops being runnable is paused rather than left
      // running a graph the server would refuse to start.
      const status: AutomationFlowStatus =
        doc.status === 'ACTIVE' && validateGraph(graph, doc.channel).length ? 'PAUSED' : doc.status;
      doc.set({ ...set, status });
      return doc.save();
    }
    return AutomationFlowModel.create({ ...set, channel: input.channel, status: 'DRAFT', created_by: actor });
  },

  async setStatus(id: string, status: AutomationFlowStatus, actor: string): Promise<IAutomationFlow> {
    if (!FLOW_STATUSES.includes(status)) throw badInput('Unknown status');
    const doc = await flowOrThrow(id);
    if (status === 'ACTIVE') assertRunnable({ nodes: doc.nodes, edges: doc.edges }, doc.channel);
    doc.status = status;
    doc.updated_by = actor;
    return doc.save();
  },

  async remove(id: string): Promise<boolean> {
    const doc = await flowOrThrow(id);
    await AutomationRunModel.deleteMany({ flow_id: doc._id });
    await doc.deleteOne();
    return true;
  },

  async duplicate(id: string, actor: string): Promise<IAutomationFlow> {
    const doc = await flowOrThrow(id);
    return AutomationFlowModel.create({
      name: `${doc.name} (copy)`.slice(0, 80),
      description: doc.description,
      channel: doc.channel,
      status: 'DRAFT',
      nodes: doc.nodes,
      edges: doc.edges,
      created_by: actor,
      updated_by: actor,
    });
  },

  runs: (flowId: string, mode: AutomationRunMode | null | undefined, limit: number | null | undefined) => {
    if (!mongoose.isValidObjectId(flowId)) return [];
    const filter: Record<string, unknown> = { flow_id: flowId };
    if (mode) filter.mode = mode;
    return AutomationRunModel.find(filter)
      .sort({ created_at: -1 })
      .limit(Math.min(Math.max(limit ?? 50, 1), 200))
      .exec();
  },

  run: (id: string) => (mongoose.isValidObjectId(id) ? AutomationRunModel.findById(id).exec() : null),

  async cancel(id: string): Promise<IAutomationRun> {
    const run = await runOrThrow(id);
    if (run.finished_at) return run;
    return cancelRun(run);
  },

  /** A test walks the graph AS DRAWN — saved or not — so the operator tests what they see. */
  async startTest(input: TestInput): Promise<IAutomationRun> {
    const flow = await flowOrThrow(input.flow_id);
    const graph = normalizeGraph(input);
    assertRunnable(graph, flow.channel);
    return startRun({
      flow: { id: String(flow._id), name: flow.name, channel: flow.channel },
      graph,
      contact: toContact(flow.channel, input.contact),
      text: str(input.text).slice(0, 4000),
      subject: str(input.subject).slice(0, 300),
      mode: 'TEST',
      deliver: Boolean(input.deliver),
    });
  },

  async resumeTest(input: TestReplyInput): Promise<IAutomationRun> {
    const run = await runOrThrow(input.run_id);
    if (run.mode !== 'TEST') throw badInput('Only a test run can be driven from the test window');
    if (run.status !== 'WAITING_REPLY') throw badInput('This run is not waiting for a reply');
    if (input.timed_out) return resumeTimeout(run);
    const text = str(input.text).slice(0, 4000);
    if (!text) throw badInput('Type a reply');
    return resumeWithReply(run, text);
  },

  /** A live run for one person, started by hand from the builder. */
  async startLive(flowId: string, contact: ContactInput, text: string | null | undefined): Promise<IAutomationRun> {
    const flow = await flowOrThrow(flowId);
    const graph: AutomationGraph = { nodes: flow.nodes, edges: flow.edges };
    assertRunnable(graph, flow.channel);
    return startRun({
      flow: { id: String(flow._id), name: flow.name, channel: flow.channel },
      graph,
      contact: toContact(flow.channel, contact),
      text: str(text).slice(0, 4000),
      subject: '',
      mode: 'LIVE',
      deliver: true,
    });
  },

  /** Exposed for the scheduler's tests and the odd operator nudge. */
  advance,
};
