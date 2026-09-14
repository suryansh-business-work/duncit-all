import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { shellAutoPodLabels } from '@duncit/utils';
import {
  clubClaim,
  echoT,
  formatDateTime,
  hostClaim,
  makeDetailsRow,
  venueClaim,
} from '../../__tests__/fixtures';
import type { AutoPodAudienceCounts, AutoPodDetailsRow } from '../../queries';
import AutoPodEnrolmentRow from '../AutoPodEnrolmentRow';
import RoleEnrolmentCard, { type RoleEnrolmentCardProps } from '../RoleEnrolmentCard';

const labels = shellAutoPodLabels(echoT);
const VIEW = 'admin.autoPods.viewDetails';

const renderRow = (row: AutoPodDetailsRow, counts: AutoPodAudienceCounts | null) => {
  const onOpen = vi.fn();
  render(
    <AutoPodEnrolmentRow
      row={row}
      counts={counts}
      t={echoT}
      labels={labels}
      formatDateTime={formatDateTime}
      onOpen={onOpen}
    />,
  );
  return onOpen;
};

/** The card for one role, found by its title. */
const card = (title: string) => {
  const heading = screen.getByText(title);
  const root = heading.closest('.MuiCard-root');
  if (!(root instanceof HTMLElement)) throw new Error(`no card titled ${title}`);
  return within(root);
};

describe('AutoPodEnrolmentRow', () => {
  it('shows every place still open, with how many partners could fill each', () => {
    const onOpen = renderRow(makeDetailsRow(), { venue_count: 5, host_count: 3, club_admin_count: 0 });
    const venue = card('admin.autoPods.roleVenueTitle');
    expect(venue.getByText(labels.tickPending)).toBeInTheDocument();
    expect(venue.getByText('admin.autoPods.eligibleCount(5)')).toBeInTheDocument();
    expect(venue.getByText('admin.autoPods.eligibleHint')).toBeInTheDocument();
    expect(card('admin.autoPods.roleHostTitle').getByText('admin.autoPods.eligibleCount(3)')).toBeInTheDocument();
    expect(card('admin.autoPods.roleClubTitle').getByText('admin.autoPods.eligibleCount(0)')).toBeInTheDocument();
    expect(screen.queryByText(/admin\.autoPods\.enrolledAt/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: VIEW })).not.toBeInTheDocument();
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('names who took each place, when, and opens their details by role', () => {
    const onOpen = renderRow(
      makeDetailsRow({ venue_claim: venueClaim, host_claim: hostClaim, club_claim: clubClaim }),
      { venue_count: 5, host_count: 3, club_admin_count: 2 },
    );
    const venue = card('admin.autoPods.roleVenueTitle');
    const host = card('admin.autoPods.roleHostTitle');
    const club = card('admin.autoPods.roleClubTitle');
    expect(venue.getByText('Play Arena Koramangala')).toBeInTheDocument();
    expect(venue.getByText('admin.autoPods.enrolledAt: FMT<2026-09-10T06:30:00.000Z>')).toBeInTheDocument();
    expect(host.getByText('Asha Menon')).toBeInTheDocument();
    expect(host.getByText('admin.autoPods.enrolledAt: FMT<2026-09-11T08:00:00.000Z>')).toBeInTheDocument();
    expect(club.getByText('Bengaluru Badminton Club')).toBeInTheDocument();
    expect(club.getByText('admin.autoPods.enrolledAt: FMT<2026-09-12T10:15:00.000Z>')).toBeInTheDocument();

    fireEvent.click(venue.getByRole('button', { name: VIEW }));
    fireEvent.click(host.getByRole('button', { name: VIEW }));
    fireEvent.click(club.getByRole('button', { name: VIEW }));
    expect(onOpen.mock.calls).toEqual([['venue'], ['host'], ['club']]);
  });

  it('says a virtual offer needs no venue instead of counting venues', () => {
    renderRow(makeDetailsRow({ pod_mode: 'VIRTUAL' }), { venue_count: 5, host_count: 3, club_admin_count: 2 });
    const venue = card('admin.autoPods.roleVenueTitle');
    expect(venue.getByText('admin.autoPods.notNeededVirtual')).toBeInTheDocument();
    expect(venue.queryByText('admin.autoPods.eligibleCount(5)')).not.toBeInTheDocument();
    expect(venue.queryByText('admin.autoPods.eligibleHint')).not.toBeInTheDocument();
  });

  it('draws no count line while the audience is still being counted', () => {
    renderRow(makeDetailsRow(), null);
    expect(screen.queryByText(/admin\.autoPods\.eligibleCount/)).not.toBeInTheDocument();
    expect(screen.getAllByText('admin.autoPods.eligibleHint')).toHaveLength(3);
  });
});

describe('RoleEnrolmentCard', () => {
  const props: RoleEnrolmentCardProps = {
    title: 'Host',
    enrolledName: 'Asha Menon',
    enrolledAt: '',
    eligible: 4,
    eligibleLabel: (n) => `${n} eligible`,
    eligibleHint: 'Approved partners in this category who could enrol.',
    enrolledAtLabel: 'Enrolled',
    pendingLabel: 'Pending',
    openLabel: 'View details',
    icon: <span data-testid="role-icon" />,
  };

  it('offers no way into the partner when no opener is given, even once enrolled', () => {
    render(<RoleEnrolmentCard {...props} />);
    expect(screen.getByTestId('role-icon')).toBeInTheDocument();
    expect(screen.getByText('Asha Menon')).toBeInTheDocument();
    expect(screen.getByText('4 eligible')).toBeInTheDocument();
    expect(screen.queryByText(/Enrolled/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'View details' })).not.toBeInTheDocument();
  });
});
