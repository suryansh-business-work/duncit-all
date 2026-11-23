import { Types } from 'mongoose';
import { paymentService } from '../../payment.service';
import { PaymentModel } from '../../payment.model';
import { PodModel } from '@modules/pods/pod/pod.model';

/**
 * Payment Logs search by pod. A payment carries its pod as `pod_id` only, so
 * searching for the pod's title found nothing while filtering by the same pod's
 * id found every payment on it. The search, the list and the KPI totals must all
 * find a pod's payments by its title, its document id, or the payment's own id.
 */
let seq = 0;
const makePayment = (over: Record<string, unknown> = {}) =>
  PaymentModel.create({
    payment_id: `pay_search_${++seq}`,
    user_id: new Types.ObjectId(),
    user_name: 'Asha',
    user_email: 'asha@x.com',
    billing_address: 'address line',
    checkout_url: 'https://app/checkout',
    target_type: 'POD',
    description: 'Pod booking',
    subtotal: 7.63,
    total: 9,
    currency_symbol: '₹',
    status: 'SUCCESS',
    gateway: 'RAZORPAY',
    gateway_ref: `order_${seq}`,
    ...over,
  });

const insertPod = async (pod_title: string, extra: Record<string, unknown> = {}) => {
  const _id = new Types.ObjectId();
  // A slug and club of its own: pods are unique on (club_id, pod_id).
  await PodModel.collection.insertOne({ _id, pod_title, pod_id: `search-pod-${String(_id)}`, club_id: new Types.ObjectId(), ...extra });
  return _id;
};

describe('payment search by pod', () => {
  it('finds every payment on a pod by its title, case- and space-insensitive', async () => {
    const pod = await insertPod('Test pod');
    const other = await insertPod('Board games night');
    for (let i = 0; i < 4; i += 1) await makePayment({ pod_id: pod });
    await makePayment({ pod_id: other });

    const page = await paymentService.table({ search: '  test POD ' });
    expect(page.total).toBe(4);
    expect(page.rows.every((row) => String(row.pod_id) === String(pod))).toBe(true);
  });

  it('agrees with filtering by the pod id, including across pages', async () => {
    const pod = await insertPod('Test pod');
    for (let i = 0; i < 4; i += 1) await makePayment({ pod_id: pod });

    const byFilter = await paymentService.list({ pod_id: String(pod) });
    const firstPage = await paymentService.table({ search: 'Test pod', page_size: 3 });
    const secondPage = await paymentService.table({ search: 'Test pod', page_size: 3, page: 2 });
    const ids = [...firstPage.rows, ...secondPage.rows].map((row) => row.id).sort();
    expect(ids).toEqual(byFilter.map((p: { id: string }) => p.id).sort());
    expect(firstPage.total).toBe(4);
  });

  it('still finds the payments of a cancelled (soft-deleted) pod', async () => {
    const pod = await insertPod('Rooftop yoga', { deleted_at: new Date() });
    await makePayment({ pod_id: pod, status: 'REFUNDED' });
    expect((await paymentService.table({ search: 'rooftop' })).total).toBe(1);
  });

  it('finds a pod\'s payments by its pasted document id, and a payment by its own id', async () => {
    const pod = await insertPod('Test pod');
    const first = await makePayment({ pod_id: pod });
    await makePayment({ pod_id: pod });

    expect((await paymentService.table({ search: String(pod) })).total).toBe(2);
    const own = await paymentService.table({ search: String(first._id) });
    expect(own.rows.map((row) => row.id)).toEqual([String(first._id)]);
  });

  it('keeps the KPI totals on the same payments the search lists', async () => {
    const pod = await insertPod('Test pod');
    for (let i = 0; i < 4; i += 1) await makePayment({ pod_id: pod });
    await makePayment({ pod_id: pod, status: 'FAILED' });

    const totals = await paymentService.totals({ search: 'Test pod' });
    expect(totals).toMatchObject({ count: 4, gross: 36 });
    expect(await paymentService.list({ search: 'test pod' })).toHaveLength(5);
  });

  it('matches nothing extra for a title no pod has, and treats regex characters literally', async () => {
    const pod = await insertPod('Test pod');
    await makePayment({ pod_id: pod });
    expect((await paymentService.table({ search: 'No such pod' })).total).toBe(0);
    expect((await paymentService.table({ search: 'Test.*' })).total).toBe(0);
  });
});
