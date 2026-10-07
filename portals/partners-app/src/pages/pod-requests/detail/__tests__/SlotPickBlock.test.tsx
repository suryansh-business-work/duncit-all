import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, configure, fireEvent, screen, waitFor, within } from '@testing-library/react';
import SlotPickBlock from '../SlotPickBlock';
import { renderWithProviders } from '../../../../__tests__/render';
import { STAY_PENDING, scriptedLink, type ScriptedAnswer } from '../../../../__tests__/groupC-link';
import { venueSlot } from '../../__tests__/fixtures';

configure({ asyncUtilTimeout: 5000 });
afterEach(cleanup);

const mount = (answer: ScriptedAnswer, busy = false) => {
  const onSend = vi.fn();
  renderWithProviders(<SlotPickBlock venueId="venue-1" busy={busy} onSend={onSend} />, {
    link: scriptedLink({ PartnersPodRequestVenueSlots: answer }),
  });
  return { onSend };
};

const sendButton = () => screen.getByRole('button', { name: 'Send Slot Request' }) as HTMLButtonElement;

/** Two courts: one slot on Court 1, two on Court 2 — all on the same day. */
const twoSpaces = {
  venueAvailableSlots: [
    venueSlot({ id: 'c1-a', space_label: 'Court 1' }),
    venueSlot({ id: 'c2-a', space_label: 'Court 2' }),
    venueSlot({ id: 'c2-b', space_label: 'Court 2', start_at: '2026-10-12T15:00:00.000Z', end_at: '2026-10-12T16:00:00.000Z' }),
  ],
};

describe('SlotPickBlock', () => {
  it('narrows the calendar to the first space when the venue rents out several', async () => {
    mount(twoSpaces);

    const space = await screen.findByRole('combobox', { name: 'Space' });
    expect(space.textContent).toBe('Court 1');
    expect(await screen.findByTestId('slot-tile-c1-a')).toBeTruthy();
    expect(screen.queryByTestId('slot-tile-c2-a')).toBeNull();
  });

  it('switching space shows that space and clears the pick made in the old one', async () => {
    const { onSend } = mount(twoSpaces);

    fireEvent.click(await screen.findByTestId('slot-tile-c1-a'));
    expect(sendButton().disabled).toBe(false);

    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Space' }));
    fireEvent.click(within(await screen.findByRole('listbox')).getByRole('option', { name: 'Court 2' }));

    expect(await screen.findByTestId('slot-tile-c2-a')).toBeTruthy();
    expect(screen.getByTestId('slot-tile-c2-b')).toBeTruthy();
    expect(screen.queryByTestId('slot-tile-c1-a')).toBeNull();
    expect(sendButton().disabled).toBe(true);

    fireEvent.click(screen.getByTestId('slot-tile-c2-b'));
    fireEvent.click(sendButton());
    expect(onSend).toHaveBeenCalledWith('c2-b');
  });

  it('offers no space picker when every slot is the whole venue', async () => {
    const { onSend } = mount({ venueAvailableSlots: [venueSlot({ id: 'w-1' }), venueSlot({ id: 'w-2', start_at: '2026-10-12T16:00:00.000Z', end_at: '2026-10-12T17:00:00.000Z' })] });

    expect(await screen.findByTestId('slot-tile-w-1')).toBeTruthy();
    expect(screen.getByTestId('slot-tile-w-2')).toBeTruthy();
    expect(screen.queryByRole('combobox', { name: 'Space' })).toBeNull();

    fireEvent.click(screen.getByTestId('slot-tile-w-1'));
    fireEvent.click(sendButton());
    expect(onSend).toHaveBeenCalledWith('w-1');
  });

  it('says so when the venue has no open slots and keeps Send disabled', async () => {
    mount({ venueAvailableSlots: [] });

    expect(await screen.findByText('This venue has no open slots right now.')).toBeTruthy();
    expect(sendButton().disabled).toBe(true);
  });

  it("shows the server's error instead of an empty calendar", async () => {
    mount(new Error('Venue not found'));

    expect(await screen.findByText('Venue not found')).toBeTruthy();
    expect(screen.queryByText('This venue has no open slots right now.')).toBeNull();
  });

  it('shows the calendar loading while the slots are fetched', () => {
    mount(STAY_PENDING);

    expect(screen.getByTestId('slot-calendar-loading')).toBeTruthy();
    expect(sendButton().disabled).toBe(true);
  });

  it('keeps Send disabled while another answer is in flight, even with a slot picked', async () => {
    const { onSend } = mount({ venueAvailableSlots: [venueSlot()] }, true);

    fireEvent.click(await screen.findByTestId('slot-tile-open-1'));

    await waitFor(() => expect(screen.getByTestId('slot-tile-open-1').getAttribute('aria-pressed')).toBe('true'));
    expect(sendButton().disabled).toBe(true);
    expect(onSend).not.toHaveBeenCalled();
  });
});
