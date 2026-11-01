import { z } from 'zod';
import type { ProductFunnelStepKind, ProductOutcome } from '../../queries';

export const STEP_KINDS = ['SCREEN', 'EVENT', 'ELEMENT', 'OUTCOME'] as const satisfies readonly ProductFunnelStepKind[];

/** What each kind of step is called, and what its value names. */
export const KIND_LABELS: Record<ProductFunnelStepKind, string> = {
  SCREEN: 'analytics.product.funnels.kindScreen',
  EVENT: 'analytics.product.funnels.kindEvent',
  ELEMENT: 'analytics.product.funnels.kindElement',
  OUTCOME: 'analytics.product.funnels.kindOutcome',
};

/** The outcomes the server reads from its records — never from a click. */
export const OUTCOME_LABELS: Record<ProductOutcome, string> = {
  SIGNED_UP: 'analytics.product.outcome.signedUp',
  POD_CREATED: 'analytics.product.outcome.podCreated',
  POD_JOINED: 'analytics.product.outcome.podJoined',
  PAYMENT_SUCCEEDED: 'analytics.product.outcome.paymentSucceeded',
  PAYMENT_FAILED: 'analytics.product.outcome.paymentFailed',
  PAYMENT_REFUNDED: 'analytics.product.outcome.paymentRefunded',
};

/** The server's bounds: 2 to 8 steps, a conversion window of 1 to 30 days. */
export const MIN_STEPS = 2;
export const MAX_STEPS = 8;
export const MAX_WINDOW_DAYS = 30;

export interface FunnelMessages {
  valueRequired: string;
  tooFewSteps: string;
  tooManySteps: string;
  windowRange: string;
}

export const funnelSchema = (messages: FunnelMessages) =>
  z.object({
    steps: z
      .array(z.object({ kind: z.enum(STEP_KINDS), value: z.string().trim().min(1, messages.valueRequired) }))
      .min(MIN_STEPS, messages.tooFewSteps)
      .max(MAX_STEPS, messages.tooManySteps),
    window_days: z.number({ error: messages.windowRange }).int().min(1, messages.windowRange).max(MAX_WINDOW_DAYS, messages.windowRange),
  });

export type FunnelValues = z.infer<ReturnType<typeof funnelSchema>>;

/**
 * The funnel the page opens on — the path from opening the app to paying,
 * every step but the first confirmed on the server.
 */
export const STARTER_FUNNEL: FunnelValues = {
  steps: [
    { kind: 'EVENT', value: 'app_open' },
    { kind: 'OUTCOME', value: 'SIGNED_UP' },
    { kind: 'OUTCOME', value: 'POD_JOINED' },
    { kind: 'OUTCOME', value: 'PAYMENT_SUCCEEDED' },
  ],
  window_days: 7,
};
