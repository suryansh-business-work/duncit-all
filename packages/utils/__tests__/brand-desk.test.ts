import { describe, expect, it } from 'vitest';

import {
  BRAND_ORDERS_PAGE_SIZE,
  brandOrdersPageCount,
  brandOrdersTableQuery,
  PICKUP_SHIPROCKET_STATE_KEYS,
  PICKUP_SHIPROCKET_TONE,
  pickupReview,
  pickupShiprocketState,
  shipToLines,
  SHIPMENT_DOCUMENTS,
} from '../src/brand-desk';

describe('brandOrdersTableQuery', () => {
  it('asks for every order, newest first, a page at a time', () => {
    expect(brandOrdersTableQuery({ page: 1 })).toEqual({
      page: 1,
      page_size: BRAND_ORDERS_PAGE_SIZE,
      sort_by: 'created_at',
      sort_dir: 'desc',
      filters: [],
    });
  });

  it('narrows to one status and a trimmed search', () => {
    expect(brandOrdersTableQuery({ page: 3, status: 'FAILED', search: '  DUN-12 ', pageSize: 5 })).toEqual({
      page: 3,
      page_size: 5,
      search: 'DUN-12',
      sort_by: 'created_at',
      sort_dir: 'desc',
      filters: [{ field: 'fulfilment_status', op: 'eq', value: 'FAILED' }],
    });
  });

  it('sends no search for a box of spaces, and no status for "all"', () => {
    const query = brandOrdersTableQuery({ page: 1, status: '', search: '   ' });
    expect(query).not.toHaveProperty('search');
    expect(query.filters).toEqual([]);
  });

  it('never asks for a page before the first', () => {
    expect(brandOrdersTableQuery({ page: 0 }).page).toBe(1);
    expect(brandOrdersTableQuery({ page: 2.7 }).page).toBe(2);
  });
});

describe('brandOrdersPageCount', () => {
  it('rounds a part page up', () => {
    expect(brandOrdersPageCount(41)).toBe(3);
    expect(brandOrdersPageCount(40)).toBe(2);
    expect(brandOrdersPageCount(11, 5)).toBe(3);
  });

  it('is one page even with no orders', () => {
    expect(brandOrdersPageCount(0)).toBe(1);
  });
});

describe('shipToLines', () => {
  const full = {
    name: 'Riya Sharma',
    phone: '9845012345',
    line1: '221B Indiranagar',
    line2: '2nd Stage',
    landmark: 'Near Metro',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560038',
    country: 'India',
  };

  it('reads like a parcel label', () => {
    expect(shipToLines(full)).toEqual([
      'Riya Sharma',
      '9845012345',
      '221B Indiranagar, 2nd Stage, Near Metro',
      'Bengaluru, Karnataka 560038',
      'India',
    ]);
  });

  it('drops blank parts without leaving stray commas or empty lines', () => {
    const sparse = { ...full, phone: '', line2: '', landmark: '', state: '', country: '' };
    expect(shipToLines(sparse)).toEqual(['Riya Sharma', '221B Indiranagar', 'Bengaluru 560038']);
    expect(shipToLines({ ...sparse, name: '', line1: '', city: '', pincode: '' })).toEqual([]);
  });
});

describe('pickupReview', () => {
  it('names and tones each review status', () => {
    expect(pickupReview('APPROVED')).toEqual({ key: 'mweb.brandWarehouses.reviewApproved', tone: 'done' });
    expect(pickupReview('REJECTED')).toEqual({ key: 'mweb.brandWarehouses.reviewRejected', tone: 'failed' });
    expect(pickupReview('PENDING')).toEqual({ key: 'mweb.brandWarehouses.reviewPending', tone: 'pending' });
  });

  it('reads a status it does not know as still waiting, never as approved', () => {
    expect(pickupReview('ON_HOLD')).toEqual({ key: 'mweb.brandWarehouses.reviewPending', tone: 'pending' });
  });
});

describe('pickupShiprocketState', () => {
  it('is ready once ShipRocket has the pickup with nothing to say', () => {
    expect(pickupShiprocketState({ shiprocket_registered: true, shiprocket_error: '' })).toBe('REGISTERED');
  });

  it('is waiting while ShipRocket holds it unverified', () => {
    expect(
      pickupShiprocketState({
        shiprocket_registered: true,
        shiprocket_error: 'Awaiting phone verification in ShipRocket',
      }),
    ).toBe('AWAITING_VERIFICATION');
  });

  it('is missing when ShipRocket has no such pickup, whatever the reason', () => {
    expect(pickupShiprocketState({ shiprocket_registered: false, shiprocket_error: '' })).toBe('NOT_IN_SHIPROCKET');
    expect(
      pickupShiprocketState({ shiprocket_registered: false, shiprocket_error: 'No ShipRocket pickup address is named "A"' }),
    ).toBe('NOT_IN_SHIPROCKET');
  });

  it('names and tones every state', () => {
    expect(PICKUP_SHIPROCKET_STATE_KEYS).toEqual({
      REGISTERED: 'mweb.brandWarehouses.stateRegistered',
      AWAITING_VERIFICATION: 'mweb.brandWarehouses.stateAwaitingVerification',
      NOT_IN_SHIPROCKET: 'mweb.brandWarehouses.stateNotInShiprocket',
    });
    expect(PICKUP_SHIPROCKET_TONE).toEqual({
      REGISTERED: 'done',
      AWAITING_VERIFICATION: 'pending',
      NOT_IN_SHIPROCKET: 'failed',
    });
  });
});

describe('SHIPMENT_DOCUMENTS', () => {
  it('offers the label, invoice and manifest, each to print and to save', () => {
    expect(SHIPMENT_DOCUMENTS.map((d) => d.kind)).toEqual(['LABEL', 'INVOICE', 'MANIFEST']);
    for (const doc of SHIPMENT_DOCUMENTS) {
      expect(doc.printKey).toMatch(/^mweb\.brandOrders\.print/);
      expect(doc.downloadKey).toMatch(/^mweb\.brandOrders\.download/);
    }
  });
});
