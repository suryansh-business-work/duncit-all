import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import SlotDecisionPage from './SlotDecisionPage';
import { renderWithProviders } from '../../__tests__/render';
import { scriptedLink, type ScriptedAnswer, type SentOperation } from '../../__tests__/groupC-link';

afterEach(cleanup);

const slot = (over: Record<string, unknown> = {}) => ({
  __typename: 'VenueSlotDecision',
  slot_id: 's1',
  venue_id: 'v1',
  venue_name: 'Court House',
  start_at: '2026-08-02T10:00:00.000Z',
  end_at: '2026-08-02T12:00:00.000Z',
  whole_day: false,
  price: 1000,
  space_label: 'Court 2',
  requested_at: '2026-07-20T09:00:00.000Z',
  pod_id: 'pod1',
  pod_title: 'Sunday Badminton',
  pod_description: 'Doubles, all levels.',
  host_name: 'Asha Rao',
  host_email: 'asha@host.example.com',
  host_phone: '9000000001',
  decision: 'NONE',
  decided_at: null,
  decline_reason: '',
  venue_commission_pct: 10,
  venue_commission_amount: 100,
  venue_receives: 900,
  ...over,
});

const decision = (row: unknown) => ({ venueSlotDecision: row });

const mount = (answers: Record<string, ScriptedAnswer>, search = '', sent: SentOperation[] = []) =>
  renderWithProviders(<SlotDecisionPage />, {
    route: `/venues/requests/s1${search}`,
    path: '/venues/requests/:slotId',
    link: scriptedLink(answers, sent),
  });

const approved = slot({ decision: 'APPROVED', decided_at: '2026-07-21T10:00:00.000Z' });

describe('SlotDecisionPage states', () => {
  it('shows a spinner, then a pending request with the money the venue would earn', async () => {
    mount({ VenueSlotDecision: decision(slot()) });
    expect(screen.getByRole('progressbar')).toBeTruthy();
    expect(await screen.findByText('Sunday Badminton')).toBeTruthy();
    expect(screen.getByText('Awaiting your decision')).toBeTruthy();
    expect(screen.getByText('Court House · Court 2')).toBeTruthy();
    expect(screen.getByText('Hosted by Asha Rao')).toBeTruthy();
    // The hero figure and the take-home row both carry it.
    expect(screen.getAllByText('₹900.00')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Approve booking' })).toBeTruthy();
  });

  it('warns when the request cannot be found', async () => {
    mount({ VenueSlotDecision: decision(null) });
    expect(await screen.findByText('This booking request could not be found.')).toBeTruthy();
  });

  it('shows the load failure', async () => {
    mount({ VenueSlotDecision: new Error('Decision unavailable') });
    expect(await screen.findByText('Decision unavailable')).toBeTruthy();
  });

  it('shows an approved booking as confirmed, with no buttons left', async () => {
    mount({ VenueSlotDecision: decision(approved) });
    expect(await screen.findByText('Booking confirmed')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Approve booking' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Decline' })).toBeNull();
  });

  it('shows a declined booking with the reason the host was given and the earning passed on', async () => {
    mount({ VenueSlotDecision: decision(slot({ decision: 'DECLINED', decline_reason: 'Under renovation' })) });
    expect(await screen.findByText('Booking declined')).toBeTruthy();
    expect(screen.getByText(/Under renovation/)).toBeTruthy();
    expect(screen.getByText('Earning you passed on')).toBeTruthy();
  });

  it('goes to the list of all requests', async () => {
    mount({ VenueSlotDecision: decision(approved) });
    fireEvent.click(await screen.findByRole('button', { name: 'See all slot requests' }));
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/venues/requests'));
  });
});

describe('SlotDecisionPage approve', () => {
  it('approves from the button and reloads the outcome', async () => {
    const sent: SentOperation[] = [];
    mount({ VenueSlotDecision: decision(slot()), ApproveVenueSlotRequest: { approveVenueSlotRequest: { __typename: 'VenueSlot', id: 's1', status: 'BOOKED' } } }, '', sent);
    fireEvent.click(await screen.findByRole('button', { name: 'Approve booking' }));
    await waitFor(() => expect(sent.some((op) => op.name === 'ApproveVenueSlotRequest')).toBe(true));
    expect(sent.find((op) => op.name === 'ApproveVenueSlotRequest')?.variables).toEqual({ slot_id: 's1' });
    await waitFor(() => expect(sent.filter((op) => op.name === 'VenueSlotDecision').length).toBeGreaterThan(1));
  });

  it('approves on arrival, once, when the email button asked for it', async () => {
    const sent: SentOperation[] = [];
    mount({ VenueSlotDecision: decision(slot()), ApproveVenueSlotRequest: { approveVenueSlotRequest: { __typename: 'VenueSlot', id: 's1', status: 'BOOKED' } } }, '?action=approve', sent);
    await screen.findByText('Sunday Badminton');
    await waitFor(() => expect(sent.some((op) => op.name === 'ApproveVenueSlotRequest')).toBe(true));
    await waitFor(() => expect(sent.filter((op) => op.name === 'VenueSlotDecision').length).toBeGreaterThan(1));
    expect(sent.filter((op) => op.name === 'ApproveVenueSlotRequest')).toHaveLength(1);
  });

  it('does not approve on arrival once the request is already decided', async () => {
    const sent: SentOperation[] = [];
    mount({ VenueSlotDecision: decision(approved) }, '?action=approve', sent);
    await screen.findByText('Booking confirmed');
    expect(sent.some((op) => op.name === 'ApproveVenueSlotRequest')).toBe(false);
  });

  it('shows the refusal of an approval', async () => {
    mount({ VenueSlotDecision: decision(slot()), ApproveVenueSlotRequest: new Error('Slot was taken') });
    fireEvent.click(await screen.findByRole('button', { name: 'Approve booking' }));
    expect(await screen.findByText('Slot was taken')).toBeTruthy();
  });
});

describe('SlotDecisionPage decline', () => {
  it('needs a reason, then declines with it', async () => {
    const sent: SentOperation[] = [];
    mount({ VenueSlotDecision: decision(slot()), DeclineVenueSlotRequest: { declineVenueSlotRequest: { __typename: 'VenueSlot', id: 's1', status: 'AVAILABLE' } } }, '', sent);
    fireEvent.click(await screen.findByRole('button', { name: 'Decline' }));
    const submit = screen.getByRole('button', { name: 'Decline booking' }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);

    const reason = screen.getByTestId('slot-decline-reason').querySelector('textarea') as HTMLTextAreaElement;
    fireEvent.change(reason, { target: { value: '  Closed that day  ' } });
    expect(submit.disabled).toBe(false);
    fireEvent.click(submit);

    await waitFor(() => expect(sent.some((op) => op.name === 'DeclineVenueSlotRequest')).toBe(true));
    expect(sent.find((op) => op.name === 'DeclineVenueSlotRequest')?.variables).toEqual({ slot_id: 's1', reason: 'Closed that day' });
    await waitFor(() => expect(screen.queryByTestId('slot-decline-reason')).toBeNull());
  });

  it('opens the reason form on arrival from the email’s Decline button and can be put away', async () => {
    mount({ VenueSlotDecision: decision(slot()) }, '?action=decline');
    expect(await screen.findByTestId('slot-decline-reason')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Keep it pending' }));
    await waitFor(() => expect(screen.queryByTestId('slot-decline-reason')).toBeNull());
    expect(screen.getByRole('button', { name: 'Approve booking' })).toBeTruthy();
  });

  it('shows the refusal of a decline and keeps the form', async () => {
    mount({ VenueSlotDecision: decision(slot()), DeclineVenueSlotRequest: new Error('Already decided') }, '?action=decline');
    const reason = (await screen.findByTestId('slot-decline-reason')).querySelector('textarea') as HTMLTextAreaElement;
    fireEvent.change(reason, { target: { value: 'No' } });
    fireEvent.click(screen.getByRole('button', { name: 'Decline booking' }));
    expect(await screen.findByText('Already decided')).toBeTruthy();
    expect(screen.getByTestId('slot-decline-reason')).toBeTruthy();
  });
});
