import { describe, expect, it } from 'vitest';

import {
  DELIVERY_ADDRESS_STORAGE_KEY,
  deliveryAddressLine,
  pickDeliveryAddress,
} from '../src/delivery-address';

const home = {
  id: 'a-home',
  line1: '12 MG Road',
  city: 'Pune',
  pincode: '411001',
  is_default: false,
};
const office = {
  id: 'a-office',
  line1: '4 Baner Rd',
  city: 'Pune',
  pincode: '411045',
  is_default: true,
};
const parents = { id: 'a-parents', line1: '9 Civil Lines', city: 'Delhi', pincode: '110054' };

describe('pickDeliveryAddress', () => {
  it('keeps the address the buyer picked while it is still in the book', () => {
    expect(pickDeliveryAddress([home, office, parents], 'a-parents')).toBe(parents);
  });

  it('falls back to the default when the picked id is gone from the book', () => {
    expect(pickDeliveryAddress([home, office], 'a-deleted')).toBe(office);
  });

  it('uses the default when nothing was picked yet', () => {
    expect(pickDeliveryAddress([home, office], null)).toBe(office);
    expect(pickDeliveryAddress([home, office])).toBe(office);
    expect(pickDeliveryAddress([home, office], '')).toBe(office);
  });

  it('takes the first address when the book has no default', () => {
    expect(pickDeliveryAddress([home, parents], undefined)).toBe(home);
  });

  it('returns null for an empty book, whatever was picked before', () => {
    expect(pickDeliveryAddress([], 'a-home')).toBeNull();
  });
});

describe('deliveryAddressLine', () => {
  it('names the street, city and pincode on one line', () => {
    expect(deliveryAddressLine(home)).toBe('12 MG Road, Pune 411001');
  });

  it('drops blank or missing parts instead of printing stray commas', () => {
    expect(deliveryAddressLine({ id: 'x', line1: '  ', city: 'Pune', pincode: null })).toBe('Pune');
    expect(
      deliveryAddressLine({ id: 'x', line1: '7 FC Road', city: ' ', pincode: undefined }),
    ).toBe('7 FC Road');
    expect(deliveryAddressLine({ id: 'x' })).toBe('');
  });
});

describe('DELIVERY_ADDRESS_STORAGE_KEY', () => {
  it('is the one key both apps store the pick under', () => {
    expect(DELIVERY_ADDRESS_STORAGE_KEY).toBe('duncit.delivery_address_id');
  });
});
