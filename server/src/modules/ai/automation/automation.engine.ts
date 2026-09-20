import { randomUUID } from 'node:crypto';
import { logs } from '@observability/log';
import {
  AutomationFlowModel,
  AutomationRunModel,
  type AutomationChannel,
  type AutomationContact,
  type AutomationGraph,
  type AutomationRunMode,
  type IAutomationRun,
} from './automation.model';
import { executeNode } from './automation.nodes';
import { initialVars, withReply } from './automation.vars';
import type { StepResult } from './automation.types';

/**
 * The walk.
 *
 * A run holds a pointer to the node it is on. `advance` executes that node,
 * records the step, follows the edge the step's exit names, and repeats until
 * a node asks to wait or nothing follows. A wait parks the run with a due
 * time; the scheduler or an incoming reply picks it up again through one of
 * the `resume*` functions, which only move the pointer and call `advance`.
 *
 * Every state change is saved as it happens, so the test window can poll a
 * run mid-walk and a process restart loses at most the step in flight.
 */

/** A flow that loops without a wait is a bug; this is where it stops costing money. */
const MAX_STEPS_PER_ADVANCE = 100;

export interface StartRunInput {
  flow: { id: string; name: string; channel: AutomationChannel };
  graph: AutomationGraph;
  contact: AutomationContact;
  text: string;
  subject: string;
  mode: AutomationRunMode;
  deliver: boolean;
}

/** The phone digits or the lower-cased email — what an incoming reply is matched on. */
export const contactKey = (contact: AutomationContact): string => contact.phone || contact.email;

const message = (input: Omit<IAutomationRun['messages'][number], 'id' | 'at'>) => ({
  ...input,
  id: randomUUID(),
  at: new Date(),
});

export async function startRun(input: StartRunInput): Promise<IAutomationRun> {
  const trigger = input.graph.nodes.find((node) => node.kind === 'trigger');
  const variables = await initialVars({
    flowName: input.flow.name,
    contact: input.contact,
    text: input.text,
    subject: input.subject,
  });
  const run = await AutomationRunModel.create({
    flow_id: input.flow.id,
    flow_name: input.flow.name,
    channel: input.flow.channel,
    mode: input.mode,
    deliver: input.deliver,
    status: 'RUNNING',
    contact: input.contact,
    contact_key: contactKey(input.contact),
    trigger_text: input.text,
    trigger_subject: input.subject,
    variables,
    graph: input.graph,
    current_node_id: trigger?.id ?? '',
    messages: input.text
      ? [message({ direction: 'IN', kind: 'text', text: input.text, subject: input.subject, html: '', template_name: '', buttons: [], delivered: true })]
      : [],
  });
  if (input.mode === 'LIVE') {
    await AutomationFlowModel.updateOne(
      { _id: input.flow.id },
      { $inc: { run_count: 1 }, $set: { last_run_at: new Date() } }
    ).catch((error) => logs.server.warn('automation', 'runCount', { error }));
  }
  return advance(run);
}

function finish(run: IAutomationRun, status: 'COMPLETED' | 'FAILED', error = ''): void {
  run.status = status;
  run.error = error;
  run.finished_at = new Date();
  run.current_node_id = '';
  run.resume_at = null;
  run.wait_until = null;
}

/** Move the pointer along the edge this exit names. Empty when nothing follows. */
function follow(run: IAutomationRun, nodeId: string, handle: string): string {
  const edge = run.graph.edges.find((candidate) => candidate.source === nodeId && candidate.source_handle === handle);
  return edge?.target ?? '';
}

function record(run: IAutomationRun, nodeId: string, kind: string, result: StepResult): void {
  run.steps.push({ node_id: nodeId, kind, title: kind, status: result.status, detail: result.detail, at: new Date() });
  if (result.vars) {
    run.variables = result.vars;
    run.markModified('variables');
  }
  if (result.message) run.messages.push(message(result.message));
}

async function runStep(run: IAutomationRun, nodeId: string): Promise<StepResult> {
  const node = run.graph.nodes.find((candidate) => candidate.id === nodeId);
  if (!node) return { handle: 'next', status: 'FAILED', detail: `Step ${nodeId} is missing from the flow` };
  try {
    const result = await executeNode({
      run,
      node,
      vars: (run.variables ?? {}) as Record<string, unknown>,
      live: run.mode === 'LIVE' || run.deliver,
      test: run.mode === 'TEST',
    });
    record(run, node.id, node.kind, result);
    return result;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    logs.server.error('automation', 'step', { error, run_id: String(run._id), node_id: node.id, kind: node.kind });
    const failed: StepResult = { handle: 'next', status: 'FAILED', detail };
    record(run, node.id, node.kind, failed);
    return failed;
  }
}

/** Walk from the current node until the run waits or ends. */
export async function advance(run: IAutomationRun): Promise<IAutomationRun> {
  run.status = 'RUNNING';
  let steps = 0;
  while (run.current_node_id) {
    steps += 1;
    if (steps > MAX_STEPS_PER_ADVANCE) {
      finish(run, 'FAILED', `Stopped after ${MAX_STEPS_PER_ADVANCE} steps without a wait — the flow loops`);
      break;
    }
    const nodeId = run.current_node_id;
    const node = run.graph.nodes.find((candidate) => candidate.id === nodeId);
    const result = await runStep(run, nodeId);
    if (result.wait) {
      run.status = result.wait.kind === 'REPLY' ? 'WAITING_REPLY' : 'WAITING_DELAY';
      run.wait_until = result.wait.kind === 'REPLY' ? result.wait.until : null;
      run.resume_at = result.wait.kind === 'DELAY' ? result.wait.until : null;
      await run.save();
      return run;
    }
    run.current_node_id = follow(run, node?.id ?? nodeId, result.handle);
    await run.save();
  }
  if (run.status === 'RUNNING') finish(run, 'COMPLETED');
  await run.save();
  return run;
}

/** The parked step becomes done with the outcome that woke it, and the pointer moves on. */
function wake(run: IAutomationRun, handle: string, detail: string): void {
  const last = run.steps.at(-1);
  if (last && last.status === 'WAITING') {
    last.status = 'OK';
    last.detail = detail;
    run.markModified('steps');
  }
  run.current_node_id = follow(run, run.current_node_id, handle);
  run.resume_at = null;
  run.wait_until = null;
}

/** The contact wrote back while a wait-for-reply step held the run. */
export async function resumeWithReply(run: IAutomationRun, text: string): Promise<IAutomationRun> {
  run.messages.push(message({ direction: 'IN', kind: 'text', text, subject: '', html: '', template_name: '', buttons: [], delivered: true }));
  run.variables = withReply(run, text);
  run.markModified('variables');
  wake(run, 'reply', 'The contact replied');
  return advance(run);
}

/** The wait-for-reply window closed with nothing from the contact. */
export async function resumeTimeout(run: IAutomationRun): Promise<IAutomationRun> {
  run.messages.push(message({ direction: 'SYSTEM', kind: 'text', text: 'No reply in time — took the No reply exit', subject: '', html: '', template_name: '', buttons: [], delivered: false }));
  wake(run, 'timeout', 'No reply in time — took the No reply exit');
  return advance(run);
}

/** A delay step's time is up. */
export async function resumeDelay(run: IAutomationRun): Promise<IAutomationRun> {
  wake(run, 'next', 'Waited — moving on');
  return advance(run);
}

export async function cancelRun(run: IAutomationRun): Promise<IAutomationRun> {
  run.status = 'CANCELLED';
  run.finished_at = new Date();
  run.current_node_id = '';
  run.resume_at = null;
  run.wait_until = null;
  await run.save();
  return run;
}
