import { Types } from 'mongoose';
import { PaymentReleaseModel } from './finance/paymentRelease.model';
import { releaseGroupFilter } from './finance/paymentRelease.service';
import { PaymentModel } from './payment/payment.model';
import { WalletWithdrawalModel } from './wallet/wallet.model';
import { PodExpenseModel } from './podExpense/podExpense.model';
import { CouponModel } from './coupon/coupon.model';
import { idText } from './financeScope';

/**
 * The pods a money record belongs to — what `assertPodFinanceScope` places in a
 * city. Each answers `[]` for an unknown or malformed id; the scope check then
 * refuses a city-bound admin, and the write itself reports NOT_FOUND to
 * everyone else exactly as before.
 */

const oid = (id: unknown): Types.ObjectId | null => {
  const text = idText(id);
  return text ? new Types.ObjectId(text) : null;
};

const podOf = (row: { pod_id?: unknown } | null): unknown[] => (row?.pod_id ? [row.pod_id] : []);

export const financeTargets = {
  async releaseRequest(id: string): Promise<unknown[]> {
    const _id = oid(id);
    return _id ? podOf(await PaymentReleaseModel.findById(_id).select('pod_id').lean()) : [];
  },

  /**
   * A release group is one pod's releases — its id IS the pod's id, see
   * `releaseGroupFilter` — or a batch spanning several pods.
   */
  async releaseGroup(groupId: string): Promise<unknown[]> {
    const podId = oid(groupId);
    return podId ? [podId] : PaymentReleaseModel.distinct('pod_id', releaseGroupFilter(groupId));
  },

  async payment(id: string): Promise<unknown[]> {
    const _id = oid(id);
    return _id ? podOf(await PaymentModel.findById(_id).select('pod_id').lean()) : [];
  },

  /** A withdrawal draws on the releases of every pod in its allocations. */
  async withdrawal(id: string): Promise<unknown[]> {
    const _id = oid(id);
    if (!_id) return [];
    const row = await WalletWithdrawalModel.findById(_id).select('allocations.pod_id').lean();
    return (row?.allocations ?? []).map((a) => a.pod_id);
  },

  async podExpense(id: string): Promise<unknown[]> {
    const _id = oid(id);
    return _id ? podOf(await PodExpenseModel.findById(_id).select('pod_id').lean()) : [];
  },

  /** A GLOBAL or STORE coupon belongs to no pod, so it answers `[]`. */
  async coupon(id: string): Promise<unknown[]> {
    const _id = oid(id);
    return _id ? podOf(await CouponModel.findById(_id).select('pod_id').lean()) : [];
  },

  /**
   * An edit touches the pod the coupon is on AND the pod it ends up on — the
   * same merge `couponService.update` makes. Turning a pod coupon into a GLOBAL
   * one (or the reverse) leaves the pods behind, so it answers `[]`.
   */
  async couponUpdate(id: string, input: { scope?: string | null; pod_id?: string | null }): Promise<unknown[]> {
    const _id = oid(id);
    const row = _id ? await CouponModel.findById(_id).select('scope pod_id').lean() : null;
    if (row?.scope !== 'POD' || !row.pod_id) return [];
    if ((input.scope ?? row.scope) !== 'POD') return [];
    return [row.pod_id, input.pod_id ?? row.pod_id];
  },
};
