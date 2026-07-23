import { describe, expect, it } from 'vitest';
import { ApolloClient, InMemoryCache } from '@apollo/client';
import { MockLink } from '@apollo/client/testing';
import { warehouseSchema } from './warehouse.form';
import { emptyWarehouseValues, toSaveWarehouseVariables, warehouseToValues } from './warehouse.types';
import { SAVE_MY_WAREHOUSE, type BrandWarehouse } from '../warehouse.queries';

const validWarehouse = {
  nickname: 'Delhi warehouse',
  contact_name: 'Asha Verma',
  phone: '9876543210',
  email: 'asha@brand.example.com',
  address_line1: '12 Industrial Area, Phase 2',
  address_line2: '',
  city: 'New Delhi',
  state: 'Delhi',
  pincode: '110020',
  country: 'India',
  is_default: true,
};

const messages = (result: ReturnType<typeof warehouseSchema.safeParse>) =>
  result.success ? '' : result.error.issues.map((issue) => issue.message).join(' ');

describe('warehouseSchema', () => {
  it('accepts a complete warehouse', () => {
    expect(warehouseSchema.safeParse(validWarehouse).success).toBe(true);
  });

  it('requires a nickname of at least 2 characters', () => {
    const result = warehouseSchema.safeParse({ ...validWarehouse, nickname: 'A' });
    expect(messages(result)).toMatch(/warehouse name/i);
  });

  it('requires a digits-only phone number', () => {
    const result = warehouseSchema.safeParse({ ...validWarehouse, phone: '98-76' });
    expect(messages(result)).toMatch(/phone/i);
  });

  it('requires a valid email', () => {
    const result = warehouseSchema.safeParse({ ...validWarehouse, email: 'not-an-email' });
    expect(messages(result)).toMatch(/valid email/i);
  });

  it('requires address line 1, city and state', () => {
    const result = warehouseSchema.safeParse({ ...validWarehouse, address_line1: '', city: '', state: '' });
    expect(messages(result)).toMatch(/address line 1/i);
    expect(messages(result)).toMatch(/city/i);
    expect(messages(result)).toMatch(/state/i);
  });

  it('requires a 6-digit pincode', () => {
    const short = warehouseSchema.safeParse({ ...validWarehouse, pincode: '1100' });
    expect(messages(short)).toMatch(/6-digit pincode/i);
    const alpha = warehouseSchema.safeParse({ ...validWarehouse, pincode: '11002A' });
    expect(messages(alpha)).toMatch(/6-digit pincode/i);
  });

  it('allows address line 2 to stay blank', () => {
    expect(warehouseSchema.safeParse({ ...validWarehouse, address_line2: '' }).success).toBe(true);
  });
});

describe('toSaveWarehouseVariables', () => {
  it('always includes owner_kind BRAND in the mutation input', () => {
    const variables = toSaveWarehouseVariables('b1', null, validWarehouse);
    expect(variables).toEqual({
      brand_doc_id: 'b1',
      id: null,
      input: { ...validWarehouse, owner_kind: 'BRAND' },
    });
  });

  it('satisfies the SAVE_MY_WAREHOUSE document (owner_kind is part of the sent variables)', async () => {
    const saved = {
      __typename: 'BrandPickupLocation',
      id: 'w1',
      owner_kind: 'BRAND',
      brand_id: 'b1',
      ...validWarehouse,
      shiprocket_registered: false,
      shiprocket_pickup_id: '',
      updated_at: '2026-07-01T00:00:00.000Z',
    };
    // The expected variables are spelled out literally: a save built without
    // owner_kind would not match this mock and the mutation would reject.
    const mock = {
      request: {
        query: SAVE_MY_WAREHOUSE,
        variables: { brand_doc_id: 'b1', id: 'w1', input: { ...validWarehouse, owner_kind: 'BRAND' } },
      },
      result: { data: { saveMyBrandPickupLocation: saved } },
    };
    const client = new ApolloClient({ link: new MockLink([mock]), cache: new InMemoryCache() });
    const response = await client.mutate({
      mutation: SAVE_MY_WAREHOUSE,
      variables: toSaveWarehouseVariables('b1', 'w1', validWarehouse),
    });
    expect(response.data?.saveMyBrandPickupLocation.id).toBe('w1');
    expect(response.data?.saveMyBrandPickupLocation.owner_kind).toBe('BRAND');
  });
});

describe('warehouseToValues', () => {
  it('returns the empty defaults (country India) when there is no warehouse', () => {
    expect(warehouseToValues(null)).toEqual(emptyWarehouseValues);
    expect(warehouseToValues(null).country).toBe('India');
  });

  it('prefills every editable field from an existing warehouse', () => {
    const warehouse = {
      id: 'w1',
      owner_kind: 'BRAND',
      brand_id: 'b1',
      ...validWarehouse,
      shiprocket_registered: false,
      shiprocket_pickup_id: '',
      updated_at: '2026-07-01T00:00:00.000Z',
    } as BrandWarehouse;
    expect(warehouseToValues(warehouse)).toEqual(validWarehouse);
  });
});
