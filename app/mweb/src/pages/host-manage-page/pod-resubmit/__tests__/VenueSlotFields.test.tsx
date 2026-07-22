import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { VenueField, SlotField } from '../VenueSlotFields';
import type { ResubmitSlotOption, ResubmitVenueOption } from '../pod-resubmit.types';

const venues: ResubmitVenueOption[] = [
  { id: 'v1', venue_name: 'Alpha Hall', city: 'Mumbai' },
  { id: 'v2', venue_name: 'Beta Hall', city: null },
];

const slots: ResubmitSlotOption[] = [
  {
    id: 's1',
    start_at: '2026-08-01T10:00:00.000Z',
    end_at: '2026-08-01T12:00:00.000Z',
    price: 500,
    space_label: 'Main Room',
  },
  {
    id: 's2',
    start_at: '2026-08-02T14:00:00.000Z',
    end_at: '2026-08-02T15:00:00.000Z',
    price: 0,
    space_label: '',
  },
];

describe('VenueField', () => {
  it('renders venue options with and without city and default helper text', () => {
    render(<VenueField venues={venues} value="" onChange={() => {}} />);
    expect(screen.getByText('Pick the venue to request')).toBeInTheDocument();
    // Open the select to view options.
    fireEvent.mouseDown(screen.getByRole('combobox'));
    const listbox = within(screen.getByRole('listbox'));
    expect(listbox.getByText(/Alpha Hall/)).toHaveTextContent('Alpha Hall · Mumbai');
    expect(listbox.getByText(/Beta Hall/)).toHaveTextContent('Beta Hall');
  });

  it('fires onChange with selected venue id', () => {
    const onChange = vi.fn();
    render(<VenueField venues={venues} value="" onChange={onChange} />);
    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(within(screen.getByRole('listbox')).getByText(/Alpha Hall/));
    expect(onChange).toHaveBeenCalledWith('v1');
  });

  it('shows error text and error state when error prop is set', () => {
    render(<VenueField venues={venues} value="" error="Venue required" onChange={() => {}} />);
    expect(screen.getByText('Venue required')).toBeInTheDocument();
  });
});

describe('SlotField', () => {
  it('shows "Select a venue first" helper when disabled with no error', () => {
    render(<SlotField slots={[]} loading={false} disabled value="" onChange={() => {}} />);
    expect(screen.getByText('Select a venue first')).toBeInTheDocument();
  });

  it('shows no-open-slots helper when enabled, not loading and empty', () => {
    render(<SlotField slots={[]} loading={false} disabled={false} value="" onChange={() => {}} />);
    expect(
      screen.getByText('No open slots at this venue — pick another venue'),
    ).toBeInTheDocument();
  });

  it('shows default helper and a loading spinner while loading', () => {
    render(<SlotField slots={[]} loading disabled={false} value="" onChange={() => {}} />);
    expect(screen.getByText('Pick an open time slot')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders slot options via slotOptionLabel and fires onChange', () => {
    const onChange = vi.fn();
    render(
      <SlotField slots={slots} loading={false} disabled={false} value="" onChange={onChange} />,
    );
    fireEvent.mouseDown(screen.getByRole('combobox'));
    const listbox = within(screen.getByRole('listbox'));
    // priced + spaced slot
    expect(listbox.getByText(/₹500/)).toBeInTheDocument();
    expect(listbox.getByText(/Main Room/)).toBeInTheDocument();
    fireEvent.click(listbox.getAllByRole('option')[0]);
    expect(onChange).toHaveBeenCalledWith('s1');
  });

  it('prioritises error helper text over disabled/empty helpers', () => {
    render(
      <SlotField slots={[]} loading={false} disabled value="" error="Slot required" onChange={() => {}} />,
    );
    expect(screen.getByText('Slot required')).toBeInTheDocument();
    expect(screen.queryByText('Select a venue first')).not.toBeInTheDocument();
  });
});
