export { default as WithdrawForm } from './withdraw.form';
/**
 * The rules and shapes come from @duncit/forms/schemas — re-exported here so the
 * page's existing imports keep working while the contract lives in one place.
 */
export {
  blankWithdrawValues,
  buildWithdrawInput,
  makeWithdrawSchema,
  makeWithdrawSchema as buildWithdrawSchema,
  WITHDRAW_METHODS,
  type WithdrawMethod,
  type WithdrawValues,
} from '@duncit/forms/schemas';
