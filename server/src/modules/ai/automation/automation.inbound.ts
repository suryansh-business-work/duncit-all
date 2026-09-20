import { logs } from '@observability/log';
import { AutomationFlowModel, AutomationRunModel, type AutomationFlowFields } from './automation.model';
import { resumeWithReply, startRun } from './automation.engine';
import { hasKeywords, matchesKeywords } from './automation.vars';

/**
 * Where a message from outside enters the automation.
 *
 * Two doors, one rule each. A message from someone a run is WAITING on is that
 * run's reply, whatever it says — a keyword flow must not steal the answer to
 * "which day suits you?". Otherwise it starts every active flow whose trigger
 * matches, with one tiebreak: a flow with keywords outranks a catch-all, so a
 * "pricing" flow and an "answer everything" flow do not both fire on
 * "pricing please".
 */

const digits = (value: unknown): string => String(value ?? '').replaceAll(/\D/g, '');
const str = (value: unknown): string => String(value ?? '').trim();

export interface InboundWhatsapp {
  from: string;
  name: string;
  text: string;
}

/** Loose on purpose: a provider payload is read, never trusted, and every value it yields is coerced below. */
const pick = (source: Record<string, any> | null | undefined, ...keys: string[]): any => {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
};

/**
 * The sender and the words, out of whichever shape the provider posts.
 *
 * AiSensy forwards Meta's Cloud API message object (`entry[].changes[].value`),
 * some of its webhook events wrap the same fields under `data`, and a manual
 * relay posts them flat. All three name a sender and a text body; this reads
 * the first one it finds and refuses anything that has neither.
 */
export function parseWhatsappInbound(body: unknown): InboundWhatsapp | null {
  if (!body || typeof body !== 'object') return null;
  const root = body as Record<string, any>;
  const value = root.entry?.[0]?.changes?.[0]?.value;
  const meta = value?.messages?.[0];
  const data = root.data && typeof root.data === 'object' ? root.data : null;
  const source: Record<string, any> = meta ?? data ?? root;

  const from = digits(pick(source, 'from', 'sender', 'wa_id', 'waId', 'phone', 'destination', 'mobile'));
  const text = firstString(
    pick(source, 'text')?.body,
    pick(source, 'text'),
    pick(source, 'message')?.text?.body,
    pick(source, 'message')?.text,
    pick(source, 'message'),
    pick(source, 'body', 'content')
  );
  const name = str(
    value?.contacts?.[0]?.profile?.name ??
      pick(source, 'profile')?.name ??
      pick(source, 'name', 'senderName', 'user_name', 'userName')
  );
  if (!from || !text) return null;
  return { from, name, text: text.slice(0, 4000) };
}

/** The first candidate that is actual text — a media message carries an object here, not words. */
const firstString = (...candidates: unknown[]): string => {
  const hit = candidates.find((candidate) => typeof candidate === 'string' && candidate.trim() !== '');
  return typeof hit === 'string' ? hit.trim() : '';
};

type LeanFlow = AutomationFlowFields & { _id: unknown };

function triggerData(flow: LeanFlow): Record<string, unknown> {
  return flow.nodes.find((node) => node.kind === 'trigger')?.data ?? {};
}

/** The active flows this message should start: keyworded matches first, catch-alls only when none matched. */
function matchingFlows(flows: LeanFlow[], trigger: string, text: string, extra: (data: Record<string, unknown>) => boolean): LeanFlow[] {
  const candidates = flows.filter((flow) => {
    const data = triggerData(flow);
    return str(data.trigger) === trigger && extra(data) && matchesKeywords(text, str(data.keywords));
  });
  const keyworded = candidates.filter((flow) => hasKeywords(triggerData(flow).keywords));
  return keyworded.length ? keyworded : candidates;
}

export async function inboundWhatsapp(message: InboundWhatsapp): Promise<{ resumed: number; started: number }> {
  const waiting = await AutomationRunModel.findOne({
    status: 'WAITING_REPLY',
    mode: 'LIVE',
    channel: 'WHATSAPP',
    contact_key: message.from,
  }).sort({ updated_at: -1 });
  if (waiting) {
    await resumeWithReply(waiting, message.text);
    return { resumed: 1, started: 0 };
  }

  const flows = await AutomationFlowModel.find({ channel: 'WHATSAPP', status: 'ACTIVE' }).lean<LeanFlow[]>();
  const chosen = matchingFlows(flows, 'INBOUND_MESSAGE', message.text, () => true);
  for (const flow of chosen) {
    await startRun({
      flow: { id: String(flow._id), name: flow.name, channel: 'WHATSAPP' },
      graph: { nodes: flow.nodes, edges: flow.edges },
      contact: { name: message.name || message.from, phone: message.from, email: '' },
      text: message.text,
      subject: '',
      mode: 'LIVE',
      deliver: true,
    }).catch((error) => logs.server.error('automation', 'inboundWhatsapp', { error, flow_id: String(flow._id) }));
  }
  return { resumed: 0, started: chosen.length };
}

export interface InboundEmail {
  /** The connected Gmail mailbox the message reached. */
  mailbox: string;
  fromEmail: string;
  fromName: string;
  subject: string;
  text: string;
}

export async function inboundEmail(message: InboundEmail): Promise<{ started: number }> {
  const mailbox = message.mailbox.toLowerCase();
  const flows = await AutomationFlowModel.find({ channel: 'EMAIL', status: 'ACTIVE' }).lean<LeanFlow[]>();
  const haystack = `${message.subject}\n${message.text}`;
  const chosen = matchingFlows(flows, 'INBOUND_EMAIL', haystack, (data) => str(data.mailbox).toLowerCase() === mailbox);
  for (const flow of chosen) {
    await startRun({
      flow: { id: String(flow._id), name: flow.name, channel: 'EMAIL' },
      graph: { nodes: flow.nodes, edges: flow.edges },
      contact: { name: message.fromName || message.fromEmail, phone: '', email: message.fromEmail.toLowerCase() },
      text: message.text.slice(0, 8000),
      subject: message.subject,
      mode: 'LIVE',
      deliver: true,
    }).catch((error) => logs.server.error('automation', 'inboundEmail', { error, flow_id: String(flow._id) }));
  }
  return { started: chosen.length };
}
