import { GiftCardSettingsModel } from '../../giftcard.model';
import { giftCardSettingsService, MAX_ORDER_QUANTITY } from '../../giftcard.settings.service';

/**
 * The gift card sales policy the Loyalty team sets: amount bounds that can never
 * cross, a delivery fee that physical cards can never ship without, and courier
 * parcel sizes kept within what ShipRocket accepts.
 */

describe('giftCardSettingsService defaults', () => {
  it('starts with physical delivery off, ten cards an order and no fee', async () => {
    expect(await giftCardSettingsService.pub()).toMatchObject({
      min_amount: 100,
      max_amount: 10000,
      max_quantity: 10,
      physical_enabled: false,
      shipping_fee: 0,
      denominations: [500, 1000, 2000, 5000],
    });
    expect(await giftCardSettingsService.shipping()).toEqual({
      pickup_location: '',
      parcel_weight_kg: 0.1,
      parcel_length_cm: 22,
      parcel_breadth_cm: 16,
      parcel_height_cm: 2,
    });
  });
});

describe('giftCardSettingsService.update — amounts', () => {
  it('refuses a minimum above the maximum instead of quietly changing it', async () => {
    await expect(giftCardSettingsService.update({ min_amount: 5000, max_amount: 1000 })).rejects.toMatchObject({
      message: 'The maximum amount must be at least the minimum amount',
      extensions: { code: 'BAD_USER_INPUT', field: 'max_amount' },
    });
    expect(await GiftCardSettingsModel.findOne().lean()).toMatchObject({ min_amount: 100, max_amount: 10000 });
  });

  it('accepts equal bounds and only offers the chips inside them', async () => {
    const out = await giftCardSettingsService.update({ min_amount: 1000, max_amount: 2000 });
    expect(out).toMatchObject({ min_amount: 1000, max_amount: 2000, denominations: [1000, 2000] });
    expect((await giftCardSettingsService.update({ min_amount: 1500, max_amount: 1500 })).max_amount).toBe(1500);
  });

  it(`caps the order quantity at ${MAX_ORDER_QUANTITY}`, async () => {
    expect((await giftCardSettingsService.update({ max_quantity: 500 })).max_quantity).toBe(MAX_ORDER_QUANTITY);
    expect((await giftCardSettingsService.update({ max_quantity: 4 })).max_quantity).toBe(4);
  });
});

describe('giftCardSettingsService.update — delivery', () => {
  it('will not switch physical cards on without a delivery fee', async () => {
    await expect(giftCardSettingsService.update({ physical_enabled: true })).rejects.toMatchObject({
      extensions: { field: 'shipping_fee' },
    });
    await expect(giftCardSettingsService.update({ physical_enabled: true, shipping_fee: 0 })).rejects.toThrow(
      'Set a delivery fee before switching on physical gift cards'
    );
  });

  it('switches physical cards on with a fee, and keeps the fee from being removed while on', async () => {
    expect(await giftCardSettingsService.update({ physical_enabled: true, shipping_fee: 79.5 })).toMatchObject({
      physical_enabled: true,
      shipping_fee: 79.5,
    });
    await expect(giftCardSettingsService.update({ shipping_fee: 0 })).rejects.toThrow('Set a delivery fee');
  });

  it('refuses a negative fee', async () => {
    await expect(giftCardSettingsService.update({ shipping_fee: -1 })).rejects.toThrow('Enter a valid delivery fee');
  });

  it('keeps parcel sizes inside the courier bounds and ignores the ones outside', async () => {
    await giftCardSettingsService.update({
      pickup_location: '  Duncit Warehouse ',
      parcel_weight_kg: 0.25,
      parcel_length_cm: 500,
      parcel_height_cm: 3,
    });
    expect(await giftCardSettingsService.shipping()).toEqual({
      pickup_location: 'Duncit Warehouse',
      parcel_weight_kg: 0.25,
      parcel_length_cm: 22,
      parcel_breadth_cm: 16,
      parcel_height_cm: 3,
    });
  });
});
