/**
 * The cancellation policy's rules, shapes and mappers come from
 * `@duncit/forms/schemas` — re-exported here so the form and its page keep one
 * import — because the Partners console and the native app ask the owner for
 * the same bands (rules 27 + 40).
 */
export {
  emptyTier,
  makeCancellationPolicySchema,
  toPolicyInput,
  toPolicyValues,
  type CancellationPolicyValues,
  type CancellationTierValues,
  type VenueCancellationPolicy,
} from '@duncit/forms/schemas';
