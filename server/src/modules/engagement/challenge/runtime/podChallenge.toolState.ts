import { createHmac } from 'node:crypto';
import { toolDefinition } from '../tools/challengeTool.catalogue';
import type { QuizQuestion } from '../tools/challengeTool.config';
import type { PodChallengeDoc } from './podChallenge.model';

/**
 * What each tool shows beyond a number: a poll's tallies, the buzz order, the
 * quiz's open question, ticked tasks, the picks so far, the gallery. Built
 * from the persisted ledgers on every read, per viewer:
 *
 *  - a quiz's correct answers are stripped from the settings a player
 *    receives (and only the manager's copy keeps them), and
 *  - a checkpoint's codes — the secret a QR link carries — are given to
 *    managers only.
 */

export interface LedgerEvent {
  tool_instance_id: string;
  competitor_id: string;
  event_type: string;
  value: number;
  item_key?: string | null;
}

export interface LedgerVote {
  tool_instance_id: string;
  kind: string;
  candidate_id: string;
  value: number;
  scope_key?: string | null;
  created_at?: Date | null;
}

export interface LedgerEntry {
  _id: { toString(): string };
  tool_instance_id: string;
  competitor_id: string;
  media_url: string;
  media_type: string;
  caption?: string | null;
}

export interface Ledger {
  events: LedgerEvent[];
  votes: LedgerVote[];
  entries: LedgerEntry[];
}

type Tool = PodChallengeDoc['tools'][number];
type State = PodChallengeDoc['tool_state'][number] | undefined;

/** The buzz round a ballot belongs to, as stored in its scope key. */
export const buzzScope = (round: number) => `r${round}`;

/**
 * The code a checkpoint's QR link carries. Derived, not stored: an HMAC over
 * the challenge, tool and checkpoint, so it cannot be guessed from another
 * checkpoint's code and needs no migration when checkpoints are edited.
 */
export function checkpointCode(challengeId: string, instanceId: string, itemKey: string): string {
  return createHmac('sha256', process.env.JWT_SECRET || 'dev-secret')
    .update(`${challengeId}:${instanceId}:${itemKey}`)
    .digest('hex')
    .slice(0, 12);
}

/** itemKey → done, per competitor: the latest tick for each task wins. */
export function doneItems(events: LedgerEvent[], instanceId: string): Map<string, Set<string>> {
  const done = new Map<string, Set<string>>();
  for (const e of events) {
    if (e.tool_instance_id !== instanceId || e.event_type !== 'SET' || !e.item_key) continue;
    const set = done.get(e.competitor_id) ?? new Set<string>();
    if (e.value === 1) set.add(e.item_key);
    else set.delete(e.item_key);
    done.set(e.competitor_id, set);
  }
  return done;
}

/** Who buzzed in one round, first press first. */
export function buzzOrder(votes: LedgerVote[], instanceId: string, round: number): string[] {
  const pressed = votes
    .filter((v) => v.tool_instance_id === instanceId && v.kind === 'BUZZ' && v.scope_key === buzzScope(round))
    .sort((a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime())
    .map((v) => v.candidate_id);
  // A team is listed once, at its fastest player's press.
  return [...new Set(pressed)];
}

function itemsState(doc: PodChallengeDoc, tool: Tool, ledger: Ledger, canManage: boolean) {
  const done = doneItems(ledger.events, tool.instance_id);
  const items = ((tool.config as { items?: { key: string }[] }).items ?? []).map((i) => i.key);
  const withCodes = canManage && tool.tool_type === 'CHECKPOINT';
  return {
    done: Object.fromEntries([...done].map(([competitorId, keys]) => [competitorId, [...keys]])),
    ...(withCodes
      ? { codes: Object.fromEntries(items.map((key) => [key, checkpointCode(doc._id.toString(), tool.instance_id, key)])) }
      : {}),
  };
}

function pollState(tool: Tool, ledger: Ledger) {
  const tallies: Record<string, number> = {};
  for (const v of ledger.votes) {
    if (v.tool_instance_id === tool.instance_id && v.kind === 'POLL') {
      tallies[v.candidate_id] = (tallies[v.candidate_id] ?? 0) + 1;
    }
  }
  return { tallies, total: Object.values(tallies).reduce((a, b) => a + b, 0) };
}

function quizState(tool: Tool, state: State, ledger: Ledger) {
  const answered: Record<string, number> = {};
  for (const v of ledger.votes) {
    if (v.tool_instance_id === tool.instance_id && v.kind === 'ANSWER' && v.scope_key) {
      answered[v.scope_key] = (answered[v.scope_key] ?? 0) + 1;
    }
  }
  return { active: state?.active_item ?? '', answered };
}

/** The public state of one tool for this viewer. */
export function toolStateFor(doc: PodChallengeDoc, tool: Tool, state: State, ledger: Ledger, canManage: boolean): Record<string, unknown> {
  switch (toolDefinition(tool.tool_type)?.input) {
    case 'CHECK':
    case 'CHECKPOINT':
      return itemsState(doc, tool, ledger, canManage);
    case 'POLL':
      return pollState(tool, ledger);
    case 'QUIZ':
      return quizState(tool, state, ledger);
    case 'BUZZ': {
      const round = state?.buzz_round ?? 0;
      return { round, order: buzzOrder(ledger.votes, tool.instance_id, round) };
    }
    case 'PICK':
      return { picked: state?.picked ?? [] };
    case 'SUBMIT':
      return {
        entries: ledger.entries
          .filter((e) => e.tool_instance_id === tool.instance_id)
          .map((e) => ({
            id: e._id.toString(),
            competitor_id: e.competitor_id,
            media_url: e.media_url,
            media_type: e.media_type,
            caption: e.caption ?? '',
          })),
      };
    default:
      return {};
  }
}

/** A tool's settings as this viewer may read them: players never get a quiz's correct answers. */
export function publicConfig(tool: Tool, canManage: boolean): unknown {
  const config = (tool.config ?? {}) as Record<string, unknown>;
  if (canManage || tool.tool_type !== 'QUIZ') return config;
  const questions = (config.questions as QuizQuestion[] | undefined) ?? [];
  return {
    ...config,
    questions: questions.map((q) => ({ key: q.key, label: q.label, options: q.options, points: q.points })),
  };
}
