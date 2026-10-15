import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { ADMIN_CATEGORIES, type AdminCategoryValue } from '@duncit/category';
import ReviewSection from './ReviewSection';
import { mountSection } from './__tests__/sectionHarness';
import type { RegisterVenueValues } from '../register-venue/register-venue.types';

afterEach(cleanup);

const doc = (id: string, name: string, level: 'SUPER' | 'CATEGORY' | 'SUB', parent_id: string | null) => ({
  __typename: 'Category',
  id,
  name,
  slug: id,
  level,
  parent_id,
  min_pax: null,
});

// The admin tree the category picker already fetched: the review reads names from it.
const categoryMocks: MockedResponse[] = [
  {
    request: { query: ADMIN_CATEGORIES },
    result: {
      data: {
        categories: [
          doc('super-1', 'Food & Drink', 'SUPER', null),
          doc('super-2', 'Sports', 'SUPER', null),
          doc('cat-1', 'Cafe', 'CATEGORY', 'super-1'),
          doc('cat-2', 'Racket', 'CATEGORY', 'super-2'),
          doc('sub-1', 'Coffee', 'SUB', 'cat-1'),
          doc('sub-2', 'Badminton', 'SUB', 'cat-2'),
        ],
      },
    },
    maxUsageCount: Number.POSITIVE_INFINITY,
  },
];

/** A row as a stored venue hydrates it when the server sent ids only: no names. */
const idsOnly = (super_id: string, category_id: string, sub_id: string): AdminCategoryValue => ({
  super_id,
  super_name: '',
  category_id,
  category_name: '',
  sub_id,
  sub_name: '',
});

const complete: Partial<RegisterVenueValues> = {
  venue_name: 'Cafe Mocha',
  venue_type: 'Cafe',
  venue_categories: [idsOnly('super-1', 'cat-1', 'sub-1')],
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
  has_gstin: true,
  has_pan: true,
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

  it('lists every category of a venue in several, primary first, under a plural label', async () => {
    mountSection(
      (form) => <ReviewSection form={form} />,
      { ...complete, venue_categories: [idsOnly('super-2', 'cat-2', 'sub-2'), idsOnly('super-1', 'cat-1', 'sub-1')] },
      { mocks: categoryMocks }
    );

    const list = await screen.findByTestId('review-venue-categories');
    await waitFor(() =>
      expect(within(list).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
        'Sports › Racket › Badminton',
        'Food & Drink › Cafe › Coffee',
      ])
    );
    expect(screen.getByText('Categories')).toBeTruthy();
    expect(screen.queryByText('Category')).toBeNull();
  });

  it('labels a single category in the singular', async () => {
    mountSection((form) => <ReviewSection form={form} />, complete, { mocks: categoryMocks });

    expect(await screen.findByText('Food & Drink › Cafe › Coffee')).toBeTruthy();
    expect(screen.getByText('Category')).toBeTruthy();
    expect(screen.queryByText('Categories')).toBeNull();
  });

  it('falls back to the name stored on the row for a category the catalogue no longer has', async () => {
    const retired: AdminCategoryValue = {
      super_id: 'super-1',
      super_name: 'Food and Drink (old name)',
      category_id: 'cat-gone',
      category_name: 'Bakery',
      sub_id: 'sub-gone',
      sub_name: 'Sourdough',
    };
    mountSection((form) => <ReviewSection form={form} />, { ...complete, venue_categories: [retired] }, { mocks: categoryMocks });

    // The live catalogue name wins where the id still exists; the stored name fills in where it does not.
    expect(await screen.findByText('Food & Drink › Bakery › Sourdough')).toBeTruthy();
  });

  it('lists a repeated category once and leaves out a row with nothing picked', async () => {
    const coffee = idsOnly('super-1', 'cat-1', 'sub-1');
    mountSection(
      (form) => <ReviewSection form={form} />,
      { ...complete, venue_categories: [coffee, idsOnly('', '', ''), { ...coffee }] },
      { mocks: categoryMocks }
    );

    const list = await screen.findByTestId('review-venue-categories');
    await waitFor(() =>
      expect(within(list).getAllByRole('listitem').map((item) => item.textContent)).toEqual(['Food & Drink › Cafe › Coffee'])
    );
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

  it('summarises food in a group of its own, after capacity and before the documents', () => {
    const { container } = mountSection((form) => <ReviewSection form={form} />, {
      ...complete,
      offers_food: true,
      food_menu: [
        { item_id: '', name: 'Masala dosa', description: '', category: '', price: 120, images: [], diet: 'VEG', spice_level: 'MILD', is_available: true, videos: [], original_price: '', saving_display: 'PERCENT' },
        { item_id: '', name: 'Filter coffee', description: '', category: '', price: 40, images: [], diet: 'VEG', spice_level: 'NONE', is_available: true, videos: [], original_price: '', saving_display: 'PERCENT' },
      ],
      food_ordering: { enabled: true, razorpay_integration_id: 'rzp-1', razorpay_linked: true, discount_pct: 0, tax_override: false, tax_mode: '', gst_pct: '' },
    });

    const food = screen.getByText('Offers food · 2 menu items · QR ordering on');
    // Dividers split the summary into its sections; the food row sits alone
    // between two of them, no longer in the capacity group.
    let row: Element = food;
    while (row.parentElement && !Array.from(row.parentElement.children).some((child) => child.tagName === 'HR')) {
      row = row.parentElement;
    }
    const groups: string[][] = [[]];
    for (const node of Array.from(row.parentElement?.children ?? [])) {
      if (node.tagName === 'HR') groups.push([]);
      else groups[groups.length - 1].push(node.textContent ?? '');
    }
    const foodGroup = groups.findIndex((rows) => rows.some((row) => row.includes('Offers food')));
    expect(groups[foodGroup]).toHaveLength(1);
    expect(groups[foodGroup][0]).toContain('Food');
    expect(groups[foodGroup - 1].join(' ')).toContain('Total capacity');
    expect(groups[foodGroup + 1].join(' ')).toContain('PAN Card');
    expect(within(container).queryByText('Does not offer food')).toBeNull();
  });

  it('says so when the venue offers no food, or offers it without QR ordering', () => {
    const { unmount } = mountSection((form) => <ReviewSection form={form} />, complete);
    expect(screen.getByText('Does not offer food')).toBeTruthy();
    unmount();

    mountSection((form) => <ReviewSection form={form} />, { ...complete, offers_food: true });
    expect(screen.getByText('Offers food · 0 menu items · QR ordering off')).toBeTruthy();
  });

  it('marks every unanswered row with a dash and skips the category lookups it cannot make', () => {
    mountSection((form) => <ReviewSection form={form} />, {}, { mocks: categoryMocks });

    // Name, type, category, address, capacity, documents, GSTIN, PAN, owner,
    // email, phone, payout method, holder and payout details are all empty.
    expect(screen.getAllByText('—')).toHaveLength(14);
  });
});
