import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import SlotRequestsPage from './SlotRequestsPage';
import { renderWithProviders } from '../../__tests__/render';
import { scriptedLink, type ScriptedAnswer, type SentOperation } from '../../__tests__/groupC-link';
import { myVenue } from '../../__tests__/venue-fixtures';
import { SELECTED_VENUE_KEY } from '../../components/venue/useSelectedVenue';

beforeEach(() => {
  globalThis.localStorage.clear();
});
afterEach(cleanup);

const request = (over: Record<string, unknown> = {}) => ({
  __typename: 'VenueSlotRequest',
  slot_id: 's1',
  venue_id: 'v1',
  venue_name: 'Court House',
  start_at: '2026-08-02T10:00:00.000Z',
  end_at: '2026-08-02T12:00:00.000Z',
  whole_day: false,
  price: 1500,
  requested_at: '2026-07-20T09:00:00.000Z',
  pod_id: 'pod1',
  pod_title: 'Sunday Badminton',
  pod_description: 'Doubles, all levels.',
  host_name: 'Asha Rao',
  host_email: 'asha@host.example.com',
  host_phone: '9000000001',
  ...over,
});

const mount = (answers: Record<string, ScriptedAnswer>, sent: SentOperation[] = []) =>
  renderWithProviders(<SlotRequestsPage />, {
    route: '/venues/requests',
    link: scriptedLink(
      { MyVenues: { myVenues: [myVenue('v1', 'Court House'), myVenue('v2', 'Arena')] }, ...answers },
      sent,
    ),
  });

const list = (rows: unknown[]) => ({ venueSlotRequests: rows });

describe('SlotRequestsPage list', () => {
  it('shows each pending request with the host’s contact and a link to the earnings view', async () => {
    mount({ VenueSlotRequests: list([request(), request({ slot_id: 's2', pod_title: 'Free Play', price: 0, host_email: '', host_phone: '', host_name: '' })]) });
    const first = within((await screen.findByText('Sunday Badminton')).closest('.MuiCard-root') as HTMLElement);
    expect(first.getByText('₹1,500')).toBeTruthy();
    expect(first.getByRole('link', { name: 'asha@host.example.com' }).getAttribute('href')).toBe('mailto:asha@host.example.com');
    expect(first.getByRole('link', { name: '9000000001' }).getAttribute('href')).toBe('tel:9000000001');
    expect(first.getByRole('link', { name: 'View earnings' }).getAttribute('href')).toBe('/venues/requests/s1');

    const free = within(screen.getByText('Free Play').closest('.MuiCard-root') as HTMLElement);
    expect(free.getByText('Free')).toBeTruthy();
  });

  it('says when nothing is waiting', async () => {
    mount({ VenueSlotRequests: list([]) });
    expect(await screen.findByText('No pending slot requests right now. New requests appear here the moment a host books one of your slots.')).toBeTruthy();
  });

  it('shows the load failure', async () => {
    mount({ VenueSlotRequests: new Error('Requests unavailable') });
    expect(await screen.findByText('Requests unavailable')).toBeTruthy();
  });

  it('asks for the remembered venue, and for every venue after choosing All', async () => {
    globalThis.localStorage.setItem(SELECTED_VENUE_KEY, 'v2');
    const sent: SentOperation[] = [];
    mount({ VenueSlotRequests: list([]) }, sent);
    await screen.findByText('No pending slot requests right now. New requests appear here the moment a host books one of your slots.');
    await waitFor(() => expect(sent.some((op) => op.name === 'VenueSlotRequests' && op.variables.venue_id === 'v2')).toBe(true));

    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(await screen.findByRole('option', { name: 'All venues' }));
    await waitFor(() => expect(sent.some((op) => op.name === 'VenueSlotRequests' && op.variables.venue_id === null)).toBe(true));
  });
});

describe('SlotRequestsPage decisions', () => {
  it('approves after a confirmation, says so and reloads the list', async () => {
    const sent: SentOperation[] = [];
    mount(
      { VenueSlotRequests: list([request()]), ApproveVenueSlotRequest: { approveVenueSlotRequest: { __typename: 'VenueSlot', id: 's1', status: 'BOOKED' } } },
      sent,
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Approve' }));
    expect(await screen.findByText('Approve this slot booking?')).toBeTruthy();
    const loads = sent.filter((op) => op.name === 'VenueSlotRequests').length;
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Approve booking' }));

    expect(await screen.findByText('Booking approved — the pod is now live.')).toBeTruthy();
    expect(sent.find((op) => op.name === 'ApproveVenueSlotRequest')?.variables).toEqual({ slot_id: 's1' });
    await waitFor(() => expect(sent.filter((op) => op.name === 'VenueSlotRequests').length).toBeGreaterThan(loads));
  });

  it('declines with a trimmed reason', async () => {
    const sent: SentOperation[] = [];
    mount(
      { VenueSlotRequests: list([request()]), DeclineVenueSlotRequest: { declineVenueSlotRequest: { __typename: 'VenueSlot', id: 's1', status: 'AVAILABLE' } } },
      sent,
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Decline' }));
    const dialog = within(await screen.findByRole('dialog'));
    fireEvent.change(dialog.getByLabelText('Reason (optional)'), { target: { value: '  Under renovation  ' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Decline booking' }));

    expect(await screen.findByText('Booking declined — the slot is open again.')).toBeTruthy();
    expect(sent.find((op) => op.name === 'DeclineVenueSlotRequest')?.variables).toEqual({ slot_id: 's1', reason: 'Under renovation' });
  });

  it('declines without a reason as null', async () => {
    const sent: SentOperation[] = [];
    mount(
      { VenueSlotRequests: list([request()]), DeclineVenueSlotRequest: { declineVenueSlotRequest: { __typename: 'VenueSlot', id: 's1', status: 'AVAILABLE' } } },
      sent,
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Decline' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Decline booking' }));
    await waitFor(() => expect(sent.some((op) => op.name === 'DeclineVenueSlotRequest')).toBe(true));
    expect(sent.find((op) => op.name === 'DeclineVenueSlotRequest')?.variables).toEqual({ slot_id: 's1', reason: null });
  });

  it('shows the server’s refusal and lets it be dismissed', async () => {
    mount({ VenueSlotRequests: list([request()]), ApproveVenueSlotRequest: new Error('Slot already booked') });
    fireEvent.click(await screen.findByRole('button', { name: 'Approve' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Approve booking' }));
    const alert = await screen.findByText('Slot already booked');
    expect(alert).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByText('Slot already booked')).toBeNull());
  });

  it('keeps the request when the approval is cancelled', async () => {
    const sent: SentOperation[] = [];
    mount({ VenueSlotRequests: list([request()]) }, sent);
    fireEvent.click(await screen.findByRole('button', { name: 'Approve' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(sent.some((op) => op.name === 'ApproveVenueSlotRequest')).toBe(false);
  });
});
