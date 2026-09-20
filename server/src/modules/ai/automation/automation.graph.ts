import type { AutomationChannel, AutomationEdge, AutomationGraph, AutomationNode } from './automation.model';

/**
 * The node contract — what each kind of step is, which channel offers it, and
 * what a saved one must carry before the flow may run.
 *
 * The AI portal keeps the same list for its palette. The server's copy is the
 * one that decides: a flow is refused activation on what is here, never on
 * what a screen happened to draw.
 */

export const NODE_KINDS = [
  'trigger',
  'send_whatsapp',
  'send_email',
  'ai_compose',
  'ai_classify',
  'condition',
  'wait_for_reply',
  'delay',
  'set_variable',
  'http_request',
] as const;
export type NodeKind = (typeof NODE_KINDS)[number];

const KIND_SET: ReadonlySet<string> = new Set(NODE_KINDS);
export const isNodeKind = (kind: string): kind is NodeKind => KIND_SET.has(kind);

/** Which kinds each channel may use. A WhatsApp flow never sends email and vice versa. */
const CHANNEL_KINDS: Record<AutomationChannel, ReadonlySet<NodeKind>> = {
  WHATSAPP: new Set<NodeKind>([
    'trigger',
    'send_whatsapp',
    'ai_compose',
    'ai_classify',
    'condition',
    'wait_for_reply',
    'delay',
    'set_variable',
    'http_request',
  ]),
  EMAIL: new Set<NodeKind>([
    'trigger',
    'send_email',
    'ai_compose',
    'ai_classify',
    'condition',
    'delay',
    'set_variable',
    'http_request',
  ]),
};

export const TRIGGERS_BY_CHANNEL: Record<AutomationChannel, readonly string[]> = {
  WHATSAPP: ['INBOUND_MESSAGE', 'MANUAL'],
  EMAIL: ['INBOUND_EMAIL', 'MANUAL'],
};

export const CONDITION_OPS = ['contains', 'equals', 'starts_with', 'matches', 'is_empty', 'not_empty'] as const;
export const DELAY_UNITS = ['MINUTES', 'HOURS', 'DAYS'] as const;
export const HTTP_METHODS = ['POST', 'GET'] as const;
/** The largest single pause: a long drip is several delay steps, not one. */
export const MAX_DELAY_AMOUNT = 10_000;
export const MAX_WAIT_HOURS = 720;

export const VARIABLE_NAME = /^[A-Za-z_]\w{0,63}$/;

export interface GraphIssue {
  node_id: string | null;
  message: string;
}

const str = (v: unknown): string => String(v ?? '').trim();
const list = (v: unknown): string[] => (Array.isArray(v) ? v.map(str) : []);
const num = (v: unknown): number => Number(v);

/** The exits a node offers, by kind and data — what an edge's source_handle may name. */
export function exitsOf(node: AutomationNode): string[] {
  switch (node.kind) {
    case 'condition':
      return ['yes', 'no'];
    case 'wait_for_reply':
      return ['reply', 'timeout'];
    case 'ai_classify': {
      const labels = list(node.data.labels).filter(Boolean);
      return [...labels.map((_label, index) => `label:${index}`), 'other'];
    }
    default:
      return ['next'];
  }
}

function checkTrigger(node: AutomationNode, channel: AutomationChannel, out: GraphIssue[]) {
  const trigger = str(node.data.trigger);
  if (!TRIGGERS_BY_CHANNEL[channel].includes(trigger)) {
    out.push({ node_id: node.id, message: 'Pick what starts the flow' });
  }
  if (trigger === 'INBOUND_EMAIL' && !str(node.data.mailbox)) {
    out.push({ node_id: node.id, message: 'Pick the mailbox the flow listens on' });
  }
}

function checkSendWhatsapp(node: AutomationNode, out: GraphIssue[]) {
  if (!str(node.data.campaign_name)) out.push({ node_id: node.id, message: 'Pick an AiSensy campaign' });
  const params = list(node.data.template_params);
  const blank = params.findIndex((param) => !param);
  if (blank >= 0) out.push({ node_id: node.id, message: `Fill template variable ${blank + 1}` });
}

function checkSendEmail(node: AutomationNode, out: GraphIssue[]) {
  if (!str(node.data.template_slug)) out.push({ node_id: node.id, message: 'Pick an email template' });
}

function checkAi(node: AutomationNode, out: GraphIssue[]) {
  if (!str(node.data.instructions)) out.push({ node_id: node.id, message: 'Tell the model what to do' });
  if (node.kind === 'ai_compose' && !VARIABLE_NAME.test(str(node.data.output_var))) {
    out.push({ node_id: node.id, message: 'Name the output variable (letters, numbers, underscores)' });
  }
  if (node.kind === 'ai_classify' && list(node.data.labels).filter(Boolean).length < 2) {
    out.push({ node_id: node.id, message: 'Add at least two labels' });
  }
}

function checkCondition(node: AutomationNode, out: GraphIssue[]) {
  if (!str(node.data.variable)) out.push({ node_id: node.id, message: 'Name the variable to check' });
  if (!(CONDITION_OPS as readonly string[]).includes(str(node.data.operator))) {
    out.push({ node_id: node.id, message: 'Pick an operator' });
  }
}

function checkDelay(node: AutomationNode, out: GraphIssue[]) {
  const amount = num(node.data.amount);
  if (!Number.isInteger(amount) || amount < 1 || amount > MAX_DELAY_AMOUNT) {
    out.push({ node_id: node.id, message: `Wait for a whole number from 1 to ${MAX_DELAY_AMOUNT}` });
  }
  if (!(DELAY_UNITS as readonly string[]).includes(str(node.data.unit))) {
    out.push({ node_id: node.id, message: 'Pick a unit' });
  }
}

function checkWait(node: AutomationNode, out: GraphIssue[]) {
  const hours = num(node.data.timeout_hours);
  if (!Number.isFinite(hours) || hours < 1 || hours > MAX_WAIT_HOURS) {
    out.push({ node_id: node.id, message: `Give up after 1 to ${MAX_WAIT_HOURS} hours` });
  }
}

function checkSetVariable(node: AutomationNode, out: GraphIssue[]) {
  if (!VARIABLE_NAME.test(str(node.data.name))) {
    out.push({ node_id: node.id, message: 'Name the variable (letters, numbers, underscores)' });
  }
}

function checkHttp(node: AutomationNode, out: GraphIssue[]) {
  if (!/^https:\/\/\S+$/i.test(str(node.data.url))) {
    out.push({ node_id: node.id, message: 'Enter an https:// URL' });
  }
  if (!(HTTP_METHODS as readonly string[]).includes(str(node.data.method))) {
    out.push({ node_id: node.id, message: 'Pick a method' });
  }
}

const CHECKS: Record<NodeKind, (node: AutomationNode, channel: AutomationChannel, out: GraphIssue[]) => void> = {
  trigger: checkTrigger,
  send_whatsapp: (node, _channel, out) => checkSendWhatsapp(node, out),
  send_email: (node, _channel, out) => checkSendEmail(node, out),
  ai_compose: (node, _channel, out) => checkAi(node, out),
  ai_classify: (node, _channel, out) => checkAi(node, out),
  condition: (node, _channel, out) => checkCondition(node, out),
  wait_for_reply: (node, _channel, out) => checkWait(node, out),
  delay: (node, _channel, out) => checkDelay(node, out),
  set_variable: (node, _channel, out) => checkSetVariable(node, out),
  http_request: (node, _channel, out) => checkHttp(node, out),
};

/** Every node an edge walk from the trigger can reach. */
function reachable(trigger: AutomationNode, edges: AutomationEdge[]): Set<string> {
  const seen = new Set<string>([trigger.id]);
  const queue = [trigger.id];
  while (queue.length) {
    const current = queue.shift() as string;
    for (const edge of edges) {
      if (edge.source === current && !seen.has(edge.target)) {
        seen.add(edge.target);
        queue.push(edge.target);
      }
    }
  }
  return seen;
}

/**
 * Everything wrong with a graph, node by node. Empty means the flow may run.
 *
 * A draft may be saved with any of these outstanding; activation and a test
 * run are refused until the list is empty. The messages are for the operator
 * and name the fix, not the rule.
 */
export function validateGraph(graph: AutomationGraph, channel: AutomationChannel): GraphIssue[] {
  const out: GraphIssue[] = [];
  const ids = new Set(graph.nodes.map((node) => node.id));
  const triggers = graph.nodes.filter((node) => node.kind === 'trigger');
  if (triggers.length !== 1) out.push({ node_id: null, message: 'A flow has exactly one trigger' });

  for (const node of graph.nodes) {
    if (!isNodeKind(node.kind) || !CHANNEL_KINDS[channel].has(node.kind)) {
      out.push({ node_id: node.id, message: `This step is not available on a ${channel.toLowerCase()} flow` });
      continue;
    }
    CHECKS[node.kind](node, channel, out);
  }

  const seenEdges = new Set<string>();
  for (const edge of graph.edges) {
    if (!ids.has(edge.source) || !ids.has(edge.target)) {
      out.push({ node_id: null, message: 'An arrow points at a step that no longer exists' });
      continue;
    }
    const key = `${edge.source}:${edge.source_handle}`;
    if (seenEdges.has(key)) out.push({ node_id: edge.source, message: 'One exit leads to two steps' });
    seenEdges.add(key);
  }

  if (triggers.length === 1) {
    const live = reachable(triggers[0], graph.edges);
    for (const node of graph.nodes) {
      if (!live.has(node.id)) out.push({ node_id: node.id, message: 'This step is not connected to the flow' });
    }
    if (graph.nodes.length > 1 && !graph.edges.some((edge) => edge.source === triggers[0].id)) {
      out.push({ node_id: triggers[0].id, message: 'Connect the trigger to a first step' });
    }
  }
  return out;
}

/** The graph as the API received it, with every field coerced to its shape. */
export function normalizeGraph(input: {
  nodes?: Array<{ id: string; kind: string; x?: number | null; y?: number | null; data?: string | null }> | null;
  edges?: Array<{ id: string; source: string; source_handle?: string | null; target: string }> | null;
}): AutomationGraph {
  const nodes: AutomationNode[] = (input.nodes ?? []).slice(0, 200).map((node) => ({
    id: str(node.id).slice(0, 64),
    kind: str(node.kind),
    x: Number.isFinite(Number(node.x)) ? Number(node.x) : 0,
    y: Number.isFinite(Number(node.y)) ? Number(node.y) : 0,
    data: parseData(node.data),
  }));
  const edges: AutomationEdge[] = (input.edges ?? []).slice(0, 400).map((edge) => ({
    id: str(edge.id).slice(0, 64),
    source: str(edge.source),
    source_handle: str(edge.source_handle) || 'next',
    target: str(edge.target),
  }));
  return { nodes, edges };
}

function parseData(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

/** What the list page shows under Trigger. */
export function triggerOf(graph: AutomationGraph): string {
  const trigger = graph.nodes.find((node) => node.kind === 'trigger');
  return str(trigger?.data.trigger);
}
