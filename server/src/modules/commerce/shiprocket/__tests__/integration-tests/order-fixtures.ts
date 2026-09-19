import { Types } from 'mongoose';
import type { GraphQLContext } from '@context';
import { StoreProductModel, type IStoreProduct } from '@modules/commerce/store/storeProduct.model';
import { BrandPickupLocationModel } from '@modules/venues/brandPickupLocation/brandPickupLocation.model';
import { PaymentModel } from '@modules/finance/payment/payment.model';
import { ProductOrderModel } from '@modules/commerce/productOrder/productOrder.model';
import { WAREHOUSE } from './fake-shiprocket';

/**
 * Pet-store data shaped the way checkout writes it: a packed product that
 * ships from the Noida warehouse, the payment, and a SHIP order for a buyer in
 * Gurugram. Numbers are real store numbers (₹349 jerky, ₹49 delivery).
 */
let seq = 0;
const next = () => {
  seq += 1;
  return `${Date.now().toString(36).toUpperCase()}${seq}`;
};

export const SHIPPING_FEE = 49;

export const BUYER = { name: 'Asha Rani Verma', email: 'asha.rani@example.com', phone: '9876543210' };

export const GURUGRAM = {
  name: BUYER.name,
  phone: BUYER.phone,
  email: BUYER.email,
  line1: 'Flat 402, Tower C, DLF Park Place',
  line2: 'Sector 54',
  landmark: 'Opp. Golf Course Road',
  city: 'Gurugram',
  state: 'Haryana',
  pincode: '122002',
  country: 'India',
};

/** An operator signed in to the ecomm portal. */
export const opsCtx = {
  user: { id: new Types.ObjectId().toHexString(), email: 'ops@duncit.com', roles: ['ECOMM_MANAGER'] },
} as unknown as GraphQLContext;

export const seedWarehouse = () =>
  BrandPickupLocationModel.create({
    owner_kind: 'DUNCIT',
    nickname: WAREHOUSE,
    contact_name: 'Duncit Warehouse Noida',
    phone: '+91 98110 22334',
    email: 'warehouse@duncit.com',
    address_line1: 'B-14, Sector 63',
    city: 'Noida',
    state: 'Uttar Pradesh',
    pincode: '201301',
  });

export const seedProduct = (over: Record<string, unknown> = {}) =>
  StoreProductModel.create({
    product_name: 'Drools Chicken Jerky 200g',
    sku: `DRL-JRK-${next()}`,
    unit_cost: 349,
    inventory_count: 40,
    // A pet-store product: its own catalogue, published, shipped by ShipRocket.
    // A published product always has its own URL key — the index is unique on it.
    status: 'PUBLISHED',
    store: { slug: `drools-chicken-jerky-${next()}` },
    hsn_code: '2309',
    weight_kg: 0.25,
    length_cm: 20,
    breadth_cm: 14,
    height_cm: 5,
    ...over,
  });

export interface PaidOrderSeed {
  product: IStoreProduct;
  qty?: number;
  cod?: boolean;
  over?: Record<string, unknown>;
}

/** A paid (or cash-on-delivery) pet-store SHIP order waiting for its shipment. */
export async function seedPaidOrder({ product, qty = 2, cod = false, over = {} }: PaidOrderSeed) {
  const itemsTotal = product.unit_cost * qty;
  const total = itemsTotal + SHIPPING_FEE;
  const payment = await PaymentModel.create({
    payment_id: `pay_${next().toLowerCase()}`,
    user_name: BUYER.name,
    user_email: BUYER.email,
    user_phone: BUYER.phone,
    target_type: 'PRODUCT',
    subtotal: total,
    total,
    // A COD payment stays PENDING until the courier hands over the cash.
    status: cod ? 'PENDING' : 'SUCCESS',
  });
  const order = await ProductOrderModel.create({
    order_no: `DUN-ORD-${next()}`,
    buyer_name: BUYER.name,
    buyer_email: BUYER.email,
    buyer_phone: BUYER.phone,
    payment_id: payment._id,
    payment_ref: payment.payment_id,
    channel: 'PET_STORE',
    fulfilment_method: 'SHIP',
    fulfilment_status: 'AWAITING_SHIPMENT',
    pickup_location_id: WAREHOUSE,
    payment_method: cod ? 'COD' : 'PREPAID',
    cod_amount: cod ? total : 0,
    items_total: itemsTotal,
    shipping_charge: SHIPPING_FEE,
    total,
    shipping_address: GURUGRAM,
    line_items: [
      {
        product_id: product._id,
        name: product.product_name,
        sku: product.sku,
        qty,
        unit_cost: product.unit_cost,
        gross: itemsTotal,
        weight_kg: product.weight_kg,
        length_cm: product.length_cm,
        breadth_cm: product.breadth_cm,
        height_cm: product.height_cm,
      },
    ],
    ...over,
  });
  return { payment, order };
}

/** The order as the database has it now. */
export const reloadOrder = (id: unknown) => ProductOrderModel.findById(id).orFail();

export const stockOf = async (id: unknown) => (await StoreProductModel.findById(id).orFail()).inventory_count;
