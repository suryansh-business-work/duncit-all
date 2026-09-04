/**
 * The three enrolment dialogs — one per partner.
 *
 * Each is the moment a partner commits, and each commits something different:
 * the host commits themselves plus the pod's price and spots, and the club
 * admin commits one of their clubs
 * (the venue's dialog, which commits a real slot, is proven in
 * auto-pod-venue-dialog.test.tsx). None of them may report success the server
 * never gave, which is what these hold: with nothing answering, no callback
 * fires.
 */
import type { ReactNode } from 'react';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { mwebAutoPodLabels, type AutoPodLocation, type AutoPodRow } from '@duncit/utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ClubClaimDialog } from '../src/club/ClubClaimDialog';
import { HostClaimDialog } from '../src/host/HostClaimDialog';
import { enrolmentFailure } from '../src/failure-message';
import {
  AUTO_POD_HOST_PROJECTION,
  CLUB_CLAIM_AUTO_POD,
  HOST_ASSIGN_AUTO_POD,
  MY_ADMIN_CLUBS_FOR_AUTO_POD,
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
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[...mocks]}>
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
      request: {
        query: HOST_ASSIGN_AUTO_POD,
        variables: { auto_pod_doc_id: 'ap-1', location_id: 'loc-blr', pod_amount: 250, no_of_spots: 8, ...variables },
      },
      result: { data: { hostAssignAutoPod: null } },
      ...over,
    }) as MockedResponse;

  /** The server's pricing of the numbers typed — re-read on every change, so reusable. */
  const projectionMock = (
    variables: Record<string, unknown> = {},
    over: Record<string, unknown> = {},
  ): MockedResponse => ({
    request: {
      query: AUTO_POD_HOST_PROJECTION,
      variables: { auto_pod_doc_id: 'ap-1', pod_amount: 250, no_of_spots: 8, ...variables },
    },
    maxUsageCount: Number.POSITIVE_INFINITY,
    result: {
      data: {
        autoPodHostProjection: {
          __typename: 'AutoPodHostProjection',
          min_spots: 2,
          max_spots: 20,
          pod_amount: 250,
          no_of_spots: 8,
          total_collection: 1750,
          gst_amount: 267,
          platform_fee_amount: 88,
          venue_amount: 500,
          club_admin_amount: 100,
          host_receives: 1400,
          viable: true,
          ...over,
        },
      },
    },
  });

  const typeSpots = async (value: string) => {
    fireEvent.change(screen.getByLabelText(labels.spotsField), { target: { value } });
    await settle();
    await settle();
  };

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

  // The template's numbers are the starting point, priced by the server the
  // moment the dialog opens: what the host keeps, then what everyone else takes.
  it('prices the template’s numbers and shows the host what they would keep', async () => {
    wrap(<HostClaimDialog {...props} row={row()} open />, [projectionMock()]);
    await settle();
    await settle();

    expect(document.body.textContent).toContain('Weekly Badminton');
    expect(screen.getByLabelText(labels.earningsAddPrice)).toHaveValue(250);
    expect(screen.getByLabelText(labels.spotsField)).toHaveValue('8');
    // The venue's booked space is the ceiling, stated before the host drags to it.
    expect(document.body.textContent).toContain(labels.earningsTotalSpots(20));
    expect(document.body.textContent).toContain(labels.projectionHost('₹1400'));
    expect(document.body.textContent).toContain(labels.projectionVenue('₹500'));
    expect(document.body.textContent).toContain(labels.projectionClub('₹100'));
    expect(document.body.textContent).toContain(labels.projectionFees('₹355'));
    expect(document.body.textContent).toContain(labels.spotsRange(2, 20));
  });

  it('says when the numbers would be refused, and keeps the button shut', async () => {
    wrap(<HostClaimDialog {...props} row={row()} open />, [projectionMock({}, { viable: false, host_receives: 0 })]);
    await settle();
    await settle();

    expect(document.body.textContent).toContain(labels.projectionNotViable);
    expect(screen.getByRole('button', { name: labels.assignMyselfCta })).toBeDisabled();
  });

  it('keeps the button shut until the server has priced the pod', async () => {
    wrap(<HostClaimDialog {...props} row={row()} open />);
    await settle();

    expect(screen.getByRole('button', { name: labels.assignMyselfCta })).toBeDisabled();
  });

  // The venue's capacity is the ceiling: the slider is drawn between the
  // server's own bounds, and a seeded count above them keeps the button shut
  // until the host drags back inside, whatever the money says.
  it('bounds the spots slider by the limits the server sent, and shuts the button outside them', async () => {
    wrap(<HostClaimDialog {...props} row={row()} open />, [
      projectionMock({}, { min_spots: 4, max_spots: 6, viable: true }),
    ]);
    await settle();
    await settle();

    const slider = screen.getByLabelText(labels.spotsField);
    expect(document.body.textContent).toContain(labels.spotsRange(4, 6));
    expect(slider).toHaveAttribute('min', '4');
    expect(slider).toHaveAttribute('max', '6');
    // The row seeded 8, which is past the ceiling the venue imposes.
    expect(screen.getByRole('button', { name: labels.assignMyselfCta })).toBeDisabled();
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
    wrap(<HostClaimDialog {...props} locationId="" onAssigned={onAssigned} row={row()} open />, [
      projectionMock(),
    ]);
    await settle();
    await settle();

    expect(document.body.textContent).toContain(labels.pickLocationFirst);
    expect(screen.getByRole('button', { name: labels.assignMyselfCta })).toBeDisabled();
    expect(onAssigned).not.toHaveBeenCalled();
  });

  it('assigns with the host’s numbers, pinning an unclaimed offer to their city', async () => {
    const onAssigned = vi.fn();
    wrap(<HostClaimDialog {...props} onAssigned={onAssigned} row={row()} open />, [
      projectionMock(),
      assignMock({}),
    ]);
    await settle();
    await settle();

    await press(labels.assignMyselfCta);

    expect(onAssigned).toHaveBeenCalledTimes(1);
  });

  // A cleared price is nothing to price — the calculator says so in words and
  // the button waits for a real number. (The spots cannot be cleared: they are
  // a slider between the server's own bounds.)
  it('prices nothing while the price is cleared, then re-prices the one typed', async () => {
    wrap(<HostClaimDialog {...props} row={row()} open />, [
      projectionMock(),
      projectionMock({ pod_amount: 300 }, { pod_amount: 300, host_receives: 1700 }),
    ]);
    await settle();
    await settle();

    fireEvent.change(screen.getByLabelText(labels.earningsAddPrice), { target: { value: '' } });
    await settle();
    expect(document.body.textContent).toContain(labels.earningsEnterPrice);
    expect(screen.getByRole('button', { name: labels.assignMyselfCta })).toBeDisabled();

    fireEvent.change(screen.getByLabelText(labels.earningsAddPrice), { target: { value: '300' } });
    await typeSpots('8');

    expect(document.body.textContent).toContain(labels.projectionHost('₹1700'));
  });

  // A price field holding something that is not a positive number is the one
  // thing the calculator can say is wrong without asking the server.
  it('names a non-positive ticket price on the field itself', async () => {
    wrap(<HostClaimDialog {...props} row={row()} open />, [projectionMock()]);
    await settle();
    await settle();

    fireEvent.change(screen.getByLabelText(labels.earningsAddPrice), { target: { value: '0' } });
    await settle();

    expect(document.body.textContent).toContain(labels.earningsPricePositive);
    expect(screen.getByRole('button', { name: labels.assignMyselfCta })).toBeDisabled();
  });

  it('re-prices as the host edits, and sends the numbers they typed', async () => {
    const onAssigned = vi.fn();
    wrap(<HostClaimDialog {...props} onAssigned={onAssigned} row={row()} open />, [
      projectionMock(),
      projectionMock({ no_of_spots: 10 }, { no_of_spots: 10, host_receives: 1800 }),
      assignMock({ no_of_spots: 10 }),
    ]);
    await settle();
    await settle();

    await typeSpots('10');

    expect(document.body.textContent).toContain(labels.projectionHost('₹1800'));
    await press(labels.assignMyselfCta);

    expect(onAssigned).toHaveBeenCalledTimes(1);
  });

  it('sends no city for an offer that already has one', async () => {
    const onAssigned = vi.fn();
    wrap(<HostClaimDialog {...props} onAssigned={onAssigned} row={row({ location: BENGALURU })} open />, [
      projectionMock(),
      assignMock({ location_id: null }),
    ]);
    await settle();
    await settle();

    await press(labels.assignMyselfCta);

    expect(onAssigned).toHaveBeenCalledTimes(1);
  });

  it('shows the server’s refusal and reports nothing when another host got there first', async () => {
    const onAssigned = vi.fn();
    wrap(<HostClaimDialog {...props} onAssigned={onAssigned} row={row()} open />, [
      projectionMock(),
      assignMock({}, { result: undefined, error: new Error('Another host has already taken this') }),
    ]);
    await settle();
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
