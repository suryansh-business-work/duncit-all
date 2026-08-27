/**
 * The partner wallet's withdrawal shapes.
 *
 * The rules themselves live in @duncit/forms/schemas — mWeb and the native app
 * ask for the identical payout details, and three copies is how this console
 * ended up validating the amount in hard-coded English.
 */
export {
  blankWithdrawValues,
  WITHDRAW_METHODS,
  type WithdrawMethod,
  type WithdrawValues,
} from '@duncit/forms/schemas';
