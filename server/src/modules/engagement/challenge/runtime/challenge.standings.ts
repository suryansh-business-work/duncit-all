import { toolDefinition } from '../tools/challengeTool.catalogue';
import type { JudgeCriterion } from '../tools/challengeTool.config';

/**
 * Turns a challenge's persisted events into standings. Pure: no I/O, so the
 * live view, the leaderboard and the published result all rank with exactly
 * the same rules, and the server is the only place a score is ever computed.
 *
 * Each tool instance yields one metric per competitor; the TOTAL is the
 * weighted sum of the instances marked `counts_toward_total`. Ranking follows
 * the template's winner rules, then its tie-breakers; competitors still equal
 * on every key share a rank (1, 1, 3).
 */

export interface StandingsTool {
  instance_id: string;
  tool_type: string;
  label: string;
  config: Record<string, unknown>;
}

export interface StandingsCompetitor {
  competitor_id: string;
  name: string;
}

export interface StandingsScoreEvent {
  tool_instance_id: string;
  competitor_id: string;
  event_type: string;
  value: number;
}

export interface StandingsVote {
  tool_instance_id: string;
  kind: string;
  candidate_id: string;
  value: number;
  criteria?: { key: string; value: number }[] | null;
}

export interface RankKey {
  rank_by: string;
  direction: 'ASC' | 'DESC';
}

export interface WinnerRules extends RankKey {
  tie_breakers: RankKey[];
  podium_size: number;
}

export interface Standing {
  competitor_id: string;
  name: string;
  rank: number;
  total: number;
  metrics: Record<string, number | null>;
}

export const TOTAL_KEY = 'TOTAL';

const round4 = (n: number) => Math.round(n * 10_000) / 10_000;

function aggregate(values: number[], how: unknown): number | null {
  if (!values.length) return null;
  switch (how) {
    case 'MIN':
      return Math.min(...values);
    case 'SUM':
      return values.reduce((a, b) => a + b, 0);
    case 'LAST':
      return values.at(-1) ?? null;
    default:
      return Math.max(...values);
  }
}

const mean = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);

function judgeTotal(vote: StandingsVote, criteria: JudgeCriterion[]): number {
  const given = new Map((vote.criteria ?? []).map((c) => [c.key, c.value]));
  return criteria.reduce((sum, c) => sum + (given.get(c.key) ?? 0) * c.weight, 0);
}

function metricFor(
  tool: StandingsTool,
  competitorId: string,
  events: StandingsScoreEvent[],
  votes: StandingsVote[]
): number | null {
  const def = toolDefinition(tool.tool_type);
  const mine = (e: { tool_instance_id: string }) => e.tool_instance_id === tool.instance_id;
  switch (def?.metric) {
    case 'SUM':
      return events
        .filter((e) => mine(e) && e.competitor_id === competitorId && e.event_type === 'INCREMENT')
        .reduce((sum, e) => sum + e.value, 0);
    case 'AGGREGATE': {
      const values = events
        .filter((e) => mine(e) && e.competitor_id === competitorId && e.event_type === 'SET')
        .map((e) => e.value);
      return aggregate(values, tool.tool_type === 'RANKING' ? 'LAST' : tool.config.aggregate);
    }
    case 'VOTE_COUNT':
      return votes.filter((v) => mine(v) && v.kind === 'VOTE' && v.candidate_id === competitorId).length;
    case 'AVERAGE':
      return mean(votes.filter((v) => mine(v) && v.kind === 'RATING' && v.candidate_id === competitorId).map((v) => v.value));
    case 'JUDGE_AVERAGE': {
      const criteria = (tool.config.criteria as JudgeCriterion[] | undefined) ?? [];
      const sheets = votes.filter((v) => mine(v) && v.kind === 'JUDGE' && v.candidate_id === competitorId);
      return mean(sheets.map((v) => judgeTotal(v, criteria)));
    }
    default:
      return null;
  }
}

/** Instances that produce a number (layout tools such as Leaderboard do not). */
export function metricTools(tools: StandingsTool[]): StandingsTool[] {
  return tools.filter((t) => {
    const metric = toolDefinition(t.tool_type)?.metric;
    return metric !== undefined && metric !== 'NONE';
  });
}

function valueOf(s: Standing, key: string): number | null {
  return key === TOTAL_KEY ? s.total : (s.metrics[key] ?? null);
}

/** Missing values always sort last, whatever the direction. */
function compareBy(a: Standing, b: Standing, key: RankKey): number {
  const va = valueOf(a, key.rank_by);
  const vb = valueOf(b, key.rank_by);
  if (va === vb) return 0;
  if (va === null) return 1;
  if (vb === null) return -1;
  return key.direction === 'ASC' ? va - vb : vb - va;
}

export function computeStandings(input: {
  tools: StandingsTool[];
  competitors: StandingsCompetitor[];
  events: StandingsScoreEvent[];
  votes: StandingsVote[];
  rules: WinnerRules;
}): Standing[] {
  const scoring = metricTools(input.tools);
  const rows: Standing[] = input.competitors.map((c) => {
    const metrics: Record<string, number | null> = {};
    let total = 0;
    for (const tool of scoring) {
      const value = metricFor(tool, c.competitor_id, input.events, input.votes);
      metrics[tool.instance_id] = value === null ? null : round4(value);
      if (tool.config.counts_toward_total === true && value !== null) {
        total += value * Number(tool.config.weight ?? 1);
      }
    }
    return { competitor_id: c.competitor_id, name: c.name, rank: 0, total: round4(total), metrics };
  });

  const keys: RankKey[] = [{ rank_by: input.rules.rank_by, direction: input.rules.direction }, ...input.rules.tie_breakers];
  const compare = (a: Standing, b: Standing) => {
    for (const key of keys) {
      const diff = compareBy(a, b, key);
      if (diff !== 0) return diff;
    }
    return 0;
  };
  rows.sort((a, b) => compare(a, b) || a.name.localeCompare(b.name));
  rows.forEach((row, i) => {
    const prev = rows[i - 1];
    row.rank = prev && compare(prev, row) === 0 ? prev.rank : i + 1;
  });
  return rows;
}

/** Everyone on the podium's first step (more than one on a full tie). */
export function winnersOf(standings: Standing[]): string[] {
  return standings.filter((s) => s.rank === 1).map((s) => s.competitor_id);
}
