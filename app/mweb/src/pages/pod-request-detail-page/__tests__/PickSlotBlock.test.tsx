import { describe, expect, it, vi } from 'vitest';
import type { MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import PickSlotBlock from '../PickSlotBlock';
import { VENUE_AVAILABLE_SLOTS } from '../../create-pod-page/create-pod/venueSlots';
import type { CreatePodSlot } from '../../create-pod-page/create-pod/create-pod.types';

/*
  The calendar is Create Pod's shared SlotPicker with its own suite. What this
  block owns is WHICH slots reach it (one space at a time), what a pick does,
  and the Send button — so the picker is stood in for by one button per slot.
*/
vi.mock('../../create-pod-page/create-pod/SlotPicker', () => ({
  default: ({ slots, selectedSlotId, onPick }: { slots: CreatePodSlot[]; selectedSlotId: string; onPick: (s: CreatePodSlot) => void }) => (
    <div data-testid="slot-picker">
      {slots.map((slot) => (
        <button
          key={slot.id}
          type="button"
          aria-pressed={slot.id === selectedSlotId}
          onClick={() => onPick(slot)}
          data-testid={`slot-${slot.id}`}
        >
          {slot.id}
        </button>
      ))}
    </div>
  ),
}));

const slot = (id: string, space_label: string): CreatePodSlot => ({
  id,
  start_at: '2026-10-10T10:00:00.000Z',
  end_at: '2026-10-10T12:00:00.000Z',
  whole_day: false,
  price: 500,
  space_label,
  capacity: 20,
  status: 'OPEN',
});

const slotsMock = (slots: CreatePodSlot[]): MockedResponse => ({
  request: { query: VENUE_AVAILABLE_SLOTS, variables: { venue_id: 'venue-1' } },
  result: { data: { venueAvailableSlots: slots.map((s) => ({ __typename: 'VenueSlot', ...s })) } },
});

function renderBlock(mocks: MockedResponse[], onSend = vi.fn(async () => true), busy = false) {
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <PickSlotBlock venueId="venue-1" busy={busy} onSend={onSend} />
    </MockedProvider>,
  );
  return onSend;
}

describe('PickSlotBlock', () => {
  it('keeps Send Slot Request off until a slot is picked, then sends that slot', async () => {
    const onSend = renderBlock([slotsMock([slot('s1', ''), slot('s2', '')])]);

    const send = screen.getByTestId('pod-request-send-slot');
    expect(send).toHaveTextContent('Send Slot Request');
    expect(send).toBeDisabled();

    fireEvent.click(await screen.findByTestId('slot-s2'));
    expect(send).toBeEnabled();
    fireEvent.click(send);

    expect(onSend).toHaveBeenCalledWith('s2');
    // A single space needs no space chips.
    expect(screen.queryByTestId('pill-chips')).not.toBeInTheDocument();
  });

  it('splits a venue that sells several spaces: one space at a time, and switching clears the pick', async () => {
    renderBlock([slotsMock([slot('court-a-1', 'Court A'), slot('court-b-1', 'Court B'), slot('whole-1', '')])]);

    const chips = await screen.findByTestId('pill-chips');
    expect(within(chips).getByText('Court A')).toBeInTheDocument();
    expect(within(chips).getByText('Court B')).toBeInTheDocument();
    // The whole-venue space reads as words, not a blank chip.
    expect(within(chips).getByText('Whole venue')).toBeInTheDocument();
    // The first space is the one shown to start.
    expect(screen.getByTestId('slot-court-a-1')).toBeInTheDocument();
    expect(screen.queryByTestId('slot-court-b-1')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('slot-court-a-1'));
    expect(screen.getByTestId('pod-request-send-slot')).toBeEnabled();

    fireEvent.click(screen.getByTestId('pill-chips-Court B'));

    expect(screen.getByTestId('slot-court-b-1')).toBeInTheDocument();
    expect(screen.queryByTestId('slot-court-a-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('pod-request-send-slot')).toBeDisabled();
  });

  it('says the venue has no open slots instead of an empty calendar', async () => {
    renderBlock([slotsMock([])]);

    expect(await screen.findByText('This venue has no open slots right now.')).toBeInTheDocument();
    expect(screen.queryByTestId('slot-picker')).not.toBeInTheDocument();
    expect(screen.getByTestId('pod-request-send-slot')).toBeDisabled();
  });

  it('shows a failed slot load as an error, not as "no slots"', async () => {
    renderBlock([
      { request: { query: VENUE_AVAILABLE_SLOTS, variables: { venue_id: 'venue-1' } }, error: new Error('Slots are unavailable') },
    ]);

    expect(await screen.findByText('Slots are unavailable')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('This venue has no open slots right now.')).not.toBeInTheDocument());
  });
});
