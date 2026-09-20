import { openaiChat } from '@services/openai/openai.client';
import { AiPromptModel } from '@modules/ai/prompt/prompt.model';
import { outboundFetch } from '@utils/outboundFetch';
import { evaluateCondition, readVar, renderVars } from './automation.vars';
import { sendEmailStep, sendWhatsappStep } from './automation.send';
import type { StepContext, StepResult } from './automation.types';

/**
 * One executor per step kind. Each reads its node's data, does its one thing,
 * and says which exit it took. None of them touches the run document — the
 * engine owns that — so a step is a pure function of (node, variables, mode)
 * plus whatever provider it calls.
 */

const str = (v: unknown): string => String(v ?? '').trim();
const list = (v: unknown): string[] => (Array.isArray(v) ? v.map(str) : []);
const HOUR_MS = 60 * 60_000;
const UNIT_MS: Record<string, number> = { MINUTES: 60_000, HOURS: HOUR_MS, DAYS: 24 * HOUR_MS };
const UNIT_LABEL: Record<string, string> = { MINUTES: 'minutes', HOURS: 'hours', DAYS: 'days' };
/** How long a webhook may take before the run moves on without it. */
const WEBHOOK_TIMEOUT_MS = 10_000;
const WEBHOOK_BODY_CAP = 20_000;

const systemNote = (text: string) => ({
  direction: 'SYSTEM' as const,
  kind: 'text',
  text,
  subject: '',
  html: '',
  template_name: '',
  buttons: [],
  delivered: false,
});

function triggerStep(ctx: StepContext): StepResult {
  return { handle: 'next', status: 'OK', detail: `Started by ${str(ctx.node.data.trigger) || 'a run'}` };
}

/** The AI Library row a step named, or nothing. Its body leads the system prompt. */
async function libraryPrompt(promptId: string): Promise<{ content: string; model: string }> {
  if (!promptId) return { content: '', model: '' };
  const row = await AiPromptModel.findById(promptId).select('content target_model is_active').lean().catch(() => null);
  if (!row || row.is_active === false) return { content: '', model: '' };
  return { content: str(row.content), model: str(row.target_model) };
}

async function aiComposeStep(ctx: StepContext): Promise<StepResult> {
  const { node, vars } = ctx;
  const output = str(node.data.output_var) || 'ai_reply';
  const prompt = await libraryPrompt(str(node.data.prompt_id));
  const system = [prompt.content, renderVars(str(node.data.instructions), vars)].filter(Boolean).join('\n\n');
  const user = renderVars(str(node.data.input) || '{{message.text}}', vars);
  const res = await openaiChat({
    task: 'automation.compose',
    detail: `flow:${String(ctx.run.flow_id)}`,
    model: prompt.model || undefined,
    temperature: 0.5,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user || '(no message)' },
    ],
  });
  if (!res.ok) {
    return { handle: 'next', status: 'FAILED', detail: res.message, vars: { ...vars, [output]: '' } };
  }
  const text = res.content.trim();
  return {
    handle: 'next',
    status: 'OK',
    detail: `Saved {{${output}}} (${text.length} characters, ${res.model})`,
    vars: { ...vars, [output]: text },
  };
}

const normal = (value: string) => value.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

async function aiClassifyStep(ctx: StepContext): Promise<StepResult> {
  const { node, vars } = ctx;
  const labels = list(node.data.labels).filter(Boolean);
  const prompt = await libraryPrompt(str(node.data.prompt_id));
  const system = [
    prompt.content,
    renderVars(str(node.data.instructions), vars),
    `Answer with exactly one of these labels and nothing else: ${labels.join(', ')}. If none fits, answer OTHER.`,
  ]
    .filter(Boolean)
    .join('\n\n');
  const user = renderVars(str(node.data.input) || '{{message.text}}', vars);
  const res = await openaiChat({
    task: 'automation.classify',
    detail: `flow:${String(ctx.run.flow_id)}`,
    model: prompt.model || undefined,
    temperature: 0,
    max_tokens: 30,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user || '(no message)' },
    ],
  });
  if (!res.ok) {
    return { handle: 'other', status: 'FAILED', detail: res.message, vars: { ...vars, intent: 'other' } };
  }
  const answer = normal(res.content);
  const exact = labels.findIndex((label) => normal(label) === answer);
  const index = exact >= 0 ? exact : labels.findIndex((label) => answer.includes(normal(label)));
  if (index < 0) {
    return { handle: 'other', status: 'OK', detail: `Model answered "${res.content.trim()}" — took the Anything else exit`, vars: { ...vars, intent: 'other' } };
  }
  return { handle: `label:${index}`, status: 'OK', detail: `Sorted as "${labels[index]}"`, vars: { ...vars, intent: labels[index] } };
}

function conditionStep(ctx: StepContext): StepResult {
  const { node, vars } = ctx;
  const variable = str(node.data.variable);
  const operator = str(node.data.operator);
  const expected = renderVars(str(node.data.value), vars);
  const actual = readVar(vars, variable);
  const yes = evaluateCondition(actual, operator, expected);
  const shown = actual.length > 60 ? `${actual.slice(0, 57)}…` : actual;
  return {
    handle: yes ? 'yes' : 'no',
    status: 'OK',
    detail: `"${shown}" ${operator.replaceAll('_', ' ')} "${expected}" → ${yes ? 'yes' : 'no'}`,
  };
}

function waitForReplyStep(ctx: StepContext): StepResult {
  const hours = Math.min(Math.max(Number(ctx.node.data.timeout_hours) || 24, 1), 720);
  return {
    handle: 'reply',
    status: 'WAITING',
    detail: `Waiting up to ${hours} hours for a reply`,
    wait: { kind: 'REPLY', until: new Date(Date.now() + hours * HOUR_MS) },
  };
}

function delayStep(ctx: StepContext): StepResult {
  const amount = Math.max(1, Math.floor(Number(ctx.node.data.amount) || 1));
  const unit = str(ctx.node.data.unit) || 'HOURS';
  const label = `${amount} ${UNIT_LABEL[unit] ?? unit.toLowerCase()}`;
  if (ctx.test) {
    return { handle: 'next', status: 'OK', detail: `Waits ${label} (skipped in test)`, message: systemNote(`Waits ${label} — skipped in a test run`) };
  }
  return {
    handle: 'next',
    status: 'WAITING',
    detail: `Waiting ${label}`,
    wait: { kind: 'DELAY', until: new Date(Date.now() + amount * (UNIT_MS[unit] ?? HOUR_MS)) },
  };
}

function setVariableStep(ctx: StepContext): StepResult {
  const name = str(ctx.node.data.name);
  const value = renderVars(str(ctx.node.data.value), ctx.vars);
  return { handle: 'next', status: 'OK', detail: `Set {{${name}}} = "${value.slice(0, 80)}"`, vars: { ...ctx.vars, [name]: value } };
}

/** Hosts a webhook may never be pointed at: the server itself and every private range. */
const PRIVATE_HOST = /^(localhost|0\.0\.0\.0|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$|.*\.(internal|local)$)/i;

async function httpRequestStep(ctx: StepContext): Promise<StepResult> {
  const { node, vars } = ctx;
  const url = renderVars(str(node.data.url), vars);
  const method = str(node.data.method) === 'GET' ? 'GET' : 'POST';
  const output = str(node.data.output_var) || 'webhook';
  const body = str(node.data.body) ? renderVars(str(node.data.body), vars) : JSON.stringify(vars);
  let host = '';
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') throw new Error('https only');
    host = parsed.hostname;
  } catch {
    return { handle: 'next', status: 'FAILED', detail: `Not an https URL: ${url}` };
  }
  if (PRIVATE_HOST.test(host)) return { handle: 'next', status: 'FAILED', detail: `Refused: ${host} is not a public host` };
  if (!ctx.live) {
    return {
      handle: 'next',
      status: 'OK',
      detail: `Previewed ${method} ${url} (not called)`,
      message: systemNote(`${method} ${url}\n${method === 'POST' ? body.slice(0, 1200) : ''}`.trim()),
    };
  }
  try {
    const res = await outboundFetch('Automation webhook', url, {
      method,
      headers: { 'content-type': 'application/json', accept: 'application/json, text/plain' },
      body: method === 'POST' ? body : undefined,
      signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
    });
    const text = (await res.text()).slice(0, WEBHOOK_BODY_CAP);
    let parsed: unknown = text;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
    const status: StepResult['status'] = res.ok ? 'OK' : 'FAILED';
    return { handle: 'next', status, detail: `${method} ${host} → HTTP ${res.status}`, vars: { ...vars, [output]: parsed } };
  } catch (error) {
    return { handle: 'next', status: 'FAILED', detail: error instanceof Error ? error.message : String(error) };
  }
}

const EXECUTORS: Record<string, (ctx: StepContext) => StepResult | Promise<StepResult>> = {
  trigger: triggerStep,
  send_whatsapp: sendWhatsappStep,
  send_email: sendEmailStep,
  ai_compose: aiComposeStep,
  ai_classify: aiClassifyStep,
  condition: conditionStep,
  wait_for_reply: waitForReplyStep,
  delay: delayStep,
  set_variable: setVariableStep,
  http_request: httpRequestStep,
};

/** Run one node. An unknown kind is a failed step, not a crashed run. */
export async function executeNode(ctx: StepContext): Promise<StepResult> {
  const executor = EXECUTORS[ctx.node.kind];
  if (!executor) return { handle: 'next', status: 'FAILED', detail: `Unknown step kind "${ctx.node.kind}"` };
  return executor(ctx);
}
