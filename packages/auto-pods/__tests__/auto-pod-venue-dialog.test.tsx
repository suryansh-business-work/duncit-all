/**
 * The venue's enrolment dialog.
 *
 * Accepting and committing a slot are ONE action (an acceptance with no slot
 * leaves the offer half-claimed with nothing for a host to see), the venue is
 * the one chosen at the top of the queue, and every slot the dialog offers
 * carries what the venue would be paid for it. It may never report success
 * the server never gave: with nothing answering, no callback fires.
 */
import type { ReactNode } from 'react';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { mwebAutoPodLabels, type AutoPodLocation, type AutoPodRow } from '@duncit/utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { VenueAcceptDialog, type AutoPodVenueSlot } from '../src/venue/VenueAcceptDialog';
import type { AutoPodVenueOption } from '../src/venue/AutoPodVenuePicker';
import { AUTO_POD_VENUE_SLOTS, VENUE_ACCEPT_AUTO_POD } from '../src/queries';

const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
  options?.vars ? `${key}:${JSON.stringify(options.vars)}` : key;
const labels = mwebAutoPodLabels(t);
const testTheme = createTheme();

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

const BENGALURU: AutoPodLocation = {
  location_id: 'loc-blr',
  location_name: 'Bengaluru',
  country: 'India',
  state: 'Karnataka',
  city: 'Bengaluru',
  bound_by: 'HOST',
  bound_at: '2026-08-20T10:00:00.000Z',
};

const row = (over: Partial<AutoPodRow> = {}): AutoPodRow =>
  ({
    id: 'ap-1',
    auto_pod_no: 'DUN-AP-001',
    stage: 'OPEN',
    pod_title: 'Weekly Badminton',
    pod_description: 'Doubles, all levels.',
    pod_images_and_videos: [],
    sub_category_id: 'sub-1',
    category_name: 'Badminton',
    pod_amount: 250,
    no_of_spots: 8,
    venue_claim: null,
    host_claim: null,
    club_claim: null,
    location: null,
    viewer_claimed: false,
    pod_id: null,
    expected_host_earnings: 1400,
    ...over,
  }) as AutoPodRow;

const venue = (over: Partial<AutoPodVenueOption> = {}): AutoPodVenueOption => ({
  id: 'v-1',
  venue_name: 'Indiranagar Court',
  status: 'APPROVED',
  is_active: true,
  location_id: 'loc-blr',
  city: 'Bengaluru',
  venue_category: null,
  ...over,
});

const slot = (over: Partial<AutoPodVenueSlot> & Record<string, unknown> = {}) => ({
  __typename: 'AutoPodVenueSlot',
  id: 'slot-1',
  start_at: '2026-09-01T10:00:00.000Z',
  end_at: '2026-09-01T12:00:00.000Z',
  whole_day: false,
  space_label: 'Court 2',
  capacity: 12,
  price: 250,
  venue_receives: 225,
  venue_commission_pct: 10,
  host_receives: 900,
  viable: true,
  ...over,
});

const slotsMock = (slots: readonly Record<string, unknown>[], windowDays = 7): MockedResponse => ({
  request: { query: AUTO_POD_VENUE_SLOTS, variables: { auto_pod_doc_id: 'ap-1', venue_id: 'v-1' } },
  result: {
    data: {
      autoPodVenueSlots: {
        __typename: 'AutoPodVenueSlots',
        window_days: windowDays,
        expires_at: '2026-09-03T10:00:00.000Z',
        slots,
      },
    },
  },
});

const formatWhen = (iso: string) => `when:${iso}`;
const formatMoney = (amount: number) => `₹${amount}`;

const wrap = (ui: ReactNode, mocks: readonly MockedResponse[] = []) =>
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[...mocks]}>
      <ThemeProvider theme={testTheme}>{ui}</ThemeProvider>
    </MockedProvider>,
  );

/** Pick an option out of a MUI select by its visible label. */
const choose = async (label: string, option: string | RegExp) => {
  fireEvent.mouseDown(screen.getByLabelText(label));
  await settle();
  fireEvent.click(await screen.findByRole('option', { name: option }));
  await settle();
};

const press = async (name: string) => {
  fireEvent.click(screen.getByRole('button', { name }));
  await settle();
};

const pressEverything = async () => {
  for (const control of [...document.body.querySelectorAll<HTMLElement>('button:not([disabled])')].slice(0, 15)) {
    if (!control.isConnected) continue;
    fireEvent.click(control);
    await settle();
  }
};

afterEach(() => {
  vi.clearAllMocks();
});

describe('VenueAcceptDialog', () => {
  const props = {
    labels,
    onClose: vi.fn(),
    onAccepted: vi.fn(),
    formatWhen,
    formatMoney,
  };

  it('renders nothing at all while it is closed', () => {
    wrap(<VenueAcceptDialog {...props} row={row()} venue={venue()} open={false} />);
    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  });

  it('opens without a row rather than naming a pod it does not have', async () => {
    wrap(<VenueAcceptDialog {...props} row={null} venue={venue()} open />);
    await settle();
    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
    expect(document.body.textContent).not.toContain('Weekly Badminton');
  });

  it('asks for a venue when none was picked at the top, and offers no slots', async () => {
    wrap(<VenueAcceptDialog {...props} row={row()} venue={null} open />);
    await settle();
    expect(document.body.textContent).toContain(labels.pickVenueFirst);
    expect(screen.getByRole('button', { name: labels.acceptCta })).toBeDisabled();
  });

  it('names the pod and the venue, lists its slots nearest first with the window, and prices the chosen one', async () => {
    wrap(<VenueAcceptDialog {...props} row={row()} venue={venue()} open />, [
      slotsMock([slot(), slot({ id: 'slot-2', start_at: '2026-09-02T10:00:00.000Z', space_label: 'Court 5', price: 400, venue_receives: 360 })]),
    ]);
    await settle();
    await settle();

    expect(document.body.textContent).toContain('Weekly Badminton');
    expect(document.body.textContent).toContain(labels.acceptingWith('Indiranagar Court'));
    expect(document.body.textContent).toContain(labels.slotWindow(7));
    expect(screen.getByRole('button', { name: labels.acceptCta })).toBeDisabled();

    fireEvent.mouseDown(screen.getByLabelText(labels.pickSlot));
    await settle();
    const options = await screen.findAllByRole('option');
    expect(options[0].textContent).toBe('when:2026-09-01T10:00:00.000Z · Court 2 · ₹250');
    expect(options[1].textContent).toBe('when:2026-09-02T10:00:00.000Z · Court 5 · ₹400');
    fireEvent.click(options[1]);
    await settle();

    expect(screen.getByTestId('auto-pod-slot-earning')).toHaveTextContent(labels.potentialEarning('₹360'));
    expect(screen.getByRole('button', { name: labels.acceptCta })).toBeEnabled();
  });

  it('labels a slot with no space by its time and price alone', async () => {
    wrap(<VenueAcceptDialog {...props} row={row()} venue={venue()} open />, [slotsMock([slot({ space_label: '' })])]);
    await settle();
    await settle();
    fireEvent.mouseDown(screen.getByLabelText(labels.pickSlot));
    await settle();
    const option = await screen.findByRole('option', { name: /when:/ });
    expect(option.textContent).toBe('when:2026-09-01T10:00:00.000Z · ₹250');
  });

  it('says why a slot the pod cannot cover is not acceptable, and keeps the button shut', async () => {
    wrap(<VenueAcceptDialog {...props} row={row()} venue={venue()} open />, [
      slotsMock([slot({ viable: false, host_receives: -50 })]),
    ]);
    await settle();
    await settle();
    await choose(labels.pickSlot, /Court 2/);
    expect(document.body.textContent).toContain(labels.slotNotViable);
    expect(screen.queryByTestId('auto-pod-slot-earning')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: labels.acceptCta })).toBeDisabled();
  });

  // A pinned offer only takes a venue from its own city — the server refuses
  // any other, so the dialog says so and never asks for slots.
  it('refuses a venue outside the city the offer is pinned to', async () => {
    wrap(
      <VenueAcceptDialog
        {...props}
        row={row({ location: BENGALURU })}
        venue={venue({ id: 'v-9', venue_name: 'Chennai Court', location_id: 'loc-maa' })}
        open
      />,
    );
    await settle();
    await settle();
    expect(document.body.textContent).toContain(labels.pinnedTo('Bengaluru, Karnataka'));
    expect(document.body.textContent).toContain(labels.noVenueInCity('Bengaluru, Karnataka'));
    expect(screen.getByRole('button', { name: labels.acceptCta })).toBeDisabled();
  });

  it('sends a venue with no free slots in the window where it can publish some', async () => {
    const onAddAvailability = vi.fn();
    wrap(<VenueAcceptDialog {...props} row={row()} venue={venue()} open onAddAvailability={onAddAvailability} />, [
      slotsMock([]),
    ]);
    await settle();
    await settle();
    expect(document.body.textContent).toContain(labels.noSlots);
    await press(labels.addAvailability);
    expect(onAddAvailability).toHaveBeenCalledTimes(1);
  });

  it('states there are no slots without offering a way out the surface did not give it', async () => {
    wrap(<VenueAcceptDialog {...props} row={row()} venue={venue()} open />, [slotsMock([])]);
    await settle();
    await settle();
    expect(document.body.textContent).toContain(labels.noSlots);
    expect(screen.queryByRole('button', { name: labels.addAvailability })).not.toBeInTheDocument();
  });

  it('forgets the chosen slot when the venue at the top changes', async () => {
    const { rerender } = wrap(<VenueAcceptDialog {...props} row={row()} venue={venue()} open />, [
      slotsMock([slot()]),
    ]);
    await settle();
    await settle();
    await choose(labels.pickSlot, /Court 2/);
    expect(screen.getByRole('button', { name: labels.acceptCta })).toBeEnabled();

    rerender(
      <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[]}>
        <ThemeProvider theme={testTheme}>
          <VenueAcceptDialog {...props} row={row()} venue={venue({ id: 'v-2', venue_name: 'Koramangala Court' })} open />
        </ThemeProvider>
      </MockedProvider>,
    );
    await settle();
    expect(screen.getByRole('button', { name: labels.acceptCta })).toBeDisabled();
  });

  it('accepts the offer on the chosen slot and tells the caller, once', async () => {
    const onAccepted = vi.fn();
    const onClose = vi.fn();
    wrap(<VenueAcceptDialog {...props} onAccepted={onAccepted} onClose={onClose} row={row()} venue={venue()} open />, [
      slotsMock([slot()]),
      {
        request: {
          query: VENUE_ACCEPT_AUTO_POD,
          variables: { auto_pod_doc_id: 'ap-1', venue_id: 'v-1', slot_id: 'slot-1' },
        },
        result: { data: { venueAcceptAutoPod: null } },
      },
    ]);
    await settle();
    await settle();
    await choose(labels.pickSlot, /Court 2/);
    await press(labels.acceptCta);
    expect(onAccepted).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows the server’s refusal and reports nothing when the slot was taken first', async () => {
    const onAccepted = vi.fn();
    wrap(<VenueAcceptDialog {...props} onAccepted={onAccepted} row={row()} venue={venue()} open />, [
      slotsMock([slot()]),
      {
        request: {
          query: VENUE_ACCEPT_AUTO_POD,
          variables: { auto_pod_doc_id: 'ap-1', venue_id: 'v-1', slot_id: 'slot-1' },
        },
        error: new Error('That slot has just been booked'),
      },
    ]);
    await settle();
    await settle();
    await choose(labels.pickSlot, /Court 2/);
    await press(labels.acceptCta);
    expect(document.body.textContent).toContain('That slot has just been booked');
    expect(onAccepted).not.toHaveBeenCalled();
  });

  it('clears the last refusal when the dialog is dismissed', async () => {
    const onClose = vi.fn();
    wrap(<VenueAcceptDialog {...props} onClose={onClose} row={row()} venue={venue()} open />, [slotsMock([slot()])]);
    await settle();
    await settle();
    await press(labels.dismiss);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('never reports an acceptance the server did not confirm', async () => {
    const onAccepted = vi.fn();
    wrap(<VenueAcceptDialog {...props} onAccepted={onAccepted} row={row()} venue={venue()} open />);
    await settle();
    await pressEverything();
    expect(onAccepted).not.toHaveBeenCalled();
  });
});
