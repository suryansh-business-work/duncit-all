import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { Route } from 'react-router';
import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import { renderWithProviders } from '../../testkit';
import { clubAdminRecord } from '../../fixtures';
import { CLUB_ADMIN_DETAIL } from '../../../src/club-admins/queries';
import ClubAdminDetailsPage from '../../../src/club-admins/detail/ClubAdminDetailsPage';

const tables = vi.hoisted(() => ({ fetchers: new Map<string, ReturnType<typeof vi.fn>>() }));
vi.mock('@duncit/table', async () => {
  const { TableStandIn } = await import('../../../src/hosts/__tests__/table-stand-in');
  return {
    DuncitTable: TableStandIn,
    useApolloTableFetch: (_client: unknown, _document: unknown, resultKey: string) =>
      tables.fetchers.get(resultKey),
  };
});

const ADMIN_ID = clubAdminRecord.id;

const payload = (over: Record<string, unknown> = {}) => ({
  __typename: 'ClubAdminProfile',
  ...clubAdminRecord,
  assigned_clubs: clubAdminRecord.assigned_clubs.map((club) => ({
    __typename: 'ClubAdminAssignedClub',
    ...club,
  })),
  ...over,
});

const detailMock = (admin: ReturnType<typeof payload> | null): MockedResponse => ({
  request: { query: CLUB_ADMIN_DETAIL, variables: { id: ADMIN_ID } },
  result: { data: { clubAdminProfile: admin } },
});

function renderPage(mocks: MockedResponse[], backTo?: string) {
  return renderWithProviders(<></>, {
    mocks,
    initialEntries: [`/club-admins/${ADMIN_ID}`],
    routes: (
      <Route path="/club-admins/:clubAdminId" element={<ClubAdminDetailsPage backTo={backTo} />} />
    ),
  });
}

beforeEach(() => {
  tables.fetchers.clear();
  tables.fetchers.set('entityChangeLogsTable', vi.fn().mockResolvedValue({ rows: [], total: 0 }));
});

describe('ClubAdminDetailsPage', () => {
  it('spins while loading, then heads the page with the admin, their status and live state', async () => {
    renderPage([detailMock(payload())]);

    expect(screen.getByRole('status', { name: 'Loading…' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Kabir Sethi' })).toBeInTheDocument();
    expect(screen.getByText('Club Admin')).toBeInTheDocument();
    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText('Live')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/club-admins');
    expect(screen.getByRole('link', { name: 'Edit club admin' })).toHaveAttribute(
      'href',
      `/club-admins/${ADMIN_ID}/edit`,
    );
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
  });

  it('reads the contact, taxonomy, clubs and onboarding trail on the Overview tab', async () => {
    renderPage([detailMock(payload())]);
    await screen.findByRole('heading', { name: 'Kabir Sethi' });

    expect(screen.getByText('kabir.sethi@example.com')).toBeInTheDocument();
    expect(screen.getByText('9711203344')).toBeInTheDocument();
    expect(screen.getByText('Social › Board Games › Catan Night')).toBeInTheDocument();
    expect(screen.getByText('Delhi Board Gamers')).toBeInTheDocument();
    expect(screen.getByText('Gurgaon Catan Club')).toBeInTheDocument();
    expect(screen.getByText('MEET-000455')).toBeInTheDocument();
    expect(screen.getByText('15%')).toBeInTheDocument();
    expect(screen.getByText('Ran the Hauz Khas pilot.')).toBeInTheDocument();
    // The id appears in the header strip and again in the onboarding record.
    expect(screen.getAllByText('CADM-000042')).toHaveLength(2);
    expect(screen.queryByText('Platform default')).not.toBeInTheDocument();
  });

  it('names an unnamed, paused, unassigned admin on the platform default commission', async () => {
    renderPage([
      detailMock(
        payload({
          full_name: '',
          is_active: false,
          status: 'DRAFT',
          assigned_clubs: [],
          commission_pct: null,
          club_admin_no: null,
          joined_at: null,
          request_no: null,
          reviewer_notes: null,
          super_category: null,
          category: null,
          sub_category: null,
        }),
      ),
    ]);

    expect(await screen.findByRole('heading', { name: 'Unnamed club admin' })).toBeInTheDocument();
    expect(screen.getByText('Paused')).toBeInTheDocument();
    expect(screen.getByText('Drafted, not reviewed')).toBeInTheDocument();
    expect(screen.getByText(/No clubs assigned yet/)).toBeInTheDocument();
    expect(screen.getByText('Platform default')).toBeInTheDocument();
    expect(screen.queryByText('15%')).not.toBeInTheDocument();
  });

  it('goes Back to wherever the console mounted it', async () => {
    renderPage([detailMock(payload())], '/clubs/66c0000000000000000000e1');
    expect(await screen.findByRole('link', { name: 'Back' })).toHaveAttribute(
      'href',
      '/clubs/66c0000000000000000000e1',
    );
  });

  it('Change Logs shows this admin’s own history and hides the overview', async () => {
    renderPage([detailMock(payload())]);
    fireEvent.click(await screen.findByRole('tab', { name: 'Change Logs' }));

    expect(await screen.findByText('No changes recorded yet.')).toBeInTheDocument();
    expect(tables.fetchers.get('entityChangeLogsTable')).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('kabir.sethi@example.com')).not.toBeInTheDocument();
  });

  it('warns when the server has no such club admin', async () => {
    renderPage([detailMock(null)]);
    expect(await screen.findByText('Club admin not found.')).toBeInTheDocument();
  });

  it('shows the server error when the record cannot be read', async () => {
    renderPage([
      {
        request: { query: CLUB_ADMIN_DETAIL, variables: { id: ADMIN_ID } },
        result: { errors: [new GraphQLError('Not allowed')] },
      },
    ]);
    expect(await screen.findByText('Not allowed')).toBeInTheDocument();
  });
});
