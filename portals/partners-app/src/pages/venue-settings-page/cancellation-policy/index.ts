/**
 * The cancellation-policy form. Its rules, shapes and mappers come from
 * `@duncit/forms/schemas` — re-exported here so the page keeps one import —
 * because mWeb and the native app ask the owner for the same bands.
 */
export { default as CancellationPolicyForm } from './cancellation-policy.form';
export type {
  CancellationPolicyFormProps,
  SubmitCancellationPolicy,
} from './cancellation-policy.form';
export {
  emptyTier,
  makeCancellationPolicySchema,
  toPolicyInput,
  toPolicyValues,
  type CancellationPolicyValues,
  type CancellationTierValues,
} from '@duncit/forms/schemas';
