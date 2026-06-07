import { Types } from 'mongoose';
import { couponService } from '../../coupon.service';
import { CouponModel } from '../../coupon.model';
import { PaymentModel } from '@modules/finance/payment/payment.model';

const podId = new Types.ObjectId().toString();

describe('couponService integration', () => {
  it('creates a coupon, rejects a duplicate code, lists + fetches it', async () => {
    const created = await couponService.create({
      code: 'save20',
      discount_pct: 20,
      scope: 'GLOBAL',
    });
    expect(created.code).toBe('SAVE20');
    expect(created.discount_pct).toBe(20);
    await expect(couponService.create({ code: 'SAVE20', discount_pct: 10, scope: 'GLOBAL' })).rejects.toThrow(
      /already exists/i
    );
    expect((await couponService.list()).length).toBeGreaterThan(0);
    expect(await couponService.getById(created.id)).toMatchObject({ code: 'SAVE20' });
  });

  it('evaluates a valid global coupon and computes the discount', async () => {
    await couponService.create({ code: 'TEN', discount_pct: 10, scope: 'GLOBAL' });
    const res = await couponService.evaluate('TEN', podId, 500, new Types.ObjectId().toString());
    expect(res.ok).toBe(true);
    expect(res.discount_amount).toBe(50);
    expect(res.final_total).toBe(450);
  });

  it('rejects invalid / inactive / wrong-pod / expired / min-order / max-uses coupons', async () => {
    expect((await couponService.evaluate('NOPE', null, 500)).ok).toBe(false);

    await couponService.create({ code: 'OFFP', discount_pct: 50, scope: 'POD', pod_id: podId });
    const other = new Types.ObjectId().toString();
    expect((await couponService.evaluate('OFFP', other, 500)).ok).toBe(false); // wrong pod
    expect((await couponService.evaluate('OFFP', podId, 500)).ok).toBe(true); // right pod

    await couponService.create({
      code: 'EXPIRED',
      discount_pct: 10,
      scope: 'GLOBAL',
      valid_until: '2000-01-01T00:00:00.000Z',
    });
    expect((await couponService.evaluate('EXPIRED', null, 500)).message).toMatch(/expired/i);

    await couponService.create({
      code: 'FUTURE',
      discount_pct: 10,
      scope: 'GLOBAL',
      valid_from: '2999-01-01T00:00:00.000Z',
    });
    expect((await couponService.evaluate('FUTURE', null, 500)).message).toMatch(/not active yet/i);

    await couponService.create({ code: 'MIN1000', discount_pct: 10, scope: 'GLOBAL', min_order_amount: 1000 });
    expect((await couponService.evaluate('MIN1000', null, 500)).message).toMatch(/minimum order/i);

    const capped = await CouponModel.create({ code: 'CAP', discount_pct: 10, scope: 'GLOBAL', max_uses: 1, used_count: 1 });
    expect((await couponService.evaluate('CAP', null, 500)).message).toMatch(/usage limit/i);
    expect(capped.code).toBe('CAP');
  });

  it('enforces the per-user limit from prior successful payments', async () => {
    const user = new Types.ObjectId();
    await couponService.create({ code: 'ONCE', discount_pct: 10, scope: 'GLOBAL', per_user_limit: 1 });
    await PaymentModel.create({
      payment_id: 'p_once',
      user_id: user,
      user_name: 'A',
      user_email: 'a@a.com',
      subtotal: 100,
      total: 90,
      coupon_code: 'ONCE',
      status: 'SUCCESS',
    });
    const res = await couponService.evaluate('ONCE', null, 500, user.toString());
    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/already used/i);
  });

  it('previews, updates, records a redemption and deletes', async () => {
    const c = await couponService.create({ code: 'PREV', discount_pct: 25, scope: 'GLOBAL' });
    const preview = await couponService.preview(
      { code: 'PREV', pod_id: null, amount: 200 },
      new Types.ObjectId().toString()
    );
    expect(preview).toMatchObject({ ok: true, discount_amount: 50, final_total: 150 });

    const updated = await couponService.update(c.id, { discount_pct: 30 });
    expect(updated.discount_pct).toBe(30);

    await couponService.recordRedemption('PREV');
    expect((await couponService.getById(c.id))?.used_count).toBe(1);

    expect(await couponService.remove(c.id)).toBe(true);
    expect(await couponService.getById(c.id)).toBeNull();
  });

  it('lists global + pod-scoped coupons for a pod', async () => {
    await couponService.create({ code: 'GLO', discount_pct: 5, scope: 'GLOBAL' });
    await couponService.create({ code: 'PODONLY', discount_pct: 5, scope: 'POD', pod_id: podId });
    const list = await couponService.listForPod(podId);
    const codes = list.map((c) => c.code);
    expect(codes).toEqual(expect.arrayContaining(['GLO', 'PODONLY']));
  });
});
