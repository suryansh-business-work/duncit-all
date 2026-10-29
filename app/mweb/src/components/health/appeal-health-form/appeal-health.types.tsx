/**
 * The appeal contract lives in @duncit/forms/schemas: mWeb and the native app
 * ask for the same reason and explanation before a deduction goes to Legal,
 * and the refusals are the healthAppeal.* keys both ship (rules 27 + 38 + 40).
 * Re-exported here so the form folder keeps its shape and the form imports
 * nothing outside it.
 */
export {
  healthAppealDefaults,
  makeHealthAppealSchema,
  type HealthAppealValues,
} from '@duncit/forms/schemas';
