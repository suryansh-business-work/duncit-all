import '@testing-library/jest-dom/vitest';
import { useForm } from 'react-hook-form';
import { render, screen } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import { describe, expect, it } from 'vitest';
import { filterProductsForClub, pruneProductRequests } from '@duncit/utils';
import PricingStep from '../steps/PricingStep';
import { blankCreatePodForm, type CreatePodFormValues, type CreatePodProduct } from '../create-pod.types';
import type { EarningsPreview } from '../price-panel';

/**
 * The pod-category product rule on mWeb. The stepper suite stubs PricingStep, so
 * this is the only mWeb coverage of what Step 4 actually offers — the native twin
 * has the same cases in create-pod-step4-pricing.test.tsx (rule 27).
 */

// A club stores its Sub-category in `category_id`; Super + Sub pins the pod's
// full For You -> Sports -> Badminton path, because a Sub has one parent.
const BADMINTON_CLUB = { id: 'c1', club_name: 'Badminton', super_category_id: 'sup-1', category_id: 'sub-1' };
const LEGACY_CLUB = { id: 'c2', club_name: 'Legacy' };

const shuttles = {
  id: 'p1',
  product_name: 'Shuttlecocks',
  unit_cost: 100,
  available_count: 5,
  categories: [{ super_category_id: 'sup-1', sub_category_id: 'sub-1' }],
};
const football = {
  id: 'p2',
  product_name: 'Football',
  unit_cost: 200,
  available_count: 5,
  categories: [{ super_category_id: 'sup-2', sub_category_id: 'sub-2' }],
};
const CATALOGUE = [shuttles, football];

const preview = {
  slotPrice: null, podAmount: 0, noOfSpots: 0, venueId: null, isPhysical: false, isFree: false,
  projection: undefined, loading: false, stale: false, hasVenue: false, ready: false,
  priceMissing: true, zeroEarnings: false, venueShortfall: false, blocked: true,
} as EarningsPreview;

function Harness({ products }: Readonly<{ products: CreatePodProduct[] }>) {
  const form = useForm<CreatePodFormValues, any, CreatePodFormValues>({
    defaultValues: { ...blankCreatePodForm, products_enabled: true, product_requests: [{ product_id: '', quantity: 1 }] },
  });
  return (
    <PricingStep
      form={form}
      products={products}
      showProducts
      preview={preview}
      spots={{ min: 0, max: 10000, slidable: false }}
    />
  );
}

const renderFor = (club: unknown) =>
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[]}>
      <Harness products={filterProductsForClub(CATALOGUE, club) as CreatePodProduct[]} />
    </MockedProvider>,
  );

describe('Step 4 product picker — pod category hierarchy', () => {
  it('offers only the products mapped to the pod category', () => {
    renderFor(BADMINTON_CLUB);
    expect(screen.getByRole('button', { name: /Add product/ })).toBeEnabled();
    expect(screen.queryByText('No products available for this category.')).not.toBeInTheDocument();
    expect(filterProductsForClub(CATALOGUE, BADMINTON_CLUB)).toEqual([shuttles]);
  });

  // Previously the whole catalogue leaked through here — this is the reported bug.
  it('offers nothing, and says so, when the pod club carries no category', () => {
    renderFor(LEGACY_CLUB);
    expect(screen.getByText('No products available for this category.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add product/ })).toBeDisabled();
  });

  it('offers nothing before a club is picked', () => {
    renderFor(null);
    expect(screen.getByText('No products available for this category.')).toBeInTheDocument();
  });
});

describe('changing club prunes what was already picked', () => {
  it('drops a row whose product the new club does not offer', () => {
    const picked = [{ product_id: 'p1', quantity: 2 }];
    const afterSwitch = filterProductsForClub(CATALOGUE, { super_category_id: 'sup-2', category_id: 'sub-2' });
    expect(pruneProductRequests(picked, afterSwitch as { id: string }[])).toEqual([]);
  });

  it('keeps a row the new club still offers', () => {
    const picked = [{ product_id: 'p1', quantity: 2 }];
    const stillBadminton = filterProductsForClub(CATALOGUE, BADMINTON_CLUB);
    expect(pruneProductRequests(picked, stillBadminton as { id: string }[])).toBe(picked);
  });
});
