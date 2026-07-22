import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import LocationAreaPicker from '../LocationAreaPicker';

const zones = [
  { zone_name: 'Andheri', pincode: '400053', active_club_count: 3 },
  { zone_name: 'Bandra', pincode: '400050', active_club_count: 1 },
  { zone_name: 'Colaba', pincode: null, active_club_count: 0 },
  { zone_name: 'Dadar', pincode: '400028', active_club_count: null },
];

describe('LocationAreaPicker', () => {
  it('renders the empty state when there are no zones', () => {
    render(
      <LocationAreaPicker locationName="Mumbai" zones={[]} draftZone="" setDraftZone={vi.fn()} />
    );
    expect(screen.getByText('Locality / Area in Mumbai')).toBeInTheDocument();
    expect(screen.getByText('This city has no localities configured.')).toBeInTheDocument();
  });

  it('renders all zones with club count and pincode labels', () => {
    render(
      <LocationAreaPicker locationName="Mumbai" zones={zones} draftZone="" setDraftZone={vi.fn()} />
    );
    // "All areas" header shows total localities
    expect(screen.getByText('All areas')).toBeInTheDocument();
    expect(screen.getByText('4 localities')).toBeInTheDocument();
    // Each zone name
    expect(screen.getByText('Andheri')).toBeInTheDocument();
    // plural club label + pincode joined
    expect(screen.getByText('3 clubs · PIN 400053')).toBeInTheDocument();
    // singular club label
    expect(screen.getByText('1 club · PIN 400050')).toBeInTheDocument();
    // zero clubs, no pincode
    expect(screen.getByText('No clubs yet')).toBeInTheDocument();
    // null count -> No clubs yet, with pincode
    expect(screen.getByText('No clubs yet · PIN 400028')).toBeInTheDocument();
  });

  it('selects "All areas" when no draftZone is set', () => {
    const setDraftZone = vi.fn();
    render(
      <LocationAreaPicker locationName="Mumbai" zones={zones} draftZone="" setDraftZone={setDraftZone} />
    );
    const allAreas = screen.getByText('All areas').closest('div[role="button"]') as HTMLElement;
    expect(allAreas).toHaveClass('Mui-selected');
    fireEvent.click(allAreas);
    expect(setDraftZone).toHaveBeenCalledWith('');
  });

  it('selects a specific zone on click and highlights the active draftZone', () => {
    const setDraftZone = vi.fn();
    render(
      <LocationAreaPicker
        locationName="Mumbai"
        zones={zones}
        draftZone="Bandra"
        setDraftZone={setDraftZone}
      />
    );
    const bandra = screen.getByText('Bandra').closest('div[role="button"]') as HTMLElement;
    expect(bandra).toHaveClass('Mui-selected');
    const andheri = screen.getByText('Andheri').closest('div[role="button"]') as HTMLElement;
    fireEvent.click(andheri);
    expect(setDraftZone).toHaveBeenCalledWith('Andheri');
  });

  it('filters zones by name via the search field', () => {
    render(
      <LocationAreaPicker locationName="Mumbai" zones={zones} draftZone="" setDraftZone={vi.fn()} />
    );
    const search = screen.getByPlaceholderText('Search locality or PIN code');
    fireEvent.change(search, { target: { value: 'band' } });
    expect(screen.getByText('Bandra')).toBeInTheDocument();
    expect(screen.queryByText('Andheri')).not.toBeInTheDocument();
    expect(screen.queryByText('Colaba')).not.toBeInTheDocument();
  });

  it('filters zones by pincode', () => {
    render(
      <LocationAreaPicker locationName="Mumbai" zones={zones} draftZone="" setDraftZone={vi.fn()} />
    );
    const search = screen.getByPlaceholderText('Search locality or PIN code');
    fireEvent.change(search, { target: { value: '400028' } });
    expect(screen.getByText('Dadar')).toBeInTheDocument();
    expect(screen.queryByText('Andheri')).not.toBeInTheDocument();
  });

  it('shows the no-match message when the query matches nothing', () => {
    render(
      <LocationAreaPicker locationName="Mumbai" zones={zones} draftZone="" setDraftZone={vi.fn()} />
    );
    const search = screen.getByPlaceholderText('Search locality or PIN code');
    fireEvent.change(search, { target: { value: 'zzzzz' } });
    expect(screen.getByText('No matching localities found.')).toBeInTheDocument();
    // "All areas" still present since it's outside the filtered list
    expect(screen.getByText('All areas')).toBeInTheDocument();
  });
});
