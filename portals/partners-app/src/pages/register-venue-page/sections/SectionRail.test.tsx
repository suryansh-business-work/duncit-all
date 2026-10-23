import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import SectionRail from './SectionRail';
import type { SectionState } from '../register-venue/useRegisterVenueForm';
import { renderWithProviders } from '../../../__tests__/render';

afterEach(cleanup);

const sectionState: Record<
  'details' | 'type-capacity' | 'food' | 'amenities' | 'documents' | 'owner' | 'payout',
  SectionState
> = {
  details: 'complete',
  'type-capacity': 'incomplete',
  food: 'complete',
  amenities: 'complete',
  documents: 'incomplete',
  owner: 'incomplete',
  payout: 'incomplete',
};

// The rail is display:none below md (the tabs take over there), so role queries
// include hidden elements — jsdom has no viewport to decide which one shows.
const rail = () => screen.getByRole('navigation', { name: 'Registration sections', hidden: true });

describe('SectionRail', () => {
  it('lists every section with its hint and marks the open one current', () => {
    renderWithProviders(<SectionRail active="documents" sectionState={sectionState} onSelect={vi.fn()} mode="register" />);

    const items = within(rail()).getAllByRole('button', { hidden: true });
    // Registering asks who and where only: type, capacity, food, amenities and
    // holidays are set up from Venue Options.
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining('Venue Details'),
      expect.stringContaining('Venue Documents'),
      expect.stringContaining('Owner Details'),
      expect.stringContaining('Payout method'),
      expect.stringContaining('Review & Submit'),
    ]);
    const current = items.filter((item) => item.getAttribute('aria-current') === 'true');
    expect(current).toHaveLength(1);
    expect(current[0].textContent).toContain('Venue Documents');
    // The payout entry reads its copy from the catalogue.
    expect(within(rail()).getByText('Bank details for venue payouts')).toBeTruthy();
  });

  it('names the tick on each section so its state is not colour-only', () => {
    renderWithProviders(<SectionRail active="details" sectionState={sectionState} onSelect={vi.fn()} mode="register" />);

    expect(within(rail()).getAllByTitle('Section complete')).toHaveLength(1);
    expect(within(rail()).getAllByTitle('Section not complete')).toHaveLength(3);
  });

  it('opens a section from the side rail', () => {
    const onSelect = vi.fn();
    renderWithProviders(<SectionRail active="details" sectionState={sectionState} onSelect={onSelect} mode="register" />);

    fireEvent.click(within(rail()).getByText('Owner Details'));

    expect(onSelect).toHaveBeenCalledWith('owner');
  });

  it('opens a section from the small-screen tabs', () => {
    const onSelect = vi.fn();
    renderWithProviders(<SectionRail active="details" sectionState={sectionState} onSelect={onSelect} mode="register" />);

    fireEvent.click(screen.getByRole('tab', { name: 'Payout method' }));

    expect(onSelect).toHaveBeenCalledWith('payout');
  });

  it('keeps the whole small-screen strip — tabs and their search box — inside the one wrapper md+ hides', () => {
    renderWithProviders(<SectionRail active="details" sectionState={sectionState} onSelect={vi.fn()} mode="register" />);

    // The strip is searchable (five tabs), and DuncitTabs puts a caller's sx on
    // the tabs alone: without this wrapper the search box stayed on screen at
    // md+ as an empty column between the rail and the form.
    const strip = screen.getByTestId('register-venue-section-tabs');
    expect(within(strip).getByTestId('tabs-search')).toBeTruthy();
    expect(within(strip).getByRole('tablist')).toBeTruthy();
    expect(screen.getAllByTestId('tabs-search')).toHaveLength(1);
    // The rail and that wrapper are the only two things the form's row receives.
    expect(strip.previousElementSibling).toBe(rail());
    expect(strip.nextElementSibling?.getAttribute('data-testid')).toBe('location');
  });

  it('drops Review & Submit for an approved venue', () => {
    renderWithProviders(
      <SectionRail active="details" sectionState={sectionState} onSelect={vi.fn()} mode="edit-approved" />
    );

    expect(within(rail()).getAllByRole('button', { hidden: true })).toHaveLength(4);
    expect(screen.queryByRole('tab', { name: 'Review & Submit' })).toBeNull();
  });
});
