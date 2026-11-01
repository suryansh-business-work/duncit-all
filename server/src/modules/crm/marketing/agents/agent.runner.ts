import { MarketingRunModel, type MarketingRunStatus, type MarketingRunTrigger } from '../runs/marketingRun.model';
import { continueRun, recordStep, startRun, type RunActor, type RunContext } from '../runs/marketingRun.service';
import { AGENT_PARAMS, agentDefinition, type AgentDefinition, type AgentParams, type MarketingAgentKey } from './agent.catalog';
import { MarketingAgentConfigModel } from './agent.model';
import { planAgent, type AgentPlan, type PlannedAction } from './agent.plan';
import { recordPlanCost } from './agent.cost';
import { runTool, type ToolContext } from './agent.tools';

/**
 * One agent run, recorded end to end in the marketing run log:
 *
 *   plan      Claude reads the brief, the accounts and the limits and answers
 *             with up to ten tool calls — FAILED (and the run with it) when
 *             the AI funnel refuses or the answer is not a plan.
 *   action-n  one step per planned call, through the tool registry; a tool
 *             the agent may not use, or a bad input, is a FAILED step and the
 *             run carries on (PARTIAL at the end).
 *   report    what was planned and what each action did.
 *
 * The actor is the person who pressed Run now, or the agent itself under the
 * orchestrator; records the tools write are filed under the person, or the
 * manager who switched the agent on.
 */
export interface AgentRunOutcome {
  run_id: string;
  status: MarketingRunStatus;
  error: string;
}

export interface StartAgentOptions {
  parent_run_id?: string;
  /** Who the agent's records belong to; the config's last editor when absent. */
  user_id?: string;
}

export interface StartedAgentRun {
  run_id: string;
  /** Settles when the run has finished, with its final status; never rejects. */
  finished: Promise<AgentRunOutcome>;
}

const LABEL_MAX = 200;

export const agentActor = (def: AgentDefinition): RunActor => ({ kind: 'AGENT', id: def.key, name: def.name });

const reasonOf = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/** The stored params, valid or defaulted, and who the agent works for. */
async function loadConfig(def: AgentDefinition): Promise<{ params: AgentParams; owner: string }> {
  const doc = await MarketingAgentConfigModel.findOne({ key: def.key }).lean();
  const parsed = def.params.safeParse(doc?.params ?? {});
  return { params: parsed.success ? parsed.data : AGENT_PARAMS.parse({}), owner: doc?.updated_by ?? '' };
}

async function performAction(ctx: ToolContext, n: number, action: PlannedAction): Promise<string> {
  const key = `action-${n}`;
  const label = `${action.tool}: ${action.why || 'no reason given'}`.slice(0, LABEL_MAX);
  if (await ctx.run.cancelled()) {
    await recordStep(ctx.run.id, key, { status: 'SKIPPED', label, tool: action.tool, error: 'Stopped before this step ran' });
    return `${n}. ${action.tool}: skipped — the run was stopped`;
  }
  try {
    const result = await ctx.run.step(key, label, () => runTool(action.tool, action.input, ctx), {
      tool: action.tool,
      input_summary: JSON.stringify(action.input ?? {}),
      summarize: (r) => r.summary,
    });
    return `${n}. ${action.tool}: ${result.summary}`;
  } catch (error) {
    return `${n}. ${action.tool}: FAILED — ${reasonOf(error)}`;
  }
}

/** The summary, the approval note where it applies, then a line per action — in that order, since the step keeps only its first 500 characters. */
function report(def: AgentDefinition, plan: AgentPlan, lines: string[]): string {
  const parts = [plan.summary || '(no summary)'];
  if (def.needs_approval) parts.push('Posts from this run wait on Marketing › Approvals; nothing went out.');
  parts.push(...(lines.length > 0 ? lines : ['No actions were planned.']));
  return parts.join('\n');
}

async function body(run: RunContext, def: AgentDefinition, params: AgentParams, who: { actor: RunActor; user_id: string }): Promise<void> {
  const planned = await run.step('plan', 'Plan with Claude', () => planAgent(def, params, who.user_id), {
    tool: 'marketing.agent_plan',
    input_summary: params.brief,
    summarize: (p) => `${p.plan.actions.length} action(s): ${p.plan.summary}`,
  });
  await recordPlanCost(run, planned.model, planned.usage);
  const ctx: ToolContext = { run, actor: who.actor, user_id: who.user_id, agent: def };
  const lines: string[] = [];
  for (const [index, action] of planned.plan.actions.entries()) lines.push(await performAction(ctx, index + 1, action));
  await run.step('report', 'Report', async () => report(def, planned.plan, lines), { summarize: (text) => text });
}

async function outcomeOf(run_id: string): Promise<AgentRunOutcome> {
  const doc = await MarketingRunModel.findById(run_id).select('status error').lean<{ status: MarketingRunStatus; error?: string }>();
  return { run_id, status: doc?.status ?? 'FAILED', error: doc?.error ?? '' };
}

/** Open the run and start its work; the id is known at once, the outcome when `finished` settles. */
export async function startMarketingAgent(
  key: MarketingAgentKey,
  trigger: MarketingRunTrigger,
  actor: RunActor,
  options: StartAgentOptions = {}
): Promise<StartedAgentRun> {
  const def = agentDefinition(key);
  const { params, owner } = await loadConfig(def);
  const run_id = await startRun({ workflow: 'AGENT', name: def.name, trigger, actor, links: { agent_key: def.key }, parent_run_id: options.parent_run_id });
  const who = { actor, user_id: options.user_id ?? owner };
  // A failed run is already recorded (and logged) by continueRun; the outcome is read back off the row.
  const finished = continueRun(run_id, (run) => body(run, def, params, who))
    .catch(() => undefined)
    .then(() => outcomeOf(run_id));
  return { run_id, finished };
}

/** Run an agent to the end and say how it went. */
export async function runMarketingAgent(
  key: MarketingAgentKey,
  trigger: MarketingRunTrigger,
  actor: RunActor,
  options: StartAgentOptions = {}
): Promise<AgentRunOutcome> {
  const started = await startMarketingAgent(key, trigger, actor, options);
  return started.finished;
}
