import { Types } from 'mongoose';
import { productOrderService } from '../../productOrder.service';
import { ProductOrderModel } from '../../productOrder.model';
import { PaymentModel } from '@modules/finance/payment/payment.model';
import { BrandPickupLocationModel } from '@modules/venues/brandPickupLocation/brandPickupLocation.model';
import { StoreProductModel } from '@modules/commerce/store/storeProduct.model';

/**
 * A pet-store payment's orders come from the store's OWN catalogue: the lines,
 * the parcel, the warehouse and the stock are StoreProduct's, and the store's
 * brands are never recorded as a partner brand's sale.
 */

async function seedStoreProduct() {
  const warehouse = await BrandPickupLocationModel.create({ owner_kind: 'DUNCIT', nickname: 'Home', pincode: '201017' });
  const product = await StoreProductModel.create({
    product_name: 'Drools Adult Chicken',
    sku: 'DRL-ADULT',
    brand_id: new Types.ObjectId(),
    brand_name: 'Drools',
    images: ['https://ik.imagekit.io/duncit/store/drools.jpg'],
    unit_cost: 849,
    inventory_count: 14,
    pickup_location_id: warehouse._id,
    weight_kg: 3.2,
    length_cm: 40,
    breadth_cm: 28,
    height_cm: 10,
    variant_option: 'Size',
    variants: [
      { option_label: '3 kg', sku: 'DRL-3', unit_cost: 849, inventory_count: 10, weight_kg: 3.2 },
      { option_label: '10 kg', sku: 'DRL-10', unit_cost: 2499, inventory_count: 4, weight_kg: 10.4 },
    ],
    status: 'PUBLISHED',
  });
  return { product, variant: product.variants[0] };
}

function storePayment(productId: unknown, variantId: unknown, quantity: number) {
  return PaymentModel.create({
    payment_id: `pay-store-${new Types.ObjectId().toHexString()}`,
    user_id: null,
    user_name: 'Asha Verma',
    user_email: 'asha@example.com',
    user_phone: '+91 9811000000',
    subtotal: 849 * quantity,
    total: 849 * quantity,
    currency_symbol: '₹',
    target_type: 'PRODUCT',
    metadata: {
      fulfilment_method: 'SHIP',
      shipping_address: { name: 'Asha Verma', line1: 'B-619 Windsor Paradise 2', city: 'Ghaziabad', state: 'UP', pincode: '201017' },
      product_lines: [
        {
          product_id: String(productId),
          variant_id: String(variantId),
          variant_label: '3 kg',
          name: 'Drools Adult Chicken',
          quantity,
          unit_cost: 849,
          gross: 849 * quantity,
          fulfilment_method: 'SHIP',
        },
      ],
      store: { payment_method: 'PREPAID', discount_total: 0, access_key: 'guest-access-key' },
    },
  });
}

describe('productOrderService.createFromPayment — a pet-store payment', () => {
  it('builds the order from StoreProduct, ships from its warehouse and records no partner brand', async () => {
    const { product, variant } = await seedStoreProduct();
    const payment = await storePayment(product._id, variant._id, 2);

    const [order] = await productOrderService.createFromPayment(payment);

    expect(order.channel).toBe('PET_STORE');
    expect(order.fulfilment_method).toBe('SHIP');
    expect(order.pickup_location_id).toBe('Home');
    const saved = await ProductOrderModel.findById(order.id).lean();
    const line = saved!.line_items[0];
    expect(line).toMatchObject({ sku: 'DRL-3', variant_label: '3 kg', ownership: 'DUNCIT', weight_kg: 3.2, length_cm: 40 });
    expect(line.brand_id).toBeNull();
    expect(line.image_url).toBe('https://ik.imagekit.io/duncit/store/drools.jpg');
  });

  it('takes the units off the store product and its variant, and counts them as sold, exactly once', async () => {
    const { product, variant } = await seedStoreProduct();
    const payment = await storePayment(product._id, variant._id, 3);

    await productOrderService.createFromPayment(payment);
    await productOrderService.createFromPayment(payment);

    const after = await StoreProductModel.findById(product._id).lean();
    expect(after?.inventory_count).toBe(11);
    expect(after?.variants.find((v) => String(v._id) === String(variant._id))?.inventory_count).toBe(7);
    expect(after?.store.sold_count).toBe(3);
  });
});
