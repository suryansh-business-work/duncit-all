/**
 * The live member preview, mounted INSIDE the form's provider: it re-derives
 * from the same values the save button submits, and names the category and
 * location the form only holds as ids.
 */
import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { UseFormReturn } from 'react-hook-form';

vi.mock('@duncit/category', () => ({
  useAdminCategories: () => ({ categories: [{ super_id: 'S1' }] }),
  buildCategoryValue: (_categories: unknown, superId: string, subId: string) => ({
    super_id: superId,
    super_name: superId ? 'Sports' : '',
    sub_id: subId,
    sub_name: subId ? 'Badminton' : '',
  }),
}));
vi.mock('@duncit/location', () => ({
  useAdminLocations: () => ({ locations: [{ location_id: 'L1' }] }),
  buildLocationValue: (_locations: unknown, locationId: string, locality: string) => ({
    location_id: locationId,
    locality,
    city: locationId ? 'Bengaluru' : '',
    state: locationId ? 'Karnataka' : '',
  }),
}));

import ClubPreview from '../../src/preview/ClubPreview';
import { blankClubFormValues, type ClubFormValues } from '../../src/types';
import { FormHarness } from '../formHarness';

function renderPreview(values: Partial<ClubFormValues>, onMethods?: (m: UseFormReturn<ClubFormValues>) => void) {
  return render(
    <FormHarness defaultValues={values} onMethods={onMethods}>
      <ClubPreview />
    </FormHarness>,
  );
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('ClubPreview', () => {
  it('renders both member surfaces from the live values, naming category and place', () => {
    renderPreview({
      club_name: 'Sunset Club',
      super_category_id: 'S1',
      category_id: 'SUB1',
      location_id: 'L1',
      locality: 'Indiranagar',
    });

    expect(screen.getByText('Member preview')).toBeInTheDocument();
    expect(screen.getByText('In the clubs list')).toBeInTheDocument();
    expect(screen.getByText('On the club page')).toBeInTheDocument();
    // The card and the page both show the same derived name.
    expect(screen.getAllByText('Sunset Club').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Sports · Badminton').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Indiranagar, Bengaluru, Karnataka')).toBeInTheDocument();
  });

  it('leaves the id-only labels out while nothing is picked yet', () => {
    renderPreview(blankClubFormValues);

    expect(screen.getAllByText('Untitled club').length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText(/Sports/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Bengaluru/)).not.toBeInTheDocument();
  });

  it('re-derives on every change to the form values', () => {
    let methods: UseFormReturn<ClubFormValues> | undefined;
    renderPreview({ club_name: 'Sunset Club' }, (m) => { methods = m; });
    expect(screen.getAllByText('Sunset Club').length).toBeGreaterThanOrEqual(2);

    act(() => methods?.setValue('club_name', 'Sunrise Club'));

    expect(screen.queryByText('Sunset Club')).not.toBeInTheDocument();
    expect(screen.getAllByText('Sunrise Club').length).toBeGreaterThanOrEqual(2);
  });
});
