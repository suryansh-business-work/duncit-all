import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import { shellAutoPodLabels, type AutoPodRole } from '@duncit/utils';
import { renderWithProviders } from '../../../../../__tests__/testkit';
import {
  bengaluru,
  clubClaim,
  formatDateTime,
  hostClaim,
  makeAutoPodRow,
  venueClaim,
} from '../../__tests__/fixtures';
import {
  AUTO_POD_CLUB_DETAILS,
  AUTO_POD_HOST_DETAILS,
  AUTO_POD_VENUE_DETAILS,
  type AutoPodTableRow,
} from '../../queries';
import AutoPodEnrolledDialog from '../AutoPodEnrolledDialog';

const t = (key: string) => key;
const labels = shellAutoPodLabels(t);

const enrolledRow = makeAutoPodRow({
  venue_claim: venueClaim,
  host_claim: hostClaim,
  club_claim: clubClaim,
  location: bengaluru,
});

const renderDialog = (role: AutoPodRole, row: AutoPodTableRow, mocks: MockedResponse[] = []) => {
  const onClose = vi.fn();
  renderWithProviders(
    <AutoPodEnrolledDialog
      row={row}
      role={role}
      onClose={onClose}
      t={t}
      labels={labels}
      formatDateTime={formatDateTime}
    />,
    { mocks },
  );
  return { onClose, dialog: screen.getByRole('dialog') };
};

/** The value drawn beside a detail label, or null when the row is not drawn. */
const detailValue = (label: string) => {
  const labelNode = screen.queryByText(label);
  return labelNode?.nextElementSibling?.textContent ?? null;
};

describe('AutoPodEnrolledDialog / shell', () => {
  it('titles the dialog by role, tags it for the role and closes from the dismiss button', () => {
    const { onClose, dialog } = renderDialog('venue', makeAutoPodRow());
    expect(within(dialog).getByText('admin.autoPods.venueDetailsTitle')).toBeInTheDocument();
    expect(screen.getByTestId('auto-pod-venue-details')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: labels.dismiss }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('AutoPodEnrolledDialog / venue', () => {
  const venueMock = (venue: Record<string, unknown> | null): MockedResponse => ({
    request: { query: AUTO_POD_VENUE_DETAILS, variables: { venue_doc_id: 'ven-4821' } },
    result: { data: { venue } },
  });
  const venue = {
    __typename: 'Venue',
    id: 'ven-4821',
    venue_name: 'Play Arena Koramangala',
    owner_name: 'Ravi Kumar',
    owner_email: 'ravi@playarena.in',
    owner_phone: '+91 98450 12345',
    address_line1: '80 Feet Road',
    address_line2: '',
    locality: 'Koramangala',
    city: 'Bengaluru',
    state: 'Karnataka',
    capacity: 40,
  };

  it('spins while the venue loads, then reads back the owner, address, capacity and the slot', async () => {
    renderDialog('venue', enrolledRow, [venueMock(venue)]);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(await screen.findByText('Ravi Kumar')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.getByText('Play Arena Koramangala')).toBeInTheDocument();
    expect(detailValue('admin.autoPods.venueEmail')).toBe('ravi@playarena.in');
    expect(detailValue('admin.autoPods.venuePhone')).toBe('+91 98450 12345');
    expect(detailValue('admin.autoPods.venueAddress')).toBe('80 Feet Road, Koramangala, Bengaluru, Karnataka');
    expect(detailValue('admin.autoPods.venueCapacity')).toBe('40');
    expect(detailValue('admin.autoPods.venueSlot')).toBe(
      'FMT<2026-09-20T07:00:00.000Z> – FMT<2026-09-20T09:00:00.000Z>',
    );
    expect(detailValue('admin.autoPods.venueSlotPrice')).toBe('₹1,200');
    expect(detailValue('admin.autoPods.enrolledAt')).toBe('FMT<2026-09-10T06:30:00.000Z>');
  });

  it('draws no capacity line for an unset capacity and only the start of an open-ended slot', async () => {
    const row = makeAutoPodRow({ venue_claim: { ...venueClaim, pod_end_date_time: null } });
    renderDialog('venue', row, [venueMock({ ...venue, capacity: 0 })]);
    expect(await screen.findByText('Ravi Kumar')).toBeInTheDocument();
    expect(screen.queryByText('admin.autoPods.venueCapacity')).not.toBeInTheDocument();
    expect(detailValue('admin.autoPods.venueSlot')).toBe('FMT<2026-09-20T07:00:00.000Z>');
  });

  it('keeps the slot lines but draws no owner details when the venue no longer exists', async () => {
    renderDialog('venue', enrolledRow, [venueMock(null)]);
    expect(await screen.findByText('admin.autoPods.venueSlot')).toBeInTheDocument();
    await screen.findByText('admin.autoPods.venueSlotPrice');
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.queryByText('admin.autoPods.venueOwner')).not.toBeInTheDocument();
    expect(screen.queryByText('admin.autoPods.venueAddress')).not.toBeInTheDocument();
  });

  it('says the venue could not be loaded when the query fails', async () => {
    renderDialog('venue', enrolledRow, [
      {
        request: { query: AUTO_POD_VENUE_DETAILS, variables: { venue_doc_id: 'ven-4821' } },
        result: { errors: [new GraphQLError('Venue lookup failed')] },
      },
    ]);
    expect(await screen.findByText('admin.autoPods.venueDetailsFailed')).toBeInTheDocument();
  });

  it('reads nothing and draws no slot when the row carries no venue claim', () => {
    renderDialog('venue', makeAutoPodRow());
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.queryByText('admin.autoPods.venueSlot')).not.toBeInTheDocument();
    expect(screen.queryByText('admin.autoPods.venueSlotPrice')).not.toBeInTheDocument();
    expect(screen.queryByText('admin.autoPods.enrolledAt')).not.toBeInTheDocument();
  });
});

describe('AutoPodEnrolledDialog / host', () => {
  const hostMock = (hostByUser: Record<string, unknown> | null): MockedResponse => ({
    request: { query: AUTO_POD_HOST_DETAILS, variables: { user_id: 'usr-902' } },
    result: { data: { hostByUser } },
  });
  const host = {
    __typename: 'Host',
    id: 'host-12',
    full_name: 'Asha K. Menon',
    email: 'asha@duncit.com',
    phone: '+91 99000 11223',
    full_address: 'HSR Layout, Bengaluru',
  };

  it('names the host from their profile and reads back how to reach them', async () => {
    const { dialog } = renderDialog('host', enrolledRow, [hostMock(host)]);
    expect(within(dialog).getByText('admin.autoPods.hostDetailsTitle')).toBeInTheDocument();
    expect(screen.getByText('Asha Menon')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(await screen.findByText('Asha K. Menon')).toBeInTheDocument();
    expect(detailValue('admin.autoPods.detailEmail')).toBe('asha@duncit.com');
    expect(detailValue('admin.autoPods.detailPhone')).toBe('+91 99000 11223');
    expect(detailValue('admin.autoPods.detailAddress')).toBe('HSR Layout, Bengaluru');
    expect(detailValue('admin.autoPods.enrolledAt')).toBe('FMT<2026-09-11T08:00:00.000Z>');
  });

  it('falls back to the name on the claim when the profile has none, hiding blank contact lines', async () => {
    renderDialog('host', enrolledRow, [hostMock({ ...host, full_name: '', phone: '', full_address: '' })]);
    expect(await screen.findByText('admin.autoPods.detailEmail')).toBeInTheDocument();
    expect(screen.getByText('Asha Menon')).toBeInTheDocument();
    expect(screen.queryByText('admin.autoPods.detailPhone')).not.toBeInTheDocument();
    expect(screen.queryByText('admin.autoPods.detailAddress')).not.toBeInTheDocument();
  });

  it('keeps the claim name and enrolment date when the host profile is gone', async () => {
    renderDialog('host', enrolledRow, [hostMock(null)]);
    await screen.findByText('Asha Menon');
    await vi.waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument());
    expect(screen.queryByText('admin.autoPods.detailEmail')).not.toBeInTheDocument();
    expect(detailValue('admin.autoPods.enrolledAt')).toBe('FMT<2026-09-11T08:00:00.000Z>');
  });

  it('says the host could not be loaded when the query fails', async () => {
    renderDialog('host', enrolledRow, [
      {
        request: { query: AUTO_POD_HOST_DETAILS, variables: { user_id: 'usr-902' } },
        error: new Error('Network down'),
      },
    ]);
    expect(await screen.findByText('admin.autoPods.hostDetailsFailed')).toBeInTheDocument();
  });

  it('reads nothing when the row carries no host claim', () => {
    renderDialog('host', makeAutoPodRow());
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.queryByText('admin.autoPods.enrolledAt')).not.toBeInTheDocument();
  });
});

describe('AutoPodEnrolledDialog / club admin', () => {
  const admin = (id: string, name: string, over: Record<string, unknown> = {}) => ({
    __typename: 'ClubAdminBrief',
    id,
    name,
    email: `${id}@duncit.com`,
    phone: '+91 90000 00000',
    ...over,
  });
  const clubMock = (club: Record<string, unknown> | null): MockedResponse => ({
    request: { query: AUTO_POD_CLUB_DETAILS, variables: { club_doc_id: 'club-33' } },
    result: { data: { club } },
  });
  const club = (club_admins: unknown[]) => ({
    __typename: 'Club',
    id: 'club-33',
    club_name: 'BLR Badminton Collective',
    locality: 'Indiranagar',
    club_admins,
  });

  it('picks out the admin who claimed the offer, with the club and where it plays', async () => {
    const { dialog } = renderDialog('club', enrolledRow, [
      clubMock(club([admin('usr-111', 'Kiran Rao'), admin('usr-340', 'Meera Iyer')])),
    ]);
    expect(within(dialog).getByText('admin.autoPods.clubDetailsTitle')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(await screen.findByText('Meera Iyer')).toBeInTheDocument();
    expect(screen.queryByText('Kiran Rao')).not.toBeInTheDocument();
    expect(detailValue('admin.autoPods.detailEmail')).toBe('usr-340@duncit.com');
    expect(detailValue('admin.autoPods.detailPhone')).toBe('+91 90000 00000');
    expect(detailValue('admin.autoPods.clubLabel')).toBe('BLR Badminton Collective');
    expect(detailValue('admin.autoPods.detailAddress')).toBe('Indiranagar, Bengaluru');
    expect(detailValue('admin.autoPods.enrolledAt')).toBe('FMT<2026-09-12T10:15:00.000Z>');
  });

  it("falls back to the club's first admin when the claimer has left, hiding contacts not on file", async () => {
    renderDialog('club', makeAutoPodRow({ club_claim: clubClaim }), [
      clubMock(club([admin('usr-111', 'Kiran Rao', { email: null, phone: null })])),
    ]);
    expect(await screen.findByText('Kiran Rao')).toBeInTheDocument();
    expect(screen.queryByText('admin.autoPods.detailEmail')).not.toBeInTheDocument();
    expect(screen.queryByText('admin.autoPods.detailPhone')).not.toBeInTheDocument();
    expect(detailValue('admin.autoPods.detailAddress')).toBe('Indiranagar');
  });

  it('heads with the claimed club name when the claiming admin has no name on file', async () => {
    renderDialog('club', enrolledRow, [clubMock(club([admin('usr-340', '')]))]);
    expect(await screen.findByText('admin.autoPods.detailEmail')).toBeInTheDocument();
    expect(screen.getByText('Bengaluru Badminton Club')).toBeInTheDocument();
  });

  it('draws no contact lines when the club lists no admins at all', async () => {
    renderDialog('club', enrolledRow, [clubMock(club([]))]);
    expect(await screen.findByText('BLR Badminton Collective')).toBeInTheDocument();
    expect(screen.getByText('Bengaluru Badminton Club')).toBeInTheDocument();
    expect(screen.queryByText('admin.autoPods.detailEmail')).not.toBeInTheDocument();
  });

  it('reads the club name off the claim and the city off the offer when the club is gone', async () => {
    renderDialog('club', enrolledRow, [clubMock(null)]);
    await vi.waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument());
    expect(detailValue('admin.autoPods.clubLabel')).toBe('Bengaluru Badminton Club');
    expect(detailValue('admin.autoPods.detailAddress')).toBe('Bengaluru');
  });

  it('says the club could not be loaded when the query fails', async () => {
    renderDialog('club', enrolledRow, [
      {
        request: { query: AUTO_POD_CLUB_DETAILS, variables: { club_doc_id: 'club-33' } },
        result: { errors: [new GraphQLError('Club lookup failed')] },
      },
    ]);
    expect(await screen.findByText('admin.autoPods.clubDetailsFailed')).toBeInTheDocument();
  });

  it('reads nothing and draws no lines when the row carries no club claim', () => {
    renderDialog('club', makeAutoPodRow());
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.queryByText('admin.autoPods.clubLabel')).not.toBeInTheDocument();
    expect(screen.queryByText('admin.autoPods.detailAddress')).not.toBeInTheDocument();
    expect(screen.queryByText('admin.autoPods.enrolledAt')).not.toBeInTheDocument();
  });
});
