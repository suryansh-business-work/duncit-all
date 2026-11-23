import { z } from 'zod';
import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import { parseInput } from '@modules/finance/failedPayment/failedPayment.validator';
import { FAILED_PAYMENT_READ } from '@modules/finance/failedPayment/failedPayment.types';
import { paymentTrace } from './paymentTrace.service';

/**
 * Any id is matched exactly, never as a pattern, so the only rules are the
 * ones that keep a lookup small: something to look for, and no longer than any
 * id we issue or Razorpay does.
 */
export const traceSchema = z.object({
  ref: z.string().trim().min(1, 'Enter an id to trace').max(100, 'That id is too long'),
});

export const paymentTraceResolvers = {
  Query: {
    // The finance read set: the same people who read Payment Logs' finance
    // views and Failed Payments see where a payment went.
    paymentTrace: (_p: unknown, args: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, FAILED_PAYMENT_READ);
      return paymentTrace(parseInput(traceSchema, args).ref);
    },
  },
};
