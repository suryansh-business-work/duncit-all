import {
  buildWithdrawInput as buildSharedWithdrawInput,
  type WithdrawValues,
} from '@duncit/forms/schemas';

import type { RequestWithdrawalInput } from '@/generated/graphql/graphql';

/**
 * The withdrawal contract, from @duncit/forms/schemas — mWeb and the partner
 * console validate the identical rules against the identical sentences.
 */
export {
  blankWithdrawValues,
  makeWithdrawSchema,
  makeWithdrawSchema as buildWithdrawSchema,
  WITHDRAW_METHODS,
  type WithdrawMethod,
  type WithdrawValues,
} from '@duncit/forms/schemas';

/**
 * Maps the validated values onto the server's RequestWithdrawalInput.
 *
 * The generated `WithdrawalMethod` enum is a string enum whose members ARE
 * 'UPI' | 'IMPS' | 'NEFT', so the shared builder's output already matches; the
 * assertion only tells TypeScript that.
 */
export function buildWithdrawInput(values: WithdrawValues): RequestWithdrawalInput {
  return buildSharedWithdrawInput(values) as RequestWithdrawalInput;
}
