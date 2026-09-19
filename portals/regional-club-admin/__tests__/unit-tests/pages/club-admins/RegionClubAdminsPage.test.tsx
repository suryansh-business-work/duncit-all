import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import { RegionClubAdminsPage } from '../../../../src/pages/club-admins';
import {
  MY_REGION_MEMBERS,
  REGION_CLUB_ADMIN_CANDIDATES,
  REMOVE_REGION_CLUB_ADMIN,
  RENAME_MY_REGION,
  type Region,
  type RegionMember,
} from '../../../../src/pages/queries';
import { renderWithProviders } from '../../../testkit';
import { ASHA, VIKRAM, financeSettings, makeClub, makePod, makeRegion } from '../../../mocks/region';
import { resetTableMock, setServerRows, useApolloTableFetch } from '../../../mocks/table';

vi.mock('@duncit/table', () => import('../../../mocks/table'));

const membersMock = (members: RegionMember[], region: Region = makeRegion()): MockedResponse => ({
  request: { query: MY_REGION_MEMBERS },
  result: {
    data: { myRegion: region, myRegionMembers: members, publicFinanceSettings: financeSettings() },
  },
});

const membersFailed = (message: string): MockedResponse => ({
  request: { query: MY_REGION_MEMBERS },
  result: { errors: [new GraphQLError(message)] },
});

const removeMock = (userId: string, result: MockedResponse['result']): MockedResponse => ({
  request: { query: REMOVE_REGION_CLUB_ADMIN, variables: { user_id: userId } },
  result,
});

const renderPage = (mocks: MockedResponse[]) => renderWithProviders(<RegionClubAdminsPage />, { mocks });

/** The table row a member is drawn in, found by the name (or email) it shows. */
const rowOf = async (text: string) => {
  const [cell] = await screen.findAllByText(text, { selector: '[data-testid="cell-name"] *' });
  const row = cell.closest<HTMLElement>('[data-testid="table-row"]');
  if (!row) throw new Error(`no row for ${text}`);
  return row;
};

beforeEach(() => {
  resetTableMock();
});

describe('RegionClubAdminsPage', () => {
  it('waits on the query rather than flashing an empty table', async () => {
    renderPage([membersMock([ASHA, VIKRAM])]);

    expect(screen.getByTestId('page-header-title')).toHaveTextContent('Club Admins');
    expect(screen.getByText('Click a Club Admin to open their clubs, then a club to open its pods.')).toBeInTheDocument();
    expect(screen.queryByTestId('duncit-table')).not.toBeInTheDocument();

    expect(await screen.findByTestId('duncit-table')).toHaveAttribute('data-table-id', 'regional-club-admins');
    expect(await screen.findAllByTestId('table-row')).toHaveLength(2);
    expect(screen.getByRole('textbox', { name: 'Region name' })).toHaveValue('Bengaluru South');
  });

  it('says the region is empty when no Club Admin has been added', async () => {
    renderPage([membersMock([], makeRegion({ club_admin_user_ids: [], club_admin_count: 0 }))]);
    expect(await screen.findByTestId('table-empty')).toHaveTextContent('No Club Admins in this region yet.');
  });

  it('opens a Club Admin’s clubs, then a club’s pods, priced in the platform currency', async () => {
    setServerRows('regionClubAdminClubs', [makeClub()]);
    setServerRows('regionClubPods', [makePod()]);
    renderPage([membersMock([ASHA, VIKRAM])]);

    fireEvent.click(await rowOf('Asha Rao'));
    const drawer = await screen.findByRole('dialog', { name: 'Asha Rao' });
    expect(useApolloTableFetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      'regionClubAdminClubs',
      { extraVariables: { user_id: 'u-admin-asha' } },
      ['u-admin-asha'],
    );

    fireEvent.click((await within(drawer).findAllByTestId('table-row'))[0]);
    expect(await within(drawer).findByTestId('cell-pod_amount')).toHaveTextContent('₹1499.00');

    // Back goes up one level, to the clubs.
    fireEvent.click(within(drawer).getByTestId('back-button'));
    expect(await within(drawer).findByText('The clubs this Club Admin runs in your region.')).toBeInTheDocument();

    fireEvent.click(within(drawer).getByRole('button', { name: 'shell.common.close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('titles the drill-down with the email of a Club Admin who has set no name', async () => {
    renderPage([membersMock([ASHA, VIKRAM])]);
    fireEvent.click(await rowOf('vikram.k@duncit.com'));
    expect(await screen.findByTestId('region-drill-title')).toHaveTextContent('vikram.k@duncit.com');
  });

  it('opens the add dialog from the table toolbar and closes it again', async () => {
    renderPage([membersMock([ASHA]), {
      request: { query: REGION_CLUB_ADMIN_CANDIDATES, variables: { search: null } },
      result: { data: { regionClubAdminCandidates: [] } },
    }]);
    await screen.findByTestId('duncit-table');

    fireEvent.click(screen.getByRole('button', { name: 'Add Club Admin' }));
    expect(await screen.findByRole('dialog', { name: 'Add Club Admin' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'shell.common.cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('removes a member after confirming by name, then re-reads the region', async () => {
    renderPage([
      membersMock([ASHA, VIKRAM]),
      removeMock(ASHA.user_id, {
        data: { removeRegionClubAdmin: makeRegion({ club_admin_user_ids: [VIKRAM.user_id], club_admin_count: 1 }) },
      }),
      membersMock([VIKRAM], makeRegion({ club_admin_user_ids: [VIKRAM.user_id], club_admin_count: 1 })),
    ]);

    const asha = await rowOf('Asha Rao');
    fireEvent.click(within(asha).getByRole('button', { name: 'Remove Asha Rao from region' }));

    const confirm = await screen.findByRole('dialog', { name: 'Remove from region' });
    expect(confirm).toHaveTextContent('Asha Rao will leave this region.');
    // A click on the row's own button must not also open the drill-down.
    expect(screen.queryByTestId('region-drill-title')).not.toBeInTheDocument();

    fireEvent.click(within(confirm).getByTestId('confirm-dialog-confirm'));

    await waitFor(() => expect(screen.queryAllByText('Asha Rao')).toHaveLength(0));
    expect(screen.getAllByTestId('table-row')).toHaveLength(1);
    expect(screen.getByText('1 Club Admin(s)')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('names a nameless member by email in the confirmation, and can back out', async () => {
    renderPage([membersMock([ASHA, VIKRAM])]);
    const vikram = await rowOf('vikram.k@duncit.com');
    fireEvent.click(within(vikram).getByRole('button', { name: 'Remove vikram.k@duncit.com from region' }));

    const confirm = await screen.findByRole('dialog', { name: 'Remove from region' });
    expect(confirm).toHaveTextContent('vikram.k@duncit.com will leave this region.');

    fireEvent.click(within(confirm).getByTestId('confirm-dialog-cancel'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getAllByTestId('table-row')).toHaveLength(2);
  });

  it('shows why a removal was refused, and lets the manager dismiss it', async () => {
    renderPage([
      membersMock([ASHA, VIKRAM]),
      removeMock(ASHA.user_id, { errors: [new GraphQLError('Asha Rao still has pods running in this region.')] }),
    ]);
    const asha = await rowOf('Asha Rao');
    fireEvent.click(within(asha).getByRole('button', { name: 'Remove Asha Rao from region' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByTestId('confirm-dialog-confirm'));

    expect(await screen.findByText('Asha Rao still has pods running in this region.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() =>
      expect(screen.queryByText('Asha Rao still has pods running in this region.')).not.toBeInTheDocument(),
    );
  });

  it('re-reads the region after a rename, and reports a re-read that fails', async () => {
    renderPage([
      membersMock([ASHA, VIKRAM]),
      {
        request: { query: RENAME_MY_REGION, variables: { region_name: 'Bengaluru South & East' } },
        result: { data: { renameMyRegion: makeRegion({ region_name: 'Bengaluru South & East' }) } },
      },
      membersFailed('Your session has expired.'),
    ]);
    const field = await screen.findByRole('textbox', { name: 'Region name' });
    fireEvent.change(field, { target: { value: 'Bengaluru South & East' } });
    fireEvent.click(screen.getByRole('button', { name: 'shell.common.save' }));

    expect(await screen.findByText('Your session has expired.')).toBeInTheDocument();
  });
});
