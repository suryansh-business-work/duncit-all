/**
 * Calling off a pod-shop order: one claim per order, the courier stop that may
 * block a cancel, stock going back, and the refund step. Collaborators mocked.
 */
jest.mock('@observability/log', () => ({ logs: { server: { error: jest.fn(), info: jest.fn() } } }));
jest.mock('@modules/venues/inventory/inventory.model', () => ({ InventoryProductModel: { updateOne: jest.fn() } }));
jest.mock('@modules/pods/pod/pod.model', () => ({ PodModel: { updateOne: jest.fn() } }));
jest.mock('../../productOrder.model', () => ({
  ProductOrderModel: { findById: jest.fn(), findOneAndUpdate: jest.fn(), updateOne: jest.fn() },
}));
jest.mock('../../productOrder.refund', () => ({ issueRefund: jest.fn(), retryRefund: jest.fn() }));
jest.mock('../../productOrder.notify', () => ({ notifyOrderCancelled: jest.fn() }));
jest.mock('@modules/commerce/shiprocket/shiprocket.client', () => ({
  withShiprocketAccount: jest.fn((_account: unknown, fn: () => Promise<unknown>) => fn()),
}));
jest.mock('@modules/commerce/shiprocket/shiprocket.shipment', () => ({ accountForOrder: jest.fn() }));
jest.mock('@modules/commerce/shiprocket/shiprocket.gateway', () => ({ cancelOrders: jest.fn() }));

import { Types } from 'mongoose';
import { InventoryProductModel } from '@modules/venues/inventory/inventory.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { cancelOrders } from '@modules/commerce/shiprocket/shiprocket.gateway';
import { ProductOrderModel } from '../../productOrder.model';
import { issueRefund, retryRefund } from '../../productOrder.refund';
import { notifyOrderCancelled } from '../../productOrder.notify';
import {
  cancelPodShopOrder,
  openPodShopOrderFilter,
  refundRequestFor,
  retryOrderRefund,
} from '../../productOrder.cancel';

const m = (fn: unknown) => fn as jest.Mock;
const ID = new Types.ObjectId().toHexString();
const PRODUCT = new Types.ObjectId();
const VARIANT = new Types.ObjectId();

const order = (over: Record<string, unknown> = {}) => ({
  _id: new Types.ObjectId(ID),
  order_no: 'ORD-1',
  channel: 'POD_SHOP',
  fulfilment_status: 'AWAITING_SHIPMENT',
  total: 500,
  payment_id: 'pay1',
  pod_id: new Types.ObjectId(),
  shiprocket: {},
  line_items: [{ product_id: PRODUCT, variant_id: String(VARIANT), qty: 2 }],
  tracking_events: [] as unknown[],
  notes: [] as unknown[],
  refund: { status: '', initiated_by: '' },
  cancelled_at: null,
  cancel_reason: 'because',
  save: jest.fn().mockResolvedValue(undefined),
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  m(ProductOrderModel.findById).mockResolvedValue(order());
  m(ProductOrderModel.findOneAndUpdate).mockImplementation(async () => order());
  m(ProductOrderModel.updateOne).mockResolvedValue({});
  m(issueRefund).mockResolvedValue({ status: 'PROCESSED' });
});

const input = (over: Record<string, unknown> = {}) =>
  ({ source: 'ADMIN', actor: 'admin@example.com', reason: '  Out of stock  ', ...over }) as never;

describe('cancelPodShopOrder', () => {
  it('claims the open order, restocks the units and the pod count, refunds in full and tells the buyer', async () => {
    const out = await cancelPodShopOrder(ID, input());
    const [filter, update] = m(ProductOrderModel.findOneAndUpdate).mock.calls[0];
    expect(filter).toMatchObject({ channel: 'POD_SHOP', cancelled_at: null });
    expect(update.$set).toMatchObject({ cancel_reason: 'Out of stock', cancelled_by: 'ADMIN:admin@example.com' });
    expect(out.fulfilment_status).toBe('CANCELLED');
    expect(out.tracking_events[0]).toMatchObject({ status: 'CANCELLED', note: 'Out of stock' });

    const [stockFilter, stockInc, options] = m(InventoryProductModel.updateOne).mock.calls[0];
    expect(stockFilter).toEqual({ _id: PRODUCT });
    expect(stockInc.$inc).toEqual({ inventory_count: 2, 'variants.$[v].inventory_count': 2 });
    expect(options.arrayFilters[0]['v._id'].equals(VARIANT)).toBe(true);
    expect(m(PodModel.updateOne).mock.calls[0][1]).toEqual({ $inc: { 'product_requests.$.sold_count': -2 } });

    expect(issueRefund).toHaveBeenCalledWith(
      out,
      expect.objectContaining({ paymentId: 'pay1', gross: 500, receipt: 'ORD-1', initiatedBy: 'POD_SHOP_ADMIN_CANCEL' })
    );
    expect(notifyOrderCancelled).toHaveBeenCalledWith(out);
  });

  it('records the deletion request on the order and uses its own refund initiator', async () => {
    const requestId = new Types.ObjectId();
    await cancelPodShopOrder(ID, input({ source: 'DELETION', deletionRequest: { id: requestId, no: 'DEL-9' } }));
    const set = m(ProductOrderModel.findOneAndUpdate).mock.calls[0][1].$set;
    expect(set).toMatchObject({ deletion_request_id: requestId, deletion_request_no: 'DEL-9' });
    expect(m(issueRefund).mock.calls[0][1].initiatedBy).toBe('POD_SHOP_DELETION_CANCEL');
  });

  it('skips lines with no quantity, a variant-less line, and an order with no pod', async () => {
    m(ProductOrderModel.findOneAndUpdate).mockResolvedValue(
      order({
        pod_id: null,
        line_items: [
          { product_id: PRODUCT, variant_id: '', qty: 3 },
          { product_id: PRODUCT, variant_id: '', qty: 0 },
          { product_id: PRODUCT, variant_id: 'not-an-id', qty: 'x' },
        ],
      })
    );
    await cancelPodShopOrder(ID, input());
    expect(InventoryProductModel.updateOne).toHaveBeenCalledTimes(1);
    expect(m(InventoryProductModel.updateOne).mock.calls[0][1].$inc).toEqual({ inventory_count: 3 });
    expect(PodModel.updateOne).not.toHaveBeenCalled();
  });

  it('refuses without a reason, an unknown id, a missing order and a pet-store order', async () => {
    await expect(cancelPodShopOrder(ID, input({ reason: '   ' }))).rejects.toThrow(/reason/i);
    await expect(cancelPodShopOrder('nope', input())).rejects.toThrow(/not found/i);
    m(ProductOrderModel.findById).mockResolvedValue(null);
    await expect(cancelPodShopOrder(ID, input())).rejects.toThrow(/not found/i);
    m(ProductOrderModel.findById).mockResolvedValue(order({ channel: 'PET_STORE' }));
    await expect(cancelPodShopOrder(ID, input())).rejects.toThrow(/E-Commerce portal/);
    expect(ProductOrderModel.findOneAndUpdate).not.toHaveBeenCalled();
    expect(issueRefund).not.toHaveBeenCalled();
  });

  it('stops a brand from cancelling once the courier has the parcel, but lets the team do it', async () => {
    m(ProductOrderModel.findById).mockResolvedValue(order({ fulfilment_status: 'IN_TRANSIT' }));
    await expect(cancelPodShopOrder(ID, input({ source: 'BRAND' }))).rejects.toThrow(/courier already has/);
    expect(ProductOrderModel.findOneAndUpdate).not.toHaveBeenCalled();
    await expect(cancelPodShopOrder(ID, input({ source: 'ADMIN' }))).resolves.toBeDefined();
  });

  it('reports an order that was claimed by someone else first', async () => {
    m(ProductOrderModel.findOneAndUpdate).mockResolvedValue(null);
    await expect(cancelPodShopOrder(ID, input())).rejects.toThrow(/already delivered or cancelled/);
    expect(issueRefund).not.toHaveBeenCalled();
    expect(InventoryProductModel.updateOne).not.toHaveBeenCalled();
  });

  describe('with a ShipRocket shipment', () => {
    const shipped = (status: string) => {
      m(ProductOrderModel.findById).mockResolvedValue(order({ fulfilment_status: status }));
      m(ProductOrderModel.findOneAndUpdate).mockImplementation(async () =>
        order({ fulfilment_status: status, shiprocket: { order_id: 'sr1', awb: 'AWB9' } })
      );
    };

    it('cancels the courier order first', async () => {
      shipped('AWAITING_SHIPMENT');
      await cancelPodShopOrder(ID, input());
      expect(cancelOrders).toHaveBeenCalledWith(['sr1']);
    });

    it('un-claims the order and refuses when the courier cannot stop a parcel not yet picked up', async () => {
      shipped('AWAITING_SHIPMENT');
      m(cancelOrders).mockRejectedValue(new Error('SR down'));
      await expect(cancelPodShopOrder(ID, input())).rejects.toThrow(/left as it is: SR down/);
      expect(m(ProductOrderModel.updateOne).mock.calls[0][1].$set).toMatchObject({ cancelled_at: null, cancelled_by: '' });
      expect(issueRefund).not.toHaveBeenCalled();
      expect(InventoryProductModel.updateOne).not.toHaveBeenCalled();
    });

    it('still cancels and refunds when a parcel already moving cannot be stopped, adding a warning note', async () => {
      shipped('IN_TRANSIT');
      m(cancelOrders).mockRejectedValue(new Error('too late'));
      const out = await cancelPodShopOrder(ID, input());
      expect(out.notes[0]).toMatchObject({ by_name: 'System' });
      expect((out.notes[0] as { text: string }).text).toMatch(/AWB9.*IN_TRANSIT.*return to origin/);
      expect(issueRefund).toHaveBeenCalled();
    });
  });
});

describe('retryOrderRefund', () => {
  it('retries a cancelled order with the initiator it was first cancelled by', async () => {
    const o = order({ cancelled_at: new Date(), refund: { status: 'FAILED', initiated_by: 'POD_SHOP_BRAND_CANCEL' } });
    m(ProductOrderModel.findById).mockResolvedValue(o);
    expect(await retryOrderRefund(ID)).toBe(o);
    expect(m(retryRefund).mock.calls[0][1]).toMatchObject({ initiatedBy: 'POD_SHOP_BRAND_CANCEL', gross: 500 });
  });

  it('falls back to the admin initiator when none was stored', async () => {
    m(ProductOrderModel.findById).mockResolvedValue(order({ cancelled_at: new Date() }));
    await retryOrderRefund(ID);
    expect(m(retryRefund).mock.calls[0][1].initiatedBy).toBe('POD_SHOP_ADMIN_CANCEL');
  });

  it('refuses an order that is not cancelled, unknown, or has a malformed id', async () => {
    await expect(retryOrderRefund(ID)).rejects.toThrow(/Only a cancelled order/);
    m(ProductOrderModel.findById).mockResolvedValue(null);
    await expect(retryOrderRefund(ID)).rejects.toThrow(/not found/i);
    await expect(retryOrderRefund('bad')).rejects.toThrow(/not found/i);
    expect(retryRefund).not.toHaveBeenCalled();
  });
});

describe('helpers', () => {
  it('builds the open-order filter and the refund request', () => {
    expect(openPodShopOrderFilter({ pod_id: 'p' })).toMatchObject({
      channel: 'POD_SHOP',
      cancelled_at: null,
      pod_id: 'p',
      fulfilment_status: { $nin: expect.arrayContaining(['DELIVERED', 'CANCELLED']) },
    });
    expect(refundRequestFor(order() as never, 'why', 'BY')).toEqual({
      paymentId: 'pay1',
      gross: 500,
      receipt: 'ORD-1',
      reason: 'why',
      initiatedBy: 'BY',
    });
  });
});
