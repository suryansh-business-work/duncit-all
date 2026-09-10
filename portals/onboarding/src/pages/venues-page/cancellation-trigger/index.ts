/**
 * The venue cancellation-trigger form, as the Review dialog mounts it: the
 * auto-cancel window this venue answers to, and the refund ladder behind it.
 */
export { default as CancellationTriggerForm } from './cancellation-trigger.form';
export type { CancellationTriggerFormProps } from './cancellation-trigger.form';
export {
  DEFAULT_TRIGGER_HOURS,
  emptyRefundTier,
  makeCancellationTriggerSchema,
  toTriggerValues,
} from './cancellation-trigger.schema';
export type {
  CancellationTriggerValues,
  RefundTierValues,
  SubmitCancellationTrigger,
  VenueCancellationTrigger,
  VenueRefundTier,
} from './cancellation-trigger.types';
