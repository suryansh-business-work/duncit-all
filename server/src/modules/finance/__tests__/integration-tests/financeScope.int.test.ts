import { Types } from 'mongoose';
import type { GraphQLContext } from '@context';
import { PodModel } from '@modules/pods/pod/pod.model';
import { LocationModel } from '@modules/platform/location/location.model';
import { UserModel } from '@modules/access/user/user.model';
import { PaymentModel } from '../../payment/payment.model';
import { paymentService } from '../../payment/payment.service';
import { paymentResolvers } from '../../payment/payment.resolver';
import { financeResolvers } from '../../finance/finance.resolver';
import { paymentReleaseService } from '../../finance/paymentRelease.service';
import { paymentReleaseGroupService } from '../../finance/paymentReleaseGroup.service';
import { PaymentReleaseModel } from '../../finance/paymentRelease.model';
import { walletResolvers } from '../../wallet/wallet.resolver';
import { walletService } from '../../wallet/wallet.service';
import { WalletWithdrawalModel } from '../../wallet/wallet.model';
import { couponResolvers } from '../../coupon/coupon.resolver';
import { CouponModel } from '../../coupon/coupon.model';
import { podExpenseResolvers } from '../../podExpense/podExpense.resolver';
import { PodExpenseModel } from '../../podExpense/podExpense.model';

/**
 * A city admin moves money for their own city only.
 *
 * CITY_ADMIN and ZONAL_ADMIN pass the finance write gates, but their reach is
 * one city or a set of zones. Every payout, refund, settlement, withdrawal and
 * pod-level money write checks that the pod behind it is in the caller's city
 * (or zone) — and refuses, fail-closed, when it is not or cannot be placed.
 * SUPER_ADMIN and FINANCE_MANAGER are not city-bound and are never checked.
 */

let seq = 0;
const PUNE = 'Pune';

const ctxFor = (roles: string[], extra: { assigned_city?: string | null; assigned_zones?: string[] } = {}) =>
  ({ user: { id: new Types.ObjectId().toHexString(), roles, ...extra } }) as unknown as GraphQLContext;

const puneAdmin = () => ctxFor(['CITY_ADMIN'], { assigned_city: PUNE });
const financeManager = () => ctxFor(['FINANCE_MANAGER']);
const FORBIDDEN = { extensions: { code: 'FORBIDDEN' } };

async function seedLocation(slug: string, name: string, zone: string) {
  return LocationModel.create({
    location_id: slug,
    location_name: name,
    city: name,
    location_image: 'https://x.com/city.jpg',
    location_pincode: '411001',
    location_zones: [{ zone_name: zone }],
  });
}

async function seedPod(locationId: Types.ObjectId | null, zone: string | null, hostId = new Types.ObjectId()) {
  return PodModel.create({
    pod_id: `scope-pod-${++seq}`,
    pod_title: 'Sunset Pod',
    pod_hosts_id: [hostId],
    club_id: new Types.ObjectId(),
    pod_description: 'desc',
    pod_date_time: new Date(),
    pod_type: 'PAID',
    location_id: locationId,
    zone_name: zone,
  });
}

async function seedPayment(podId: Types.ObjectId | null) {
  return PaymentModel.create({
    payment_id: `scope-pay-${++seq}`,
    user_id: new Types.ObjectId(),
    user_name: 'Buyer',
    user_email: 'buyer@x.com',
    subtotal: 500,
    total: 500,
    status: 'SUCCESS',
    pod_id: podId,
  });
}

let punePod: Awaited<ReturnType<typeof seedPod>>;
let mumbaiPod: Awaited<ReturnType<typeof seedPod>>;
let puneLocationId: string;

beforeEach(async () => {
  const pune = await seedLocation('pune', PUNE, 'Kothrud');
  const mumbai = await seedLocation('mumbai', 'Mumbai', 'Bandra');
  puneLocationId = String(pune._id);
  punePod = await seedPod(pune._id, 'Kothrud');
  mumbaiPod = await seedPod(mumbai._id, 'Bandra');
});

afterEach(() => jest.restoreAllMocks());

describe('refundPayment', () => {
  const refund = (ctx: GraphQLContext, id: string) =>
    paymentResolvers.Mutation.refundPayment(undefined, { payment_doc_id: id, reason: 'dup' }, ctx);

  it('refuses a city admin another city’s booking, and never reaches the refund', async () => {
    const spy = jest.spyOn(paymentService, 'refund').mockResolvedValue(null as never);
    const payment = await seedPayment(mumbaiPod._id);
    await expect(refund(puneAdmin(), String(payment._id))).rejects.toMatchObject(FORBIDDEN);
    expect(spy).not.toHaveBeenCalled();
  });

  it('lets a city admin refund a booking in their own city, as themselves', async () => {
    const spy = jest.spyOn(paymentService, 'refund').mockResolvedValue(null as never);
    const payment = await seedPayment(punePod._id);
    const ctx = puneAdmin();
    await refund(ctx, String(payment._id));
    expect(spy).toHaveBeenCalledWith(String(payment._id), 'dup', ctx.user?.id);
  });

  it('matches the assigned city whether it is written as the name, the slug or the Location id', async () => {
    const spy = jest.spyOn(paymentService, 'refund').mockResolvedValue(null as never);
    const payment = await seedPayment(punePod._id);
    for (const city of ['pune', ' PUNE ', puneLocationId]) {
      await refund(ctxFor(['CITY_ADMIN'], { assigned_city: city }), String(payment._id));
    }
    expect(spy).toHaveBeenCalledTimes(3);
  });

  it('fails closed: a city admin with no assigned city, or a payment tied to no pod', async () => {
    const spy = jest.spyOn(paymentService, 'refund').mockResolvedValue(null as never);
    const own = await seedPayment(punePod._id);
    const podless = await seedPayment(null);
    await expect(refund(ctxFor(['CITY_ADMIN']), String(own._id))).rejects.toMatchObject(FORBIDDEN);
    await expect(refund(puneAdmin(), String(podless._id))).rejects.toMatchObject(FORBIDDEN);
    await expect(refund(puneAdmin(), 'not-an-id')).rejects.toMatchObject(FORBIDDEN);
    expect(spy).not.toHaveBeenCalled();
  });

  it('still covers a cancelled (soft-deleted) pod of their own city', async () => {
    const spy = jest.spyOn(paymentService, 'refund').mockResolvedValue(null as never);
    const payment = await seedPayment(punePod._id);
    await PodModel.updateOne({ _id: punePod._id }, { $set: { deleted_at: new Date() } });
    await refund(puneAdmin(), String(payment._id));
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('leaves Finance and super admins unscoped, for any city and for pod-less payments', async () => {
    const spy = jest.spyOn(paymentService, 'refund').mockResolvedValue(null as never);
    const mumbai = await seedPayment(mumbaiPod._id);
    const podless = await seedPayment(null);
    await refund(financeManager(), String(mumbai._id));
    await refund(ctxFor(['SUPER_ADMIN']), String(podless._id));
    // A city admin who ALSO holds the finance seat is not city-bound.
    await refund(ctxFor(['CITY_ADMIN', 'FINANCE_MANAGER'], { assigned_city: PUNE }), String(mumbai._id));
    expect(spy).toHaveBeenCalledTimes(3);
  });
});

describe('payment release and settlement', () => {
  it('approvePodPaymentRelease: refuses another city’s pod, approves their own', async () => {
    const approve = jest.spyOn(paymentReleaseService, 'approveGroup').mockResolvedValue(undefined as never);
    jest.spyOn(paymentReleaseGroupService, 'detail').mockResolvedValue(null as never);
    const run = (id: string) => financeResolvers.Mutation.approvePodPaymentRelease(undefined, { id }, puneAdmin());
    await expect(run(String(mumbaiPod._id))).rejects.toMatchObject(FORBIDDEN);
    expect(approve).not.toHaveBeenCalled();
    await run(String(punePod._id));
    expect(approve).toHaveBeenCalledWith(String(punePod._id), expect.any(String));
  });

  it('approvePodPaymentRelease: a batch spanning a second city is refused whole', async () => {
    const approve = jest.spyOn(paymentReleaseService, 'approveGroup').mockResolvedValue(undefined as never);
    const base = { kind: 'HOST_PAYMENT', status: 'PENDING', pod_title: 'P', beneficiary_name: 'Asha', beneficiary_email: 'asha@x.com', amount_requested: 100, batch_id: 'batch-1' };
    await PaymentReleaseModel.create([
      { ...base, release_id: `rel-${++seq}`, pod_id: punePod._id, host_user_id: new Types.ObjectId() },
      { ...base, release_id: `rel-${++seq}`, pod_id: mumbaiPod._id, host_user_id: new Types.ObjectId() },
    ]);
    await expect(
      financeResolvers.Mutation.approvePodPaymentRelease(undefined, { id: 'batch-1' }, puneAdmin())
    ).rejects.toMatchObject(FORBIDDEN);
    expect(approve).not.toHaveBeenCalled();
  });

  it('reviewPaymentReleaseRequest: follows the request to its pod', async () => {
    const review = jest.spyOn(paymentReleaseService, 'review').mockResolvedValue(null as never);
    const row = await PaymentReleaseModel.create({
      release_id: `rel-${++seq}`,
      kind: 'HOST_PAYMENT',
      status: 'PENDING',
      pod_id: mumbaiPod._id,
      pod_title: 'P',
      beneficiary_name: 'Asha',
      beneficiary_email: 'asha@x.com',
      host_user_id: new Types.ObjectId(),
      amount_requested: 100,
    });
    const input = { status: 'APPROVED' };
    await expect(
      financeResolvers.Mutation.reviewPaymentReleaseRequest(undefined, { request_id: String(row._id), input }, puneAdmin())
    ).rejects.toMatchObject(FORBIDDEN);
    await financeResolvers.Mutation.reviewPaymentReleaseRequest(undefined, { request_id: String(row._id), input }, financeManager());
    expect(review).toHaveBeenCalledTimes(1);
  });

  it('createPaymentReleaseRequest: a zonal admin requests for their own zones only', async () => {
    const create = jest.spyOn(paymentReleaseService, 'create').mockResolvedValue(null as never);
    const zonal = ctxFor(['ZONAL_ADMIN'], { assigned_zones: ['kothrud'] });
    const input = (pod: { _id: Types.ObjectId }) => ({ input: { pod_id: String(pod._id), kind: 'HOST_PAYMENT', amount_requested: 10 } });
    await expect(financeResolvers.Mutation.createPaymentReleaseRequest(undefined, input(mumbaiPod), zonal)).rejects.toMatchObject(FORBIDDEN);
    await financeResolvers.Mutation.createPaymentReleaseRequest(undefined, input(punePod), zonal);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('completePodSettlement: an admin settles their own city; the pod’s host settles wherever it is', async () => {
    const complete = jest.spyOn(paymentReleaseService, 'completePod').mockResolvedValue(null as never);
    const hostId = new Types.ObjectId();
    const hosted = await seedPod(mumbaiPod.location_id as Types.ObjectId, 'Bandra', hostId);
    const settle = (podId: Types.ObjectId, ctx: GraphQLContext) =>
      financeResolvers.Mutation.completePodSettlement(undefined, { input: { pod_id: String(podId), venue_bill_amount: 0 } }, ctx);

    await expect(settle(mumbaiPod._id, puneAdmin())).rejects.toMatchObject(FORBIDDEN);
    await settle(punePod._id, puneAdmin());
    const host = { user: { id: String(hostId), roles: ['HOST'] } } as unknown as GraphQLContext;
    await settle(hosted._id, host);
    expect(complete).toHaveBeenCalledTimes(2);
  });
});

describe('withdrawals', () => {
  async function seedWithdrawal(pods: Types.ObjectId[]) {
    return WalletWithdrawalModel.create({
      withdrawal_id: `wd-${++seq}`,
      user_id: new Types.ObjectId(),
      amount: 100,
      scheduled_for: new Date(),
      allocations: pods.map((pod_id) => ({ pod_id, kind: 'HOST_PAYMENT', amount: 100 / pods.length })),
    });
  }
  const review = (ctx: GraphQLContext, id: string) =>
    walletResolvers.Mutation.reviewWithdrawal(undefined, { withdrawal_id: id, input: { status: 'PAID' } }, ctx);

  it('pays out only when every pod it draws on is in the admin’s city', async () => {
    const spy = jest.spyOn(walletService, 'reviewWithdrawal').mockResolvedValue(null as never);
    const own = await seedWithdrawal([punePod._id]);
    const mixed = await seedWithdrawal([punePod._id, mumbaiPod._id]);
    const unallocated = await seedWithdrawal([]);
    await expect(review(puneAdmin(), String(mixed._id))).rejects.toMatchObject(FORBIDDEN);
    await expect(review(puneAdmin(), String(unallocated._id))).rejects.toMatchObject(FORBIDDEN);
    await review(puneAdmin(), String(own._id));
    await review(financeManager(), String(mixed._id));
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('keeps the platform-wide withdrawal minimums away from a city admin', async () => {
    const update = jest.spyOn(walletService, 'updateWithdrawalMinimums').mockResolvedValue(null as never);
    await expect(
      walletResolvers.Mutation.updateWithdrawalMinimums(undefined, { input: { HOST: 100 } as never }, puneAdmin())
    ).rejects.toMatchObject(FORBIDDEN);
    await walletResolvers.Mutation.updateWithdrawalMinimums(undefined, { input: { HOST: 100 } as never }, financeManager());
    expect(update).toHaveBeenCalledTimes(1);
  });
});

describe('platform-wide settings and per-person commission', () => {
  it('refuses a city admin the finance settings every city pays by', async () => {
    await expect(
      financeResolvers.Mutation.updateFinanceSettings(undefined, { input: { platform_fee_pct: 1 } }, puneAdmin())
    ).rejects.toMatchObject(FORBIDDEN);
    const saved = await financeResolvers.Mutation.updateFinanceSettings(undefined, { input: { platform_fee_pct: 7 } }, financeManager());
    expect(saved.platform_fee_pct).toBe(7);
  });

  it('setHostDeductions: a city admin sets the commission of their own city’s hosts only', async () => {
    const mumbaiHost = await UserModel.create({ auth: { email: `m${++seq}@x.com` }, profile: { first_name: 'M', city: 'Mumbai' } });
    const puneHost = await UserModel.create({ auth: { email: `p${++seq}@x.com` }, profile: { first_name: 'P', city: 'pune' } });
    const set = (userId: unknown, ctx: GraphQLContext) =>
      financeResolvers.Mutation.setHostDeductions(undefined, { user_id: String(userId), host_commission_pct: 12 }, ctx);

    await expect(set(mumbaiHost._id, puneAdmin())).rejects.toMatchObject(FORBIDDEN);
    expect(await set(puneHost._id, puneAdmin())).toBe(true);
    // Resolved through the Location too: an admin whose city is stored as its id.
    expect(await set(puneHost._id, ctxFor(['CITY_ADMIN'], { assigned_city: puneLocationId }))).toBe(true);
    const stored = await UserModel.findById(puneHost._id).lean<{ finance?: { host_commission_pct?: number } }>();
    expect(stored?.finance?.host_commission_pct).toBe(12);
    const untouched = await UserModel.findById(mumbaiHost._id).lean<{ finance?: { host_commission_pct?: number } }>();
    expect(untouched?.finance?.host_commission_pct).not.toBe(12);
  });
});

describe('pod coupons and pod expenses', () => {
  it('createCoupon: a city admin issues codes for their own city’s pods, never GLOBAL ones', async () => {
    const coupon = (scope: string, pod?: { _id: Types.ObjectId }) => ({
      input: { code: `SC${++seq}X`, discount_pct: 10, scope, pod_id: pod ? String(pod._id) : null },
    });
    await expect(couponResolvers.Mutation.createCoupon(undefined, coupon('GLOBAL'), puneAdmin())).rejects.toMatchObject(FORBIDDEN);
    await expect(couponResolvers.Mutation.createCoupon(undefined, coupon('POD', mumbaiPod), puneAdmin())).rejects.toMatchObject(FORBIDDEN);
    const own = await couponResolvers.Mutation.createCoupon(undefined, coupon('POD', punePod), puneAdmin());
    expect(own.pod_id).toBe(String(punePod._id));
    // The Marketing console is not city-bound.
    await couponResolvers.Mutation.createCoupon(undefined, coupon('GLOBAL'), ctxFor(['MARKETING_MANAGER']));
    expect(await CouponModel.countDocuments()).toBe(2);
  });

  it('updateCoupon / deleteCoupon: no moving a code to another city or making it GLOBAL', async () => {
    const own = await CouponModel.create({ code: `OWN${++seq}`, discount_pct: 5, scope: 'POD', pod_id: punePod._id });
    const id = String(own._id);
    await expect(
      couponResolvers.Mutation.updateCoupon(undefined, { id, input: { pod_id: String(mumbaiPod._id) } }, puneAdmin())
    ).rejects.toMatchObject(FORBIDDEN);
    await expect(couponResolvers.Mutation.updateCoupon(undefined, { id, input: { scope: 'GLOBAL' } }, puneAdmin())).rejects.toMatchObject(FORBIDDEN);
    const foreign = await CouponModel.create({ code: `FOR${++seq}`, discount_pct: 5, scope: 'POD', pod_id: mumbaiPod._id });
    await expect(couponResolvers.Mutation.deleteCoupon(undefined, { id: String(foreign._id) }, puneAdmin())).rejects.toMatchObject(FORBIDDEN);
    expect(await couponResolvers.Mutation.deleteCoupon(undefined, { id }, puneAdmin())).toBeTruthy();
    expect(await CouponModel.exists({ _id: foreign._id })).not.toBeNull();
  });

  it('deletePodExpense: refuses another city’s pod bill and keeps it', async () => {
    const bill = await PodExpenseModel.create({ expense_id: `pe-${++seq}`, pod_id: mumbaiPod._id, date: new Date(), amount: 900 });
    await expect(
      podExpenseResolvers.Mutation.deletePodExpense(undefined, { expense_doc_id: String(bill._id) }, puneAdmin())
    ).rejects.toMatchObject(FORBIDDEN);
    expect(await PodExpenseModel.exists({ _id: bill._id })).not.toBeNull();
    expect(
      await podExpenseResolvers.Mutation.deletePodExpense(undefined, { expense_doc_id: String(bill._id) }, financeManager())
    ).toBe(true);
  });
});
