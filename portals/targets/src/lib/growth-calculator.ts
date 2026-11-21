/**
 * The Growth Calculator formulas, as the console uses them for its instant
 * preview. They are a GENERATED copy of the server's own
 * (growthCalculation.formula.ts, via scripts/generate-growth-formula.mjs), so
 * what a planner sees while typing is exactly what the server will save.
 */
export {
  DEFAULT_GROWTH_INPUTS,
  GROWTH_DESCRIPTION_MAX,
  GROWTH_FORMULA_VERSION,
  GROWTH_INPUT_BOUNDS,
  GROWTH_INPUT_KEYS,
  GROWTH_TITLE_MAX,
  computeGrowth,
  growthInputProblem,
  hasAtMostDecimals,
  paiseToRupees,
  type GrowthBound,
  type GrowthInputKey,
  type GrowthInputProblem,
  type GrowthInputs,
  type GrowthOutputs,
} from './generated/growth-formula';
