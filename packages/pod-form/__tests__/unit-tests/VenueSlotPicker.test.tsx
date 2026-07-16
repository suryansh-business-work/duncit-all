import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VenueSlotPicker from '../../src/components/VenueSlotPicker';

const useQueryMock = vi.fn();

vi.mock('@apollo/client', () => ({
  gql: (strings: TemplateStringsArray) => strings.join(''),
  useQuery: (...args: unknown[]) => useQueryMock(...args),
}));

const SLOT = {
  id: 's1',
  start_at: '2030-06-01T10:00:00.000Z',
  end_at: '2030-06-01T12:00:00.000Z',
  notes: 'Main hall',
};

beforeEach(() => {
  useQueryMock.mockReset();
});

describe('VenueSlotPicker', () => {
  it('prompts to pick a venue when none is selected', () => {
    useQueryMock.mockReturnValue({ data: undefined, loading: false, error: undefined });
    render(<VenueSlotPicker venueId="" selectedSlotId="" onSelect={vi.fn()} />);
    expect(screen.getByText(/Select a venue first/)).toBeInTheDocument();
  });

  it('shows a loading message while fetching with no slots yet', () => {
    useQueryMock.mockReturnValue({ data: undefined, loading: true, error: undefined });
    render(<VenueSlotPicker venueId="v1" selectedSlotId="" onSelect={vi.fn()} />);
    expect(screen.getByText(/Loading available slots/)).toBeInTheDocument();
  });

  it('renders an Apollo error', () => {
    useQueryMock.mockReturnValue({ data: undefined, loading: false, error: { message: 'Boom' } });
    render(<VenueSlotPicker venueId="v1" selectedSlotId="" onSelect={vi.fn()} />);
    expect(screen.getByText('Boom')).toBeInTheDocument();
  });

  it('warns when the venue has no available slots', () => {
    useQueryMock.mockReturnValue({ data: { venueAvailableSlots: [] }, loading: false, error: undefined });
    render(<VenueSlotPicker venueId="v1" selectedSlotId="" onSelect={vi.fn()} />);
    expect(screen.getByText(/no available slots/)).toBeInTheDocument();
  });

  it('lists slots and calls onSelect with the picked slot', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    useQueryMock.mockReturnValue({ data: { venueAvailableSlots: [SLOT] }, loading: false, error: undefined });
    render(<VenueSlotPicker venueId="v1" selectedSlotId="" onSelect={onSelect} />);
    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByText(/Main hall/));
    expect(onSelect).toHaveBeenCalledWith({ id: 's1', start_at: SLOT.start_at, end_at: SLOT.end_at });
  });

  it('offers the currently-booked slot as an extra option when editing', () => {
    useQueryMock.mockReturnValue({ data: { venueAvailableSlots: [] }, loading: false, error: undefined });
    render(
      <VenueSlotPicker
        venueId="v1"
        selectedSlotId="booked"
        currentSlot={{ id: 'booked', start_at: SLOT.start_at, end_at: SLOT.end_at }}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByText(/Currently booked for this pod/)).toBeInTheDocument();
  });

  it('does not duplicate the current slot when it is already available', () => {
    useQueryMock.mockReturnValue({ data: { venueAvailableSlots: [SLOT] }, loading: false, error: undefined });
    render(
      <VenueSlotPicker
        venueId="v1"
        selectedSlotId="s1"
        currentSlot={{ id: 's1', start_at: SLOT.start_at, end_at: SLOT.end_at }}
        onSelect={vi.fn()}
      />,
    );
    // currentSlot id matches an available slot -> not prepended, no "booked" note
    expect(screen.queryByText(/Currently booked for this pod/)).not.toBeInTheDocument();
  });

  it('clears the selection when the selected slot is no longer available', async () => {
    const onSelect = vi.fn();
    useQueryMock.mockReturnValue({ data: { venueAvailableSlots: [SLOT] }, loading: false, error: undefined });
    render(<VenueSlotPicker venueId="v1" selectedSlotId="gone" onSelect={onSelect} />);
    await waitFor(() => expect(onSelect).toHaveBeenCalledWith(null));
  });

  it('does not clear the selection while still loading', () => {
    const onSelect = vi.fn();
    useQueryMock.mockReturnValue({ data: { venueAvailableSlots: [SLOT] }, loading: true, error: undefined });
    render(<VenueSlotPicker venueId="v1" selectedSlotId="s-loading" onSelect={onSelect} />);
    // the effect returns early because loading is true
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('renders a slot without notes', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    useQueryMock.mockReturnValue({
      data: { venueAvailableSlots: [{ ...SLOT, notes: '' }] },
      loading: false,
      error: undefined,
    });
    render(<VenueSlotPicker venueId="v1" selectedSlotId="" onSelect={onSelect} />);
    await user.click(screen.getByRole('combobox'));
    // a slot with empty notes still renders its date/time option (no caption line)
    await user.click(await screen.findByRole('option'));
    expect(onSelect).toHaveBeenCalledWith({ id: 's1', start_at: SLOT.start_at, end_at: SLOT.end_at });
  });
});
