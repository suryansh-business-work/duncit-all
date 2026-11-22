/**
 * Growth Calculator — what the API accepts.
 *
 * The formulas themselves live in growthCalculation.formula.ts (imported by
 * nothing but plain TypeScript, so the Targets console can carry a generated
 * copy of it). This file turns an input problem into the BAD_USER_INPUT the
 * GraphQL caller sees, naming every field that failed.
 */
import { GraphQLError } from 'graphql';
import {
  GROWTH_INPUT_BOUNDS,
  GROWTH_INPUT_KEYS,
  growthInputProblem,
  type GrowthInputKey,
  type GrowthInputProblem,
  type GrowthInputs,
} from './growthCalculation.formula';

export {
  GROWTH_FORMULA_VERSION,
  GROWTH_INPUT_BOUNDS,
  GROWTH_INPUT_KEYS,
  computeGrowth,
  paiseToRupees,
  type GrowthInputs,
  type GrowthOutputs,
} from './growthCalculation.formula';

/** One input that failed, named by its field so the console can mark the box. */
export interface GrowthInputIssue {
  field: GrowthInputKey;
  message: string;
}

function messageFor(field: GrowthInputKey, problem: GrowthInputProblem): string {
  const bound = GROWTH_INPUT_BOUNDS[field];
  if (problem === 'number') return `${field} must be a number`;
  if (problem === 'whole') return `${field} must be a whole number`;
  if (problem === 'decimals') return `${field} allows at most 2 decimal places`;
  return `${field} must be between ${bound.min} and ${bound.max}`;
}

/** Every problem with a set of inputs — empty when they are all usable. */
export function growthInputIssues(raw: Partial<Record<GrowthInputKey, unknown>>): GrowthInputIssue[] {
  const issues: GrowthInputIssue[] = [];
  for (const field of GROWTH_INPUT_KEYS) {
    const problem = growthInputProblem(field, raw[field]);
    if (problem) issues.push({ field, message: messageFor(field, problem) });
  }
  return issues;
}

/** The inputs, checked, or a BAD_USER_INPUT naming every field that failed. */
export function validateGrowthInputs(raw: Partial<Record<GrowthInputKey, unknown>>): GrowthInputs {
  const issues = growthInputIssues(raw);
  if (issues.length > 0) {
    throw new GraphQLError(issues.map((i) => i.message).join('; '), {
      extensions: { code: 'BAD_USER_INPUT', fields: issues.map((i) => i.field) },
    });
  }
  return Object.fromEntries(GROWTH_INPUT_KEYS.map((k) => [k, raw[k]])) as unknown as GrowthInputs;
}
