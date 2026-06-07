import { couponResolvers } from '../../coupon.resolver';
import { makeContext } from '@test/harness';

const asUser = makeContext({ roles: ['USER'] });
const call = (fn: () => unknown) => (async () => fn())();

describe('coupon unit (RBAC)', () => {
  it('gates admin queries + mutations to admin roles', async () => {
    await expect(call(() => (couponResolvers.Query as any).coupons({}, { filter: {} }, asUser))).rejects.toThrow(/access denied/i);
    await expect(call(() => (couponResolvers.Query as any).coupon({}, { id: 'x' }, asUser))).rejects.toThrow(/access denied/i);
    await expect(call(() => (couponResolvers.Query as any).couponsForPod({}, { pod_id: 'x' }, asUser))).rejects.toThrow(/access denied/i);
    await expect(call(() => (couponResolvers.Mutation as any).createCoupon({}, { input: {} }, asUser))).rejects.toThrow(/access denied/i);
    await expect(call(() => (couponResolvers.Mutation as any).updateCoupon({}, { id: 'x', input: {} }, asUser))).rejects.toThrow(/access denied/i);
    await expect(call(() => (couponResolvers.Mutation as any).deleteCoupon({}, { id: 'x' }, asUser))).rejects.toThrow(/access denied/i);
  });

  it('requires authentication for the public preview', async () => {
    await expect(
      call(() => (couponResolvers.Query as any).previewCoupon({}, { input: {} }, makeContext(null)))
    ).rejects.toThrow();
  });
});
