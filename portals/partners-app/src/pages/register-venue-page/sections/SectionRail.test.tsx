import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import SectionRail from './SectionRail';
import type { SectionState } from '../register-venue/useRegisterVenueForm';
import { renderWithProviders } from '../../../__tests__/render';

afterEach(cleanup);

const sectionState: Record<'details' | 'type-capacity' | 'amenities' | 'documents' | 'owner' | 'payout', SectionState> = {
  details: 'complete',
  'type-capacity': 'incomplete',
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
    expect(items).toHaveLength(8);
    const current = items.filter((item) => item.getAttribute('aria-current') === 'true');
    expect(current).toHaveLength(1);
    expect(current[0].textContent).toContain('Venue Documents');
    // The payout entry reads its copy from the catalogue.
    expect(within(rail()).getByText('Bank details for venue payouts')).toBeTruthy();
  });

  it('names the tick on each section so its state is not colour-only', () => {
    renderWithProviders(<SectionRail active="details" sectionState={sectionState} onSelect={vi.fn()} mode="register" />);

    expect(within(rail()).getAllByTitle('Section complete')).toHaveLength(2);
    expect(within(rail()).getAllByTitle('Section not complete')).toHaveLength(4);
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

    fireEvent.click(screen.getByRole('tab', { name: 'Leaves & Holidays' }));

    expect(onSelect).toHaveBeenCalledWith('leaves');
  });

  it('drops Review & Submit for an approved venue', () => {
    renderWithProviders(
      <SectionRail active="details" sectionState={sectionState} onSelect={vi.fn()} mode="edit-approved" />
    );

    expect(within(rail()).getAllByRole('button', { hidden: true })).toHaveLength(7);
    expect(screen.queryByRole('tab', { name: 'Review & Submit' })).toBeNull();
  });
});
