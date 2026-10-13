import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import VenueAutoPodsPage from './VenueAutoPodsPage';
import { autoPod, clubClaim, hostClaim, mountQueue, venueClaim } from '../../components/auto-pods/__tests__/rows';
import type { ScriptedAnswer, SentOperation } from '../../__tests__/groupC-link';

afterEach(cleanup);

const QUEUE = 'VenueAutoPods';

const venue = (id: string, name: string, over: Record<string, unknown> = {}) => ({
  __typename: 'Venue',
  id,
  venue_name: name,
  status: 'APPROVED',
  is_active: true,
  location_id: 'loc1',
  city: 'Pune',
  capacity: 20,
  capacity_items: [],
  venue_category: {
    __typename: 'VenueCategory',
    sub_category_id: 'sub1',
    super_category_name: 'Sports',
    category_name: 'Racket',
    sub_category_name: 'Badminton',
  },
  ...over,
});

const venues = (list: unknown[]) => ({ myVenues: list });

const mount = (answers: Record<string, ScriptedAnswer>, sent: SentOperation[] = []) =>
  mountQueue(<VenueAutoPodsPage />, { MyVenuesForAutoPod: venues([venue('v1', 'Court House')]), ...answers }, sent);

const open = autoPod();
const enrolled = autoPod({ id: 'ap2', pod_title: 'Friday Football', viewer_claimed: true, venue_claim: venueClaim });

describe('VenueAutoPodsPage', () => {
  it('looks at the queue as the first approved venue and asks for that venue’s offers', async () => {
    const sent: SentOperation[] = [];
    mount({ [QUEUE]: { venueAutoPods: [open, enrolled] } }, sent);
    const waiting = within(await screen.findByTestId('auto-pod-section-actionable'));
    expect(waiting.getByText('Sunday Badminton')).toBeTruthy();
    expect(within(screen.getByTestId('auto-pod-section-mine')).getByText('Friday Football')).toBeTruthy();
    expect(screen.getByText(/Sports › Racket › Badminton/)).toBeTruthy();
    await waitFor(() =>
      expect(sent.some((op) => op.name === QUEUE && op.variables.venue_id === 'v1')).toBe(true),
    );
  });

  it('tells an owner with no approved venue so', async () => {
    mount({ MyVenuesForAutoPod: venues([venue('v2', 'Draft Hall', { status: 'DRAFT' })]), [QUEUE]: { venueAutoPods: [] } });
    expect(await screen.findByText(/venue/i, { selector: '[role="alert"], .MuiAlert-message' })).toBeTruthy();
    expect(screen.queryByTestId('auto-pod-venue-select')).toBeNull();
  });

  it('warns that a venue without a category is offered nothing', async () => {
    mount({ MyVenuesForAutoPod: venues([venue('v1', 'Court House', { venue_category: null })]), [QUEUE]: { venueAutoPods: [] } });
    await screen.findByTestId('auto-pod-venue-select');
    expect(await screen.findByText('This venue has no category yet — set one under Manage venue to be offered Auto Pods.')).toBeTruthy();
  });

  it('switches venue and reloads the offers for it', async () => {
    const sent: SentOperation[] = [];
    mount(
      { MyVenuesForAutoPod: venues([venue('v1', 'Court House'), venue('v2', 'Arena')]), [QUEUE]: { venueAutoPods: [open] } },
      sent,
    );
    fireEvent.mouseDown(within(await screen.findByTestId('auto-pod-venue-select')).getByRole('combobox'));
    fireEvent.click(await screen.findByTestId('auto-pod-venue-option-v2'));
    await waitFor(() => expect(sent.some((op) => op.name === QUEUE && op.variables.venue_id === 'v2')).toBe(true));
  });

  it('opens the accept dialog for an offer with the venue’s free slots', async () => {
    const sent: SentOperation[] = [];
    mount(
      {
        [QUEUE]: { venueAutoPods: [open] },
        AutoPodVenueSlots: { autoPodVenueSlots: { __typename: 'AutoPodVenueSlots', window_days: 7, expires_at: null, slots: [] } },
      },
      sent,
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Accept & pick a slot' }));
    expect(await screen.findByRole('dialog')).toBeTruthy();
    await waitFor(() => expect(sent.some((op) => op.name === 'AutoPodVenueSlots')).toBe(true));
    expect(sent.find((op) => op.name === 'AutoPodVenueSlots')?.variables).toEqual({ auto_pod_doc_id: 'ap1', venue_id: 'v1' });
  });

  it('shows the live state of an enrolled offer and no cancel once it is past enrolling', async () => {
    const live = autoPod({
      id: 'ap3',
      pod_title: 'Live Pod',
      stage: 'LIVE',
      viewer_claimed: true,
      venue_claim: venueClaim,
      host_claim: hostClaim,
      club_claim: clubClaim,
      pod_id: 'pod1',
    });
    mount({ [QUEUE]: { venueAutoPods: [live] } });
    const mine = within(await screen.findByTestId('auto-pod-section-mine'));
    expect(mine.getByText('Live', { selector: '.MuiChip-label' })).toBeTruthy();
    expect(mine.queryByTestId('auto-pod-withdraw')).toBeNull();
  });
});
