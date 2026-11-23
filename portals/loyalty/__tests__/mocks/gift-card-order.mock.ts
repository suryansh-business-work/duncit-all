import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import {
  ADJUST_GIFT_CARD_DESIGN_STOCK,
  CREATE_GIFT_CARD_DESIGN,
  GIFT_CARD_DESIGN,
  GIFT_CARD_DESIGN_CATEGORIES,
  SET_DEFAULT_GIFT_CARD_DESIGN,
  UPDATE_GIFT_CARD_DESIGN,
  type GiftCardDesignInput,
  type GiftCardDesignRow,
} from '../../src/pages/gift-cards/designs/queries';
import {
  BOOK_GIFT_CARD_ORDER_SHIPMENT,
  GIFT_CARD_ORDER_ADMIN,
  GIFT_CARD_ORDER_LABEL_FILE,
  GIFT_CARD_ORDER_STATS,
  GIFT_ORDER_CURRENCY,
  MARK_GIFT_CARD_ORDER_PRINTED,
  REFRESH_GIFT_CARD_ORDER_TRACKING,
  UPDATE_GIFT_CARD_ORDER_ADDRESS,
  type GiftCardAdminOrder,
  type GiftCardOrderHistoryEntry,
  type GiftCardOrderStats,
} from '../../src/pages/gift-cards/orders/queries';
import {
  GIFT_CARD_DELIVERY_SETTINGS,
  UPDATE_GIFT_CARD_DELIVERY_SETTINGS,
  type GiftCardDeliverySettings,
} from '../../src/pages/gift-cards/settings/queries';

/** Gift card catalogue, order book and delivery settings mocks for the Loyalty console. */

export const FRONT = 'https://ik.imagekit.io/duncit/front.png';
export const BACK = 'https://ik.imagekit.io/duncit/back.png';

export const makeDesign = (over: Partial<GiftCardDesignRow> = {}) => ({
  __typename: 'GiftCardDesign' as const,
  id: 'des-1',
  name: 'Classic',
  category: 'Evergreen',
  front_image_url: FRONT,
  back_image_url: BACK,
  is_default: true,
  is_active: true,
  physical_stock: 40,
  sort_order: 0,
  created_at: '2026-11-01T10:00:00.000Z',
  updated_at: '2026-11-02T10:00:00.000Z',
  ...over,
});

const gqlError = (message: string) => ({ errors: [new GraphQLError(message)] });

export const designMock = (design = makeDesign()): MockedResponse => ({
  request: { query: GIFT_CARD_DESIGN, variables: { id: design.id } },
  result: { data: { giftCardDesign: design } },
  maxUsageCount: 10,
});

export const designMissingMock = (id: string): MockedResponse => ({
  request: { query: GIFT_CARD_DESIGN, variables: { id } },
  result: { errors: [new GraphQLError('Gift card design not found', { extensions: { code: 'NOT_FOUND' } })] },
});

export const designCategoriesMock = (categories = ['Evergreen', 'Festive']): MockedResponse => ({
  request: { query: GIFT_CARD_DESIGN_CATEGORIES },
  result: { data: { giftCardDesignCategories: categories } },
  maxUsageCount: 10,
});

export const createDesignMock = (input: GiftCardDesignInput, created = makeDesign({ id: 'des-new', is_default: false })): MockedResponse => ({
  request: { query: CREATE_GIFT_CARD_DESIGN, variables: { input } },
  result: { data: { createGiftCardDesign: created } },
});

export const createDesignErrorMock = (input: GiftCardDesignInput, message: string): MockedResponse => ({
  request: { query: CREATE_GIFT_CARD_DESIGN, variables: { input } },
  result: gqlError(message),
});

export const updateDesignMock = (id: string, input: GiftCardDesignInput, design = makeDesign({ id, ...input })): MockedResponse => ({
  request: { query: UPDATE_GIFT_CARD_DESIGN, variables: { id, input } },
  result: { data: { updateGiftCardDesign: design } },
});

export const updateDesignErrorMock = (id: string, input: GiftCardDesignInput, message: string): MockedResponse => ({
  request: { query: UPDATE_GIFT_CARD_DESIGN, variables: { id, input } },
  result: gqlError(message),
});

export const setDefaultMock = (id: string): MockedResponse => ({
  request: { query: SET_DEFAULT_GIFT_CARD_DESIGN, variables: { id } },
  result: { data: { setDefaultGiftCardDesign: makeDesign({ id, is_default: true }) } },
});

export const adjustStockMock = (id: string, delta: number, reason: string, stock: number): MockedResponse => ({
  request: { query: ADJUST_GIFT_CARD_DESIGN_STOCK, variables: { id, delta, reason } },
  result: { data: { adjustGiftCardDesignStock: makeDesign({ id, physical_stock: stock }) } },
});

export const adjustStockErrorMock = (id: string, delta: number, reason: string, message: string): MockedResponse => ({
  request: { query: ADJUST_GIFT_CARD_DESIGN_STOCK, variables: { id, delta, reason } },
  result: gqlError(message),
});

/* ------------------------------------------------------------------ orders */

const ADDRESS = {
  __typename: 'GiftCardOrderAddress' as const,
  name: 'Priya Nair',
  phone: '9876543210',
  line1: '12 MG Road',
  line2: 'Indiranagar',
  landmark: '',
  city: 'Bengaluru',
  state: 'Karnataka',
  pincode: '560038',
  country: 'India',
};

export const makeOrder = (over: Partial<GiftCardAdminOrder> = {}) => ({
  __typename: 'GiftCardAdminOrder' as const,
  id: 'ord-1',
  order_no: 'GC-ABCDEFGH23',
  delivery_mode: 'PHYSICAL' as const,
  design_name: 'Classic',
  design_front_url: FRONT,
  design_back_url: BACK,
  amount: 500,
  quantity: 2,
  cards_value: 1000,
  shipping_fee: 99,
  total: 1099,
  currency_symbol: '₹',
  recipient_name: 'Priya',
  recipient_email: '',
  message: 'Happy birthday!',
  shipping_address: ADDRESS,
  payment_status: 'PAID' as const,
  fulfilment_status: 'PROCESSING' as const,
  cards_issued: 2,
  paid_at: '2026-11-20T10:00:00.000Z',
  emailed_at: null,
  printed_at: null,
  delivered_at: null,
  created_at: '2026-11-20T09:55:00.000Z',
  shipment: null,
  tracking_events: [],
  buyer_name: 'Aarav Shah',
  buyer_email: 'aarav@x.com',
  buyer_phone: '9876500000',
  payment_id: 'pay_gc_1',
  payment_doc_id: 'pdoc-1',
  physical_batch_id: 'batch-1',
  gift_card_ids: [],
  stock_short: false,
  last_error: '',
  shipment_alert: '',
  shipment_alert_message: '',
  shipment_sandbox: false,
  label_available: false,
  ...over,
});

export const makeShipment = (over: Record<string, unknown> = {}) => ({
  __typename: 'GiftCardOrderShipment' as const,
  courier_name: 'Delhivery',
  awb: 'AWB123',
  tracking_status: 'IN TRANSIT',
  etd: '2026-11-25',
  pickup_scheduled_date: '2026-11-22',
  last_synced_at: '2026-11-23T08:00:00.000Z',
  ...over,
});

export const makeEvent = (status: string, at: string, note = '') => ({
  __typename: 'GiftCardOrderTrackingEvent' as const,
  status,
  location: 'Bengaluru',
  note,
  at,
});

export const makeHistory = (over: Partial<GiftCardOrderHistoryEntry> = {}) => ({
  __typename: 'GiftCardOrderHistoryEntry' as const,
  id: 'h-1',
  action: 'ORDER_PAID',
  note: 'pay_gc_1',
  actor_name: '',
  created_at: '2026-11-20T10:00:00.000Z',
  ...over,
});

export const orderAdminMock = (order = makeOrder(), history = [makeHistory()]): MockedResponse => ({
  request: { query: GIFT_CARD_ORDER_ADMIN, variables: { id: order.id } },
  result: { data: { giftCardOrderAdmin: { __typename: 'GiftCardAdminOrderDetail', order, history } } },
  maxUsageCount: 10,
});

export const makeOrderStats = (over: Partial<GiftCardOrderStats> = {}) => ({
  __typename: 'GiftCardOrderStats' as const,
  paid_orders: 12,
  paid_value: 25400,
  pending_payment: 3,
  to_print: 2,
  to_ship: 1,
  in_transit: 4,
  delivered: 5,
  returned_or_lost: 0,
  needs_attention: 1,
  ...over,
});

export const orderStatsMock = (stats = makeOrderStats()): MockedResponse => ({
  request: { query: GIFT_CARD_ORDER_STATS },
  result: { data: { giftCardOrderStats: stats } },
  maxUsageCount: 10,
});

export const orderCurrencyMock = (): MockedResponse => ({
  request: { query: GIFT_ORDER_CURRENCY },
  result: { data: { publicFinanceSettings: { __typename: 'PublicFinanceSettings', currency_symbol: '₹' } } },
  maxUsageCount: 10,
});

type OrderMutation = typeof MARK_GIFT_CARD_ORDER_PRINTED;
const orderMutationMock = (query: OrderMutation, field: string, id: string, order: ReturnType<typeof makeOrder>): MockedResponse => ({
  request: { query, variables: { id } },
  result: { data: { [field]: order } },
});
const orderMutationErrorMock = (query: OrderMutation, id: string, message: string): MockedResponse => ({
  request: { query, variables: { id } },
  result: gqlError(message),
});

export const markPrintedMock = (order = makeOrder({ fulfilment_status: 'PRINTED' })) =>
  orderMutationMock(MARK_GIFT_CARD_ORDER_PRINTED, 'markGiftCardOrderPrinted', order.id, order);
export const markPrintedErrorMock = (id: string, message: string) => orderMutationErrorMock(MARK_GIFT_CARD_ORDER_PRINTED, id, message);
export const bookMock = (order = makeOrder({ fulfilment_status: 'PICKUP_SCHEDULED' })) =>
  orderMutationMock(BOOK_GIFT_CARD_ORDER_SHIPMENT, 'bookGiftCardOrderShipment', order.id, order);
export const refreshMock = (order = makeOrder()) =>
  orderMutationMock(REFRESH_GIFT_CARD_ORDER_TRACKING, 'refreshGiftCardOrderTracking', order.id, order);

export const labelMock = (id: string, base64: string | null): MockedResponse => ({
  request: { query: GIFT_CARD_ORDER_LABEL_FILE, variables: { id } },
  result: { data: { giftCardOrderLabelFile: base64 } },
});
export const labelErrorMock = (id: string, message: string): MockedResponse => ({
  request: { query: GIFT_CARD_ORDER_LABEL_FILE, variables: { id } },
  result: gqlError(message),
});

export const updateAddressMock = (id: string, input: Record<string, string>, order = makeOrder()): MockedResponse => ({
  request: { query: UPDATE_GIFT_CARD_ORDER_ADDRESS, variables: { id, input } },
  result: { data: { updateGiftCardOrderAddress: order } },
});
export const updateAddressErrorMock = (id: string, input: Record<string, string>, message: string): MockedResponse => ({
  request: { query: UPDATE_GIFT_CARD_ORDER_ADDRESS, variables: { id, input } },
  result: gqlError(message),
});

/* --------------------------------------------------------------- settings */

export const makeDeliverySettings = (over: Partial<GiftCardDeliverySettings> = {}): GiftCardDeliverySettings => ({
  max_quantity: 10,
  physical_enabled: true,
  shipping_fee: 99,
  pickup_location: 'Duncit HQ',
  parcel_weight_kg: 0.1,
  parcel_length_cm: 22,
  parcel_breadth_cm: 16,
  parcel_height_cm: 2,
  ...over,
});

export const deliverySettingsMock = (s = makeDeliverySettings()): MockedResponse => ({
  request: { query: GIFT_CARD_DELIVERY_SETTINGS },
  result: {
    data: {
      publicGiftCardSettings: {
        __typename: 'GiftCardSettings',
        max_quantity: s.max_quantity,
        physical_enabled: s.physical_enabled,
        shipping_fee: s.shipping_fee,
      },
      giftCardShippingSettings: {
        __typename: 'GiftCardShippingSettings',
        pickup_location: s.pickup_location,
        parcel_weight_kg: s.parcel_weight_kg,
        parcel_length_cm: s.parcel_length_cm,
        parcel_breadth_cm: s.parcel_breadth_cm,
        parcel_height_cm: s.parcel_height_cm,
      },
    },
  },
  maxUsageCount: 10,
});

export const deliverySettingsErrorMock = (): MockedResponse => ({
  request: { query: GIFT_CARD_DELIVERY_SETTINGS },
  error: new Error('settings unavailable'),
});

export const updateDeliveryMock = (input: GiftCardDeliverySettings): MockedResponse => ({
  request: { query: UPDATE_GIFT_CARD_DELIVERY_SETTINGS, variables: { input } },
  result: {
    data: {
      updateGiftCardSettings: {
        __typename: 'GiftCardSettings',
        max_quantity: input.max_quantity,
        physical_enabled: input.physical_enabled,
        shipping_fee: input.shipping_fee,
      },
    },
  },
});

export const updateDeliveryErrorMock = (input: GiftCardDeliverySettings, message: string): MockedResponse => ({
  request: { query: UPDATE_GIFT_CARD_DELIVERY_SETTINGS, variables: { input } },
  result: gqlError(message),
});
