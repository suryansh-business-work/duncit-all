import { Types } from 'mongoose';

import { couponService } from '../../coupon.service';
import { CouponModel } from '../../coupon.model';

describe('couponService.listAvailableForPod', () => {
  const podId = new Types.ObjectId();
  const otherPod = new Types.ObjectId();
  const past = new Date(Date.now() - 86_400_000);
  const future = new Date(Date.now() + 86_400_000);

  beforeAll(async () => {
    await CouponModel.create([
      { code: 'GLOBAL10', discount_pct: 10, scope: 'GLOBAL' },
      { code: 'PODONLY', discount_pct: 20, scope: 'POD', pod_id: podId },
      { code: 'OTHERPOD', discount_pct: 30, scope: 'POD', pod_id: otherPod },
      { code: 'INACTIVE', discount_pct: 50, scope: 'GLOBAL', is_active: false },
      { code: 'EXPIRED', discount_pct: 50, scope: 'GLOBAL', valid_until: past },
      { code: 'FUTURE', discount_pct: 50, scope: 'GLOBAL', valid_from: future },
    ]);
  });

  it('returns active + valid global and this-pod coupons, sorted by discount', async () => {
    const res = await couponService.listAvailableForPod(podId.toString());
    const codes = res.map((c) => c.code);
    expect(codes).toContain('GLOBAL10');
    expect(codes).toContain('PODONLY');
    expect(codes).not.toContain('OTHERPOD');
    expect(codes).not.toContain('INACTIVE');
    expect(codes).not.toContain('EXPIRED');
    expect(codes).not.toContain('FUTURE');
    // Highest discount first.
    expect(res[0].code).toBe('PODONLY');
  });

  it('returns only global coupons when no pod id is given', async () => {
    const res = await couponService.listAvailableForPod(null);
    expect(res.every((c) => c.scope === 'GLOBAL')).toBe(true);
    expect(res.map((c) => c.code)).not.toContain('PODONLY');
  });
});
