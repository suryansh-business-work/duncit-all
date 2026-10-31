import { GraphQLError } from 'graphql';
import { AppEventModel } from '../appEvent.model';
import { eventMatch, type ProductScope } from './product.filter';
import { actorOf, ownersFor } from './product.identity';
import { computeFunnel } from './product.funnel.calc';
import { outcomeOccurrences, PRODUCT_OUTCOMES, type ProductOutcome } from './product.outcomes';
import { elementKeyExpr } from './product.elements';

/**
 * Analytics > Product > Funnels — any sequence of 2 to 8 steps, each a tracked
 * event name, a screen, an element or a server-confirmed outcome (signed up,
 * joined a pod, paid). The platform and version narrow the client steps only:
 * an outcome is a record on the server, which has neither.
 */

export type FunnelStepKind = 'EVENT' | 'SCREEN' | 'ELEMENT' | 'OUTCOME';

export interface FunnelStepInput {
  kind: FunnelStepKind;
  value: string;
}

const MIN_STEPS = 2;
const MAX_STEPS = 8;
const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_WINDOW_DAYS = 7;
/** Occurrences read per client step. A busier step is read up to here, and the answer says so. */
const MAX_ROWS_PER_STEP = 200_000;

const badFunnel = (message: string) => new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });

function checkSteps(steps: readonly FunnelStepInput[]): void {
  if (steps.length < MIN_STEPS || steps.length > MAX_STEPS) throw badFunnel('A funnel has 2 to 8 steps.');
  for (const step of steps) {
    if (!step.value?.trim()) throw badFunnel('Every step needs a value.');
    if (step.kind === 'OUTCOME' && !PRODUCT_OUTCOMES.includes(step.value as ProductOutcome)) {
      throw badFunnel(`${step.value} is not an outcome Duncit records.`);
    }
  }
}

function clientMatch(step: FunnelStepInput): Record<string, unknown> {
  if (step.kind === 'SCREEN') return { event_name: 'screen_view', screen_name: step.value };
  if (step.kind === 'ELEMENT') return { event_name: 'element_click', $expr: { $eq: [elementKeyExpr, { $literal: step.value }] } };
  return { event_name: step.value };
}

interface Occurrence {
  user: string | null;
  device: string;
  at: number;
}

async function clientOccurrences(step: FunnelStepInput, scope: ProductScope, until: Date): Promise<Occurrence[]> {
  const rows = await AppEventModel.find({ ...eventMatch(scope, scope.window.from, until), ...clientMatch(step) })
    .select('user_id device_id occurred_at')
    .limit(MAX_ROWS_PER_STEP)
    .lean<Array<{ user_id: unknown; device_id: string; occurred_at: Date }>>();
  return rows.map((row) => ({
    user: row.user_id ? String(row.user_id) : null,
    device: row.device_id,
    at: row.occurred_at.getTime(),
  }));
}

async function stepOccurrences(step: FunnelStepInput, scope: ProductScope, until: Date): Promise<Occurrence[]> {
  if (step.kind !== 'OUTCOME') return clientOccurrences(step, scope, until);
  const rows = await outcomeOccurrences(step.value as ProductOutcome, { from: scope.window.from, to: until });
  return rows.map((row) => ({ user: row.user, device: '', at: row.at.getTime() }));
}

/** Per person, each step's occurrence times, ascending. */
function timesByPerson(perStep: readonly Occurrence[][], owners: ReadonlyMap<string, string>): Map<string, number[][]> {
  const people = new Map<string, number[][]>();
  perStep.forEach((occurrences, step) => {
    for (const occurrence of occurrences) {
      const actor = actorOf(occurrence.user, occurrence.device, owners);
      const steps = people.get(actor) ?? perStep.map(() => [] as number[]);
      steps[step].push(occurrence.at);
      people.set(actor, steps);
    }
  });
  for (const steps of people.values()) steps.forEach((times) => times.sort((a, b) => a - b));
  return people;
}

export async function productFunnel(scope: ProductScope, steps: readonly FunnelStepInput[], windowDays?: number | null) {
  checkSteps(steps);
  const days = Math.min(30, Math.max(1, Math.round(windowDays ?? DEFAULT_WINDOW_DAYS)));
  const windowMs = days * DAY_MS;
  // A person who entered on the last day still has the whole window to convert, up to now.
  const until = new Date(Math.min(Date.now(), scope.window.to.getTime() + windowMs));
  const perStep = await Promise.all(steps.map((step) => stepOccurrences(step, scope, until)));
  const owners = await ownersFor(
    perStep.flat().flatMap((row) => (row.device ? [{ user: row.user, device: row.device, day: '' }] : []))
  );
  const people = timesByPerson(perStep, owners);
  const results = computeFunnel(
    people.values(),
    steps.length,
    { from: scope.window.from.getTime(), to: scope.window.to.getTime() },
    windowMs
  );
  return {
    window_days: days,
    truncated: perStep.some((rows) => rows.length >= MAX_ROWS_PER_STEP),
    steps: steps.map((step, index) => ({ kind: step.kind, value: step.value, ...results[index] })),
  };
}
