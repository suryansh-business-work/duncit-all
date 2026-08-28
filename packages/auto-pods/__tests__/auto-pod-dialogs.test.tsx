/**
 * The three enrolment dialogs — one per partner.
 *
 * Each is the moment a partner commits, and each commits something different:
 * the venue commits a real slot (accept and slot are ONE action, because an
 * acceptance with no slot leaves the offer half-claimed with nothing for a host
 * to see), the host commits themselves, and the club admin commits one of their
 * clubs. None of them may report success the server never gave, which is what
 * these hold: with nothing answering, no callback fires.
 */
import type { ReactNode } from 'react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { mwebAutoPodLabels, type AutoPodLocation, type AutoPodRow } from '@duncit/utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ClubClaimDialog } from '../src/club/ClubClaimDialog';
import { HostClaimDialog } from '../src/host/HostClaimDialog';
import { VenueAcceptDialog } from '../src/venue/VenueAcceptDialog';
import { enrolmentFailure } from '../src/failure-message';
import {
  CLUB_CLAIM_AUTO_POD,
  HOST_ASSIGN_AUTO_POD,
  MY_ADMIN_CLUBS_FOR_AUTO_POD,
  MY_VENUES_FOR_AUTO_POD,
  VENUE_ACCEPT_AUTO_POD,
  VENUE_AVAILABLE_SLOTS_FOR_AUTO_POD,
} from '../src/queries';

const t = (key: string) => key;
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
  bound_by: 'VENUE',
  bound_at: '2026-08-20T10:00:00.000Z',
};

const row = (over: Partial<AutoPodRow> = {}): AutoPodRow =>
  (({
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
    ...over
  }) as AutoPodRow);

const VENUE_CLAIM = {
  venue_id: 'v-1',
  venue_slot_id: 'slot-1',
  owner_user_id: 'owner-1',
  venue_name: 'Indiranagar Court',
  pod_date_time: '2026-09-01T10:00:00.000Z',
  pod_end_date_time: null,
  slot_price: 500,
  accepted_at: '2026-08-20T10:00:00.000Z',
};

const formatWhen = (iso: string) => `when:${iso}`;
const formatMoney = (amount: number) => `₹${amount}`;

const wrap = (ui: ReactNode, mocks: readonly MockedResponse[] = []) =>
  render(
    <MockedProvider mocks={[...mocks]}>
      <ThemeProvider theme={testTheme}>{ui}</ThemeProvider>
    </MockedProvider>
  );

const pressEverything = async () => {
  for (const control of [...document.body.querySelectorAll<HTMLElement>('button:not([disabled])')].slice(0, 15)) {
    if (!control.isConnected) continue;
    fireEvent.click(control);
    await settle();
  }
};

/** Pick an option out of a MUI select by its visible label. */
const choose = async (label: string, option: string) => {
  fireEvent.mouseDown(screen.getByLabelText(label));
  await settle();
  fireEvent.click(await screen.findByRole('option', { name: option }));
  await settle();
};

const press = async (name: string) => {
  fireEvent.click(screen.getByRole('button', { name }));
  await settle();
};

afterEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------- venue ----

const venuesMock = (
  venues: readonly Record<string, unknown>[],
): MockedResponse => ({
  request: { query: MY_VENUES_FOR_AUTO_POD },
  result: { data: { myVenues: venues } },
});

const venue = (over: Record<string, unknown> = {}) => ({
  __typename: 'Venue',
  id: 'v-1',
  venue_name: 'Indiranagar Court',
  status: 'APPROVED',
  is_active: true,
  location_id: 'loc-blr',
  city: 'Bengaluru',
  ...over,
});

const slotsMock = (
  slots: readonly Record<string, unknown>[],
  venueId = 'v-1',
): MockedResponse => ({
  request: { query: VENUE_AVAILABLE_SLOTS_FOR_AUTO_POD, variables: { venue_id: venueId } },
  result: { data: { venueAvailableSlots: slots } },
});

const slot = (over: Record<string, unknown> = {}) => ({
  __typename: 'VenueSlot',
  id: 'slot-1',
  start_at: '2026-09-01T10:00:00.000Z',
  end_at: '2026-09-01T12:00:00.000Z',
  whole_day: false,
  price: 250,
  space_label: 'Court 2',
  capacity: 12,
  ...over,
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
    wrap(<VenueAcceptDialog {...props} row={row()} open={false} />);

    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  });

  // Opened before its row has arrived: the frame is there, with nothing in it
  // claiming to be a pod.
  it('opens without a row rather than naming a pod it does not have', async () => {
    wrap(<VenueAcceptDialog {...props} row={null} open />);
    await settle();

    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
    expect(document.body.textContent).not.toContain('Weekly Badminton');
  });

  it('names the Auto Pod it is accepting', async () => {
    wrap(<VenueAcceptDialog {...props} row={row()} open />, [venuesMock([venue()])]);
    await settle();

    expect(document.body.textContent).toContain('Weekly Badminton');
  });

  it('preselects the only venue there is, and prices each slot through the caller formatter', async () => {
    wrap(<VenueAcceptDialog {...props} row={row()} open />, [
      venuesMock([venue()]),
      slotsMock([slot()]),
    ]);
    await settle();
    await settle();

    fireEvent.mouseDown(screen.getByLabelText(labels.pickSlot));
    await settle();

    const option = await screen.findByRole('option', { name: /Court 2/ });
    expect(option.textContent).toContain('₹250');
    expect(option.textContent).toContain('when:2026-09-01T10:00:00.000Z');
  });

  it('leaves a whole-day slot at its start, with no space label to append', async () => {
    wrap(<VenueAcceptDialog {...props} row={row()} open />, [
      venuesMock([venue()]),
      slotsMock([slot({ whole_day: true, space_label: '' })]),
    ]);
    await settle();
    await settle();

    fireEvent.mouseDown(screen.getByLabelText(labels.pickSlot));
    await settle();

    const option = await screen.findByRole('option', { name: /when:/ });
    expect(option.textContent).toBe('when:2026-09-01T10:00:00.000Z · ₹250');
  });

  it('offers only approved, active venues', async () => {
    wrap(<VenueAcceptDialog {...props} row={row()} open />, [
      venuesMock([
        venue(),
        venue({ id: 'v-2', venue_name: 'Pending Hall', status: 'PENDING' }),
        venue({ id: 'v-3', venue_name: 'Paused Hall', is_active: false }),
      ]),
      slotsMock([]),
    ]);
    await settle();
    await settle();

    fireEvent.mouseDown(screen.getByLabelText(labels.pickVenue));
    await settle();

    expect(screen.getByRole('option', { name: 'Indiranagar Court' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Pending Hall' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Paused Hall' })).not.toBeInTheDocument();
  });

  // A pinned offer only takes a venue from its own city — the server refuses
  // any other, so the picker never offers one.
  it('offers only venues in the city the offer is pinned to, and says so when there are none', async () => {
    wrap(<VenueAcceptDialog {...props} row={row({ location: BENGALURU })} open />, [
      venuesMock([venue({ id: 'v-9', venue_name: 'Chennai Court', location_id: 'loc-maa' })]),
    ]);
    await settle();
    await settle();

    expect(document.body.textContent).toContain(labels.pinnedTo('Bengaluru, Karnataka'));
    expect(document.body.textContent).toContain(labels.noVenueInCity('Bengaluru, Karnataka'));
  });

  it('sends a venue with no free slots where it can publish some', async () => {
    const onAddAvailability = vi.fn();
    wrap(<VenueAcceptDialog {...props} row={row()} open onAddAvailability={onAddAvailability} />, [
      venuesMock([venue()]),
      slotsMock([]),
    ]);
    await settle();
    await settle();

    expect(document.body.textContent).toContain(labels.noSlots);
    await press(labels.addAvailability);
    expect(onAddAvailability).toHaveBeenCalledTimes(1);
  });

  it('states there are no slots without offering a way out the surface did not give it', async () => {
    wrap(<VenueAcceptDialog {...props} row={row()} open />, [venuesMock([venue()]), slotsMock([])]);
    await settle();
    await settle();

    expect(document.body.textContent).toContain(labels.noSlots);
    expect(screen.queryByRole('button', { name: labels.addAvailability })).not.toBeInTheDocument();
  });

  it('clears a chosen slot when the owner switches to another venue', async () => {
    wrap(<VenueAcceptDialog {...props} row={row()} open />, [
      venuesMock([venue(), venue({ id: 'v-2', venue_name: 'Koramangala Court' })]),
      slotsMock([slot()]),
      slotsMock([slot({ id: 'slot-9', space_label: 'Court 9' })], 'v-2'),
    ]);
    await settle();

    await choose(labels.pickVenue, 'Indiranagar Court');
    await settle();
    await choose(labels.pickSlot, /Court 2/ as unknown as string);
    expect(screen.getByRole('button', { name: labels.acceptCta })).toBeEnabled();

    await choose(labels.pickVenue, 'Koramangala Court');

    expect(screen.getByRole('button', { name: labels.acceptCta })).toBeDisabled();
  });

  it('accepts the offer on the chosen slot and tells the caller, once', async () => {
    const onAccepted = vi.fn();
    const onClose = vi.fn();
    wrap(
      <VenueAcceptDialog {...props} onAccepted={onAccepted} onClose={onClose} row={row()} open />,
      [
        venuesMock([venue()]),
        slotsMock([slot()]),
        {
          request: {
            query: VENUE_ACCEPT_AUTO_POD,
            variables: { auto_pod_doc_id: 'ap-1', venue_id: 'v-1', slot_id: 'slot-1' },
          },
          result: { data: { venueAcceptAutoPod: null } },
        },
      ],
    );
    await settle();
    await settle();
    await choose(labels.pickSlot, /Court 2/ as unknown as string);

    await press(labels.acceptCta);

    expect(onAccepted).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows the server’s refusal and reports nothing when the slot was taken first', async () => {
    const onAccepted = vi.fn();
    wrap(<VenueAcceptDialog {...props} onAccepted={onAccepted} row={row()} open />, [
      venuesMock([venue()]),
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
    await choose(labels.pickSlot, /Court 2/ as unknown as string);

    await press(labels.acceptCta);

    expect(document.body.textContent).toContain('That slot has just been booked');
    expect(onAccepted).not.toHaveBeenCalled();
  });

  it('clears the last refusal when the dialog is dismissed', async () => {
    const onClose = vi.fn();
    wrap(<VenueAcceptDialog {...props} onClose={onClose} row={row()} open />, [
      venuesMock([venue()]),
      slotsMock([slot()]),
    ]);
    await settle();
    await settle();

    await press(labels.dismiss);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('never reports an acceptance the server did not confirm', async () => {
    const onAccepted = vi.fn();
    wrap(<VenueAcceptDialog {...props} onAccepted={onAccepted} row={row()} open />);
    await settle();
    await pressEverything();

    expect(onAccepted).not.toHaveBeenCalled();
  });
});

// ----------------------------------------------------------------- host ----

describe('HostClaimDialog', () => {
  // The host has a city selected, so an unpinned offer can take it from them.
  const props = {
    labels,
    onClose: vi.fn(),
    onAssigned: vi.fn(),
    formatWhen,
    formatMoney,
    locationId: 'loc-blr',
    locationLabel: 'Bengaluru, Karnataka',
  };

  const assignMock = (variables: Record<string, unknown>, over: Partial<MockedResponse> = {}) =>
    ({
      request: { query: HOST_ASSIGN_AUTO_POD, variables },
      result: { data: { hostAssignAutoPod: null } },
      ...over,
    }) as MockedResponse;

  it('renders nothing while it is closed', () => {
    wrap(<HostClaimDialog {...props} row={row()} open={false} />);

    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  });

  it('opens without a row rather than naming a pod it does not have', async () => {
    wrap(<HostClaimDialog {...props} row={null} open />);
    await settle();

    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
    expect(document.body.textContent).not.toContain('Weekly Badminton');
  });

  it('shows the host what this pod is worth to them before they commit', async () => {
    wrap(<HostClaimDialog {...props} row={row({ expected_host_earnings: 1400 })} open />);
    await settle();

    expect(document.body.textContent).toContain('Weekly Badminton');
    expect(document.body.textContent).toContain(labels.expectedEarnings('₹1400'));
  });

  it('opens on a pod whose earnings have not been worked out yet', async () => {
    wrap(<HostClaimDialog {...props} row={row({ expected_host_earnings: null })} open />);
    await settle();

    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
    expect(document.body.textContent).not.toContain(labels.expectedEarnings('₹1400'));
  });

  it('shows the date and place a venue has already fixed', async () => {
    wrap(<HostClaimDialog {...props} row={row({ venue_claim: VENUE_CLAIM })} open />);
    await settle();

    expect(document.body.textContent).toContain('Indiranagar Court');
    expect(document.body.textContent).toContain('when:2026-09-01T10:00:00.000Z');
  });

  // The offer takes its city FROM the host, so the host is told it will.
  it('warns that assigning will pin an unclaimed offer to the host’s city', async () => {
    wrap(<HostClaimDialog {...props} row={row()} open />);
    await settle();

    expect(document.body.textContent).toContain(labels.willPinTo('Bengaluru, Karnataka'));
  });

  it('names the city by its id when the surface passed no label for it', async () => {
    wrap(<HostClaimDialog {...props} locationLabel={undefined} row={row()} open />);
    await settle();

    expect(document.body.textContent).toContain(labels.willPinTo('loc-blr'));
  });

  it('states the city an already-pinned offer belongs to, and does not offer to re-pin it', async () => {
    wrap(<HostClaimDialog {...props} row={row({ location: BENGALURU })} open />);
    await settle();

    expect(document.body.textContent).toContain(labels.pinnedTo('Bengaluru, Karnataka'));
    expect(document.body.textContent).not.toContain(labels.willPinTo('Bengaluru, Karnataka'));
  });

  // Without a city there is nothing to pin the offer to, so the button is off
  // and the dialog says why rather than failing at the server.
  it('refuses to assign an unpinned offer until the host has picked a city', async () => {
    const onAssigned = vi.fn();
    wrap(<HostClaimDialog {...props} locationId="" onAssigned={onAssigned} row={row()} open />);
    await settle();

    expect(document.body.textContent).toContain(labels.pickLocationFirst);
    expect(screen.getByRole('button', { name: labels.assignMyselfCta })).toBeDisabled();
    expect(onAssigned).not.toHaveBeenCalled();
  });

  it('pins an unclaimed offer to the host’s city on assign', async () => {
    const onAssigned = vi.fn();
    wrap(<HostClaimDialog {...props} onAssigned={onAssigned} row={row()} open />, [
      assignMock({ auto_pod_doc_id: 'ap-1', location_id: 'loc-blr' }),
    ]);
    await settle();

    await press(labels.assignMyselfCta);

    expect(onAssigned).toHaveBeenCalledTimes(1);
  });

  it('sends no city for an offer that already has one', async () => {
    const onAssigned = vi.fn();
    wrap(<HostClaimDialog {...props} onAssigned={onAssigned} row={row({ location: BENGALURU })} open />, [
      assignMock({ auto_pod_doc_id: 'ap-1', location_id: null }),
    ]);
    await settle();

    await press(labels.assignMyselfCta);

    expect(onAssigned).toHaveBeenCalledTimes(1);
  });

  it('shows the server’s refusal and reports nothing when another host got there first', async () => {
    const onAssigned = vi.fn();
    wrap(<HostClaimDialog {...props} onAssigned={onAssigned} row={row()} open />, [
      assignMock({ auto_pod_doc_id: 'ap-1', location_id: 'loc-blr' }, {
        result: undefined,
        error: new Error('Another host has already taken this'),
      }),
    ]);
    await settle();

    await press(labels.assignMyselfCta);

    expect(document.body.textContent).toContain('Another host has already taken this');
    expect(onAssigned).not.toHaveBeenCalled();
  });

  it('closes on dismiss', async () => {
    const onClose = vi.fn();
    wrap(<HostClaimDialog {...props} onClose={onClose} row={row()} open />);
    await settle();

    await press(labels.dismiss);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('never reports an assignment the server did not confirm', async () => {
    const onAssigned = vi.fn();
    wrap(<HostClaimDialog {...props} onAssigned={onAssigned} row={row()} open />);
    await settle();
    await pressEverything();

    expect(onAssigned).not.toHaveBeenCalled();
  });
});

// ----------------------------------------------------------------- club ----

const clubsMock = (clubs: readonly Record<string, unknown>[]): MockedResponse => ({
  request: { query: MY_ADMIN_CLUBS_FOR_AUTO_POD },
  result: { data: { myAdminClubs: clubs } },
});

const club = (over: Record<string, unknown> = {}) => ({
  __typename: 'Club',
  id: 'club-1',
  club_name: 'Indiranagar Smashers',
  category_id: 'sub-1',
  location_id: 'loc-blr',
  ...over,
});

describe('ClubClaimDialog', () => {
  const props = { labels, onClose: vi.fn(), onClaimed: vi.fn(), formatWhen };

  it('renders nothing while it is closed', () => {
    wrap(<ClubClaimDialog {...props} row={row()} subCategoryId="sub-1" open={false} />);

    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  });

  it('opens without a row rather than naming a pod it does not have', async () => {
    wrap(<ClubClaimDialog {...props} row={null} subCategoryId="sub-1" open />);
    await settle();

    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
    expect(document.body.textContent).not.toContain('Weekly Badminton');
  });

  it('opens on the Auto Pod, narrowed to the clubs that carry its category', async () => {
    wrap(<ClubClaimDialog {...props} row={row()} subCategoryId="sub-1" open />, [
      clubsMock([club(), club({ id: 'club-2', club_name: 'Chess Circle', category_id: 'sub-9' })]),
    ]);
    await settle();
    await settle();

    expect(document.body.textContent).toContain('Weekly Badminton');
    fireEvent.mouseDown(screen.getByLabelText(labels.pickClub));
    await settle();
    expect(screen.getByRole('option', { name: 'Indiranagar Smashers' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Chess Circle' })).not.toBeInTheDocument();
  });

  it('offers every club when there is no category to narrow by', async () => {
    wrap(<ClubClaimDialog {...props} row={row()} subCategoryId={null} open />, [
      clubsMock([club(), club({ id: 'club-2', club_name: 'Chess Circle', category_id: 'sub-9' })]),
    ]);
    await settle();
    await settle();

    fireEvent.mouseDown(screen.getByLabelText(labels.pickClub));
    await settle();
    expect(screen.getByRole('option', { name: 'Chess Circle' })).toBeInTheDocument();
  });

  it('treats a club with no category at all as one that does not carry this one', async () => {
    wrap(<ClubClaimDialog {...props} row={row()} subCategoryId="sub-1" open />, [
      clubsMock([club({ id: 'club-3', club_name: 'Uncategorised', category_id: null })]),
    ]);
    await settle();
    await settle();

    fireEvent.mouseDown(screen.getByLabelText(labels.pickClub));
    await settle();
    expect(screen.queryByRole('option', { name: 'Uncategorised' })).not.toBeInTheDocument();
  });

  it('offers only clubs in the city the offer is pinned to, and says so when there are none', async () => {
    wrap(
      <ClubClaimDialog {...props} row={row({ location: BENGALURU })} subCategoryId="sub-1" open />,
      [clubsMock([club({ id: 'club-9', club_name: 'Chennai Club', location_id: 'loc-maa' })])],
    );
    await settle();
    await settle();

    expect(document.body.textContent).toContain(labels.pinnedTo('Bengaluru, Karnataka'));
    expect(document.body.textContent).toContain(labels.noClubInCity('Bengaluru, Karnataka'));
  });

  it('shows the date and place a venue has already fixed', async () => {
    wrap(
      <ClubClaimDialog {...props} row={row({ venue_claim: VENUE_CLAIM })} subCategoryId="sub-1" open />,
      [clubsMock([club()])],
    );
    await settle();

    expect(document.body.textContent).toContain('Indiranagar Court');
    expect(document.body.textContent).toContain('when:2026-09-01T10:00:00.000Z');
  });

  // One eligible club is not a choice.
  it('preselects the only eligible club and claims for it', async () => {
    const onClaimed = vi.fn();
    wrap(
      <ClubClaimDialog {...props} onClaimed={onClaimed} row={row()} subCategoryId="sub-1" open />,
      [
        clubsMock([club()]),
        {
          request: {
            query: CLUB_CLAIM_AUTO_POD,
            variables: { auto_pod_doc_id: 'ap-1', club_id: 'club-1' },
          },
          result: { data: { clubClaimAutoPod: null } },
        },
      ],
    );
    await settle();
    await settle();

    await press(labels.claimForClubCta);

    expect(onClaimed).toHaveBeenCalledTimes(1);
  });

  // Two eligible clubs IS a choice, so nothing is preselected and the admin
  // has to say which club the pod will belong to.
  it('claims for the club the admin picked when there is more than one', async () => {
    const onClaimed = vi.fn();
    wrap(
      <ClubClaimDialog {...props} onClaimed={onClaimed} row={row()} subCategoryId='sub-1' open />,
      [
        clubsMock([club(), club({ id: 'club-2', club_name: 'Koramangala Smashers' })]),
        {
          request: {
            query: CLUB_CLAIM_AUTO_POD,
            variables: { auto_pod_doc_id: 'ap-1', club_id: 'club-2' },
          },
          result: { data: { clubClaimAutoPod: null } },
        },
      ],
    );
    await settle();
    await settle();
    expect(screen.getByRole('button', { name: labels.claimForClubCta })).toBeDisabled();

    await choose(labels.pickClub, 'Koramangala Smashers');
    await press(labels.claimForClubCta);

    expect(onClaimed).toHaveBeenCalledTimes(1);
  });

  it('shows the server’s refusal and reports nothing when the offer was claimed first', async () => {
    const onClaimed = vi.fn();
    wrap(
      <ClubClaimDialog {...props} onClaimed={onClaimed} row={row()} subCategoryId="sub-1" open />,
      [
        clubsMock([club()]),
        {
          request: {
            query: CLUB_CLAIM_AUTO_POD,
            variables: { auto_pod_doc_id: 'ap-1', club_id: 'club-1' },
          },
          error: new Error('A club has already claimed this'),
        },
      ],
    );
    await settle();
    await settle();

    await press(labels.claimForClubCta);

    expect(document.body.textContent).toContain('A club has already claimed this');
    expect(onClaimed).not.toHaveBeenCalled();
  });

  it('closes on dismiss', async () => {
    const onClose = vi.fn();
    wrap(<ClubClaimDialog {...props} onClose={onClose} row={row()} subCategoryId="sub-1" open />, [
      clubsMock([club()]),
    ]);
    await settle();

    await press(labels.dismiss);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('never reports a claim the server did not confirm', async () => {
    const onClaimed = vi.fn();
    wrap(<ClubClaimDialog {...props} onClaimed={onClaimed} row={row()} subCategoryId="sub-1" open />);
    await settle();
    await pressEverything();

    expect(onClaimed).not.toHaveBeenCalled();
  });
});

// --------------------------------------------------------------- shared ----

describe('enrolmentFailure', () => {
  it('shows the sentence the server actually sent', () => {
    expect(enrolmentFailure(new Error('That slot has just been booked'), 'fallback')).toBe(
      'That slot has just been booked',
    );
  });

  it('falls back to the localised line when what was thrown says nothing', () => {
    expect(enrolmentFailure('boom', labels.claimedElsewhere)).toBe(labels.claimedElsewhere);
    expect(enrolmentFailure(null, labels.claimedElsewhere)).toBe(labels.claimedElsewhere);
    expect(enrolmentFailure({ message: 'not an Error' }, labels.claimedElsewhere)).toBe(
      labels.claimedElsewhere,
    );
  });
});

// A dialog opened before its row arrived still draws its buttons. Pressing one
// must do nothing at all rather than send a mutation with no Auto Pod behind it.
describe('an enrolment pressed before the row arrived', () => {
  it('sends no acceptance from the venue dialog', async () => {
    const onAccepted = vi.fn();
    wrap(
      <VenueAcceptDialog
        labels={labels}
        onClose={vi.fn()}
        onAccepted={onAccepted}
        formatWhen={formatWhen}
        formatMoney={formatMoney}
        row={null}
        open
      />,
      [venuesMock([venue()]), slotsMock([slot()])],
    );
    await settle();
    await settle();
    await choose(labels.pickSlot, /Court 2/ as unknown as string);

    await press(labels.acceptCta);

    expect(onAccepted).not.toHaveBeenCalled();
  });

  it('sends no assignment from the host dialog', async () => {
    const onAssigned = vi.fn();
    wrap(
      <HostClaimDialog
        labels={labels}
        onClose={vi.fn()}
        onAssigned={onAssigned}
        formatWhen={formatWhen}
        formatMoney={formatMoney}
        locationId="loc-blr"
        row={null}
        open
      />,
    );
    await settle();

    await press(labels.assignMyselfCta);

    expect(onAssigned).not.toHaveBeenCalled();
  });

  it('sends no claim from the club dialog', async () => {
    const onClaimed = vi.fn();
    wrap(
      <ClubClaimDialog
        labels={labels}
        onClose={vi.fn()}
        onClaimed={onClaimed}
        formatWhen={formatWhen}
        row={null}
        subCategoryId="sub-1"
        open
      />,
      [clubsMock([club()])],
    );
    await settle();
    await settle();

    await press(labels.claimForClubCta);

    expect(onClaimed).not.toHaveBeenCalled();
  });
});
