import type { MockedResponse } from '@apollo/client/testing';
import type {
  OrderLineItem,
  OrderShippingAddress,
  OrderTrackingEvent,
  Pod,
  ProductOrder,
  ShipRocketInfo,
} from '@duncit/gql-types';
import {
  ADVANCE_PRODUCT_ORDER_STATUS,
  CREATE_PRODUCT_ORDER_SHIPMENT,
  PRODUCT_ORDER,
  PRODUCT_ORDERS,
  REFRESH_PRODUCT_ORDER_TRACKING,
  SET_PRODUCT_ORDER_FULFILMENT_METHOD,
  type ProductOrderRow,
} from '../../src/pages/orders/queries';

/**
 * Order mocks. The `ProductOrder` detail query selects only a 3-field `pod`
 * projection (the full `Pod` type has ~50 fields), so nested refs are modelled
 * as `Pick<…>` projections bound to the generated schema — a renamed/removed
 * field still breaks typecheck, without fabricating 50 irrelevant fields.
 */
export type PodRefMock = Pick<Pod, 'id' | 'pod_title' | 'pod_date_time'> & { __typename?: 'Pod' };
export type OrderLineItemMock = Pick<
  OrderLineItem,
  'product_id' | 'name' | 'sku' | 'image_url' | 'qty' | 'unit_cost' | 'gross' | 'ownership' | 'brand_id'
> & { __typename?: 'OrderLineItem' };
export type ShipRocketInfoMock = Pick<
  ShipRocketInfo,
  'order_id' | 'shipment_id' | 'awb' | 'courier_name' | 'tracking_status' | 'label_url' | 'last_synced_at'
> & { __typename?: 'ShipRocketInfo' };
export type OrderTrackingEventMock = Pick<
  OrderTrackingEvent,
  'status' | 'location' | 'note' | 'at'
> & { __typename?: 'OrderTrackingEvent' };
export type OrderShippingAddressMock = Pick<
  OrderShippingAddress,
  'name' | 'phone' | 'line1' | 'line2' | 'city' | 'state' | 'pincode' | 'country'
> & { __typename?: 'OrderShippingAddress' };

export type ProductOrderMock = Pick<
  ProductOrder,
  | 'id'
  | 'order_no'
  | 'buyer_name'
  | 'buyer_email'
  | 'buyer_phone'
  | 'pod_id'
  | 'payment_ref'
  | 'currency_symbol'
  | 'items_total'
  | 'shipping_charge'
  | 'total'
  | 'fulfilment_method'
  | 'fulfilment_status'
  | 'pickup_ref'
  | 'pickup_location_id'
  | 'last_error'
  | 'created_at'
> & {
  __typename?: 'ProductOrder';
  pod: PodRefMock | null;
  line_items: OrderLineItemMock[];
  shipping_address: OrderShippingAddressMock | null;
  shiprocket: ShipRocketInfoMock | null;
  tracking_events: OrderTrackingEventMock[];
};

export const makeOrderLineItem = (over: Partial<OrderLineItemMock> = {}): OrderLineItemMock => ({
  __typename: 'OrderLineItem',
  product_id: 'i1',
  name: 'Cold Brew',
  sku: 'CB-1',
  image_url: '',
  qty: 1,
  unit_cost: 120,
  gross: 120,
  ownership: 'DUNCIT',
  brand_id: null,
  ...over,
});

export const makeProductOrder = (over: Partial<ProductOrderMock> = {}): ProductOrderMock => ({
  __typename: 'ProductOrder',
  id: 'o1',
  order_no: 'PO-1',
  buyer_name: 'Asha',
  buyer_email: 'asha@x.com',
  buyer_phone: '9999',
  pod_id: 'p',
  pod: { __typename: 'Pod', id: 'p', pod_title: 'Sunset Pod', pod_date_time: '2026-01-01' },
  payment_ref: 'pay_1',
  line_items: [makeOrderLineItem()],
  currency_symbol: '₹',
  items_total: 500,
  shipping_charge: 0,
  total: 500,
  fulfilment_method: 'SHIP',
  fulfilment_status: 'OUT_FOR_DELIVERY',
  shipping_address: {
    __typename: 'OrderShippingAddress',
    name: 'Asha',
    phone: '9999',
    line1: '12 MG Rd',
    line2: '',
    city: 'Pune',
    state: 'MH',
    pincode: '411001',
    country: 'India',
  },
  pickup_ref: '',
  pickup_location_id: '',
  shiprocket: {
    __typename: 'ShipRocketInfo',
    order_id: '',
    shipment_id: '',
    awb: 'AWB9',
    courier_name: 'BlueDart',
    tracking_status: '',
    label_url: '',
    last_synced_at: null,
  },
  tracking_events: [],
  last_error: '',
  created_at: '2026-01-01T00:00:00.000Z',
  ...over,
});

/** Table row for the product-orders table (nullable projection). */
export const makeProductOrderRow = (over: Partial<ProductOrderRow> = {}): ProductOrderRow => {
  const o = makeProductOrder();
  return {
    id: o.id,
    order_no: o.order_no,
    buyer_name: o.buyer_name,
    buyer_email: o.buyer_email,
    pod: o.pod ? { id: o.pod.id, pod_title: o.pod.pod_title } : null,
    currency_symbol: o.currency_symbol,
    total: o.total,
    fulfilment_method: o.fulfilment_method,
    fulfilment_status: o.fulfilment_status,
    shiprocket: o.shiprocket ? { awb: o.shiprocket.awb } : null,
    created_at: o.created_at,
    ...over,
  };
};

/* ---- Query + mutation builders ---- */

export const productOrderMock = (
  order: ProductOrderMock | null = makeProductOrder(),
  id = 'o1',
): MockedResponse => ({
  request: { query: PRODUCT_ORDER, variables: { id } },
  result: { data: { productOrder: order } },
  maxUsageCount: 20,
});

export const productOrdersListMock = (
  orders: ProductOrderMock[] = [],
): MockedResponse => ({
  request: { query: PRODUCT_ORDERS },
  variableMatcher: () => true,
  result: { data: { productOrders: orders } },
  maxUsageCount: 20,
});

const orderMutationResult = (key: string, fail: boolean) =>
  fail
    ? { errors: [{ message: 'action failed' }] }
    : { data: { [key]: makeProductOrder() } };

export const setFulfilmentMethodMock = (over: { fail?: boolean } = {}): MockedResponse => ({
  request: { query: SET_PRODUCT_ORDER_FULFILMENT_METHOD },
  variableMatcher: () => true,
  result: orderMutationResult('setProductOrderFulfilmentMethod', over.fail ?? false),
  maxUsageCount: 20,
});

export const advanceStatusMock = (over: { fail?: boolean } = {}): MockedResponse => ({
  request: { query: ADVANCE_PRODUCT_ORDER_STATUS },
  variableMatcher: () => true,
  result: orderMutationResult('advanceProductOrderStatus', over.fail ?? false),
  maxUsageCount: 20,
});

export const refreshTrackingMock = (over: { fail?: boolean } = {}): MockedResponse => ({
  request: { query: REFRESH_PRODUCT_ORDER_TRACKING },
  variableMatcher: () => true,
  result: orderMutationResult('refreshProductOrderTracking', over.fail ?? false),
  maxUsageCount: 20,
});

export const createShipmentMock = (over: { fail?: boolean } = {}): MockedResponse => ({
  request: { query: CREATE_PRODUCT_ORDER_SHIPMENT },
  variableMatcher: () => true,
  result: orderMutationResult('createProductOrderShipment', over.fail ?? false),
  maxUsageCount: 20,
});
