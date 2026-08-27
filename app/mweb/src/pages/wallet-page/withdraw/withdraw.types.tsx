/**
 * The host wallet's withdrawal shapes.
 *
 * The rules themselves live in @duncit/forms/schemas — the partner console and
 * the native app ask for the identical payout details, and three copies is how
 * one of them ended up validating the amount in hard-coded English.
 */
export {
  blankWithdrawValues,
  WITHDRAW_METHODS,
  type WithdrawMethod,
  type WithdrawValues,
} from '@duncit/forms/schemas';
