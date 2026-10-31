import { startClusterJob } from '@utils/clusterJob';
import { SYSTEM_ACTOR, withRun, type RunContext } from '../runs/marketingRun.service';
import { AGENTS, type MarketingAgentKey } from './agent.catalog';
import { agentActor, startMarketingAgent, type AgentRunOutcome } from './agent.runner';
import { marketingAgentService } from './agent.service';

/**
 * The orchestrator: every fifteen minutes, on the scheduler leader, run the
 * enabled agents whose time has come. A tick with nothing due leaves no
 * trace; one with work opens an ORCHESTRATOR run with a step per agent, and
 * each agent runs as its own AGENT run under it (parent_run_id), so the
 * Activity timeline shows both the pass and what each agent did.
 */
export const TICK_MS = 15 * 60_000;
/** Let the server settle after boot before the first pass calls out to the networks and Claude. */
export const FIRST_DELAY_MS = 2 * 60_000;
const COMPONENT = 'marketing-agents';

const plural = (n: number) => (n === 1 ? 'agent' : 'agents');

/** One agent as a child run; its outcome is the step's, so a failed agent is a failed step. */
async function runChild(run: RunContext, key: MarketingAgentKey, now: Date): Promise<AgentRunOutcome> {
  const def = AGENTS[key];
  const started = await startMarketingAgent(key, 'SCHEDULE', agentActor(def), { parent_run_id: run.id });
  await marketingAgentService.markRan(key, started.run_id, now);
  const outcome = await started.finished;
  if (outcome.status === 'FAILED') throw new Error(outcome.error || `${def.name} failed`);
  return outcome;
}

/** One pass. Returns the orchestrator run's id, or null when nothing was due. */
export async function orchestratorPass(now: Date = new Date()): Promise<string | null> {
  const due = await marketingAgentService.dueAgents(now);
  if (due.length === 0) return null;
  return withRun(
    { workflow: 'ORCHESTRATOR', name: `Orchestrator: ${due.length} ${plural(due.length)} due`, trigger: 'SCHEDULE', actor: SYSTEM_ACTOR },
    async (run) => {
      for (const key of due) {
        await run
          .step(key, AGENTS[key].name, () => runChild(run, key, now), {
            tool: 'agent',
            summarize: (outcome) => `${outcome.status} — run ${outcome.run_id}`,
          })
          .catch(() => undefined);
      }
      return run.id;
    }
  );
}

export function startMarketingAgentScheduler(): () => void {
  return startClusterJob({
    component: COMPONENT,
    operation: 'orchestrate',
    firstDelayMs: FIRST_DELAY_MS,
    intervalMs: TICK_MS,
    run: () => orchestratorPass(),
  });
}
