import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, screen } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { gql } from '@apollo/client';
import ReviewSection from './ReviewSection';
import { mountSection } from './__tests__/sectionHarness';
import type { RegisterVenueValues } from '../register-venue/register-venue.types';

afterEach(cleanup);

// ReviewSection's own document, redeclared so the mocks match its requests.
const CATEGORY_NAMES = gql`
  query VenueCategoryNames($ids: CategoryFilterInput) {
    categories(filter: $ids) {
      id
      name
    }
  }
`;

const categories = (ids: Record<string, string>, rows: { id: string; name: string }[]): MockedResponse => ({
  request: { query: CATEGORY_NAMES, variables: { ids } },
  result: { data: { categories: rows.map((row) => ({ __typename: 'Category', ...row })) } },
});

const categoryMocks = [
  categories({ level: 'SUPER' }, [
    { id: 'super-1', name: 'Food & Drink' },
    { id: 'super-2', name: 'Sports' },
  ]),
  categories({ level: 'CATEGORY', parent_id: 'super-1' }, [{ id: 'cat-1', name: 'Cafe' }]),
  categories({ level: 'SUB', parent_id: 'cat-1' }, [{ id: 'sub-1', name: 'Coffee' }]),
];

const complete: Partial<RegisterVenueValues> = {
  venue_name: 'Cafe Mocha',
  venue_type: 'Cafe',
  super_category_id: 'super-1',
  category_id: 'cat-1',
  sub_category_id: 'sub-1',
  address_line1: '12 Main Street',
  locality: 'Indiranagar',
  city: 'Bengaluru',
  state: 'Karnataka',
  postal_code: '560038',
  capacity_items: [
    { label: 'Main hall', capacity: 30 },
    { label: 'Terrace', capacity: '12' },
    { label: '', capacity: '' },
  ],
  documents: [
    { type: 'PAN Card', url: 'https://cdn.duncit.com/pan.pdf' },
    { type: 'Trade License', url: '' },
  ],
  gstin: '29ABCDE1234F1Z5',
  pan: 'ABCDE1234F',
  owner_name: 'Asha Rao',
  owner_email: 'asha@duncit.com',
  owner_phone: '+919876543210',
  payout_method: 'NEFT',
  account_holder_name: 'Asha Rao',
  account_number: '123456789',
  ifsc_code: 'HDFC0001234',
};

describe('ReviewSection', () => {
  it('summarises every section, resolving the category names from the catalogue', async () => {
    mountSection((form) => <ReviewSection form={form} />, complete, { mocks: categoryMocks });

    expect(screen.getByText('Review your registration')).toBeTruthy();
    expect(await screen.findByText('Food & Drink › Cafe › Coffee')).toBeTruthy();
    expect(screen.getByText('Cafe Mocha')).toBeTruthy();
    expect(screen.getByText('12 Main Street, Indiranagar, Bengaluru, Karnataka, 560038')).toBeTruthy();
    expect(screen.getByText('42')).toBeTruthy();
    expect(screen.getByText('Main hall: 30')).toBeTruthy();
    expect(screen.getByText('Terrace: 12')).toBeTruthy();
    // Only uploaded documents are listed.
    expect(screen.getByText('PAN Card')).toBeTruthy();
    expect(screen.queryByText(/Trade License/)).toBeNull();
    expect(screen.getByText('29ABCDE1234F1Z5')).toBeTruthy();
    expect(screen.getByText('123456789 · HDFC0001234')).toBeTruthy();
  });

  it('shows the UPI id as the payout detail for a UPI payout', () => {
    mountSection((form) => <ReviewSection form={form} />, {
      ...complete,
      payout_method: 'UPI',
      upi_id: 'asha@okaxis',
    });

    expect(screen.getByText('asha@okaxis')).toBeTruthy();
    expect(screen.queryByText('123456789 · HDFC0001234')).toBeNull();
  });

  it('marks every unanswered row with a dash and skips the category lookups it cannot make', () => {
    mountSection((form) => <ReviewSection form={form} />, {}, { mocks: categoryMocks });

    // Name, type, category, address, capacity, documents, GSTIN, PAN, owner,
    // email, phone, payout method, holder and payout details are all empty.
    expect(screen.getAllByText('—')).toHaveLength(14);
  });
});
