import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Route, useParams } from 'react-router';
import RegionDrillDrawer from '../../../../src/pages/drill/RegionDrillDrawer';
import type { DrillLevel } from '../../../../src/pages/drill/levels';
import {
  REGION_CLUB_ADMIN_CLUBS,
  REGION_CLUB_PODS,
  REGION_HOST_PODS,
} from '../../../../src/pages/queries';
import { renderWithProviders } from '../../../testkit';
import { makeClub, makePod } from '../../../mocks/region';
import { resetTableMock, setServerRows, useApolloTableFetch } from '../../../mocks/table';

vi.mock('@duncit/table', () => import('../../../mocks/table'));

const ASHA_CLUBS: DrillLevel = { kind: 'CLUBS', id: 'u-admin-asha', label: 'Asha Rao' };
const RUNNERS_PODS: DrillLevel = { kind: 'CLUB_PODS', id: 'club-doc-1', label: 'Koramangala Runners' };
const ROHAN_PODS: DrillLevel = { kind: 'HOST_PODS', id: 'u-host-rohan', label: 'Rohan Mehta' };

/** Where a pod row lands: the pod detail route. */
function PodRoute() {
  const { id } = useParams();
  return <div data-testid="pod-route">{id}</div>;
}

const handlers = () => ({ onPush: vi.fn(), onPop: vi.fn(), onClose: vi.fn() });

const renderDrawer = (stack: DrillLevel[], callbacks = handlers()) => {
  renderWithProviders(<div />, {
    routes: (
      <>
        <Route path="/" element={<RegionDrillDrawer stack={stack} currency="₹" {...callbacks} />} />
        <Route path="/pods/:id" element={<PodRoute />} />
      </>
    ),
  });
  return callbacks;
};

const rows = () => screen.findAllByTestId('table-row');

beforeEach(() => {
  resetTableMock();
});

describe('RegionDrillDrawer', () => {
  it('stays closed while nothing has been opened', () => {
    renderDrawer([]);
    expect(screen.queryByTestId('region-drill-title')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('lists a Club Admin’s clubs, read through the region scope', async () => {
    setServerRows('regionClubAdminClubs', [
      makeClub(),
      makeClub({ id: 'club-doc-2', club_id: 'hsr-book-circle', club_name: 'HSR Book Circle', locality: 'HSR Layout', pod_count: 0, is_active: false }),
    ]);
    renderDrawer([ASHA_CLUBS]);

    expect(screen.getByRole('dialog', { name: 'Asha Rao' })).toBeInTheDocument();
    expect(screen.getByText('The clubs this Club Admin runs in your region.')).toBeInTheDocument();
    // The first level has nowhere to go back to, and its rows are clubs, not pods.
    expect(screen.queryByTestId('back-button')).not.toBeInTheDocument();
    expect(screen.queryByText('Click a pod to open its full detail.')).not.toBeInTheDocument();
    expect(useApolloTableFetch).toHaveBeenLastCalledWith(
      expect.anything(),
      REGION_CLUB_ADMIN_CLUBS,
      'regionClubAdminClubs',
      { extraVariables: { user_id: 'u-admin-asha' } },
      ['u-admin-asha'],
    );

    const [live, off] = await rows();
    expect(within(live).getByText('koramangala-runners')).toBeInTheDocument();
    expect(within(live).getByText('Active')).toBeInTheDocument();
    expect(within(live).getByTestId('cell-is_active')).toHaveTextContent('1');
    expect(within(live).getByTestId('cell-pod_count')).toHaveTextContent('14');
    expect(within(off).getByText('Inactive')).toBeInTheDocument();
    expect(within(off).getByTestId('cell-is_active')).toHaveTextContent('0');
    expect(within(off).getByTestId('cell-locality')).toHaveTextContent('HSR Layout');
    expect(screen.getByTestId('header-club_name')).toHaveTextContent('Club');
    expect(screen.getByTestId('header-city')).toHaveTextContent('City');
  });

  it('drills from a club into its pods', async () => {
    setServerRows('regionClubAdminClubs', [makeClub()]);
    const { onPush } = renderDrawer([ASHA_CLUBS]);

    const [club] = await rows();
    fireEvent.click(club);

    expect(onPush).toHaveBeenCalledWith({ kind: 'CLUB_PODS', id: 'club-doc-1', label: 'Koramangala Runners' });
  });

  it('says so when a Club Admin runs no clubs', async () => {
    renderDrawer([ASHA_CLUBS]);
    expect(await screen.findByTestId('table-empty')).toHaveTextContent('This Club Admin runs no clubs yet.');
  });

  it('shows a club’s pods one level down, with a way back up', async () => {
    setServerRows('regionClubPods', [
      makePod(),
      makePod({ id: 'pod-doc-4822', pod_id: 'DUN-POD-4822', pod_title: 'Monday Tempo Run', is_active: false }),
    ]);
    const { onPop } = renderDrawer([ASHA_CLUBS, RUNNERS_PODS]);

    expect(screen.getByTestId('region-drill-title')).toHaveTextContent('Koramangala Runners');
    expect(screen.getByText('Every pod this club has held.')).toBeInTheDocument();
    expect(screen.getByText('Click a pod to open its full detail.')).toBeInTheDocument();
    expect(useApolloTableFetch).toHaveBeenLastCalledWith(
      expect.anything(),
      REGION_CLUB_PODS,
      'regionClubPods',
      { extraVariables: { club_id: 'club-doc-1' } },
      ['club-doc-1'],
    );

    const [live, off] = await rows();
    expect(within(live).getByText('Sunday 10K Social Run')).toBeInTheDocument();
    expect(within(live).getByText('DUN-POD-4821')).toBeInTheDocument();
    expect(within(live).getByTestId('cell-pod_amount')).toHaveTextContent('₹1499.00');
    expect(within(live).getByTestId('cell-no_of_spots')).toHaveTextContent('20');
    expect(within(live).getByTestId('cell-club_name')).toHaveTextContent('Koramangala Runners');
    expect(within(live).getByTestId('cell-pod_date_time')).toHaveTextContent('2026');
    expect(within(live).getByText('Live')).toBeInTheDocument();
    expect(within(off).getByText('Off')).toBeInTheDocument();
    expect(within(off).getByTestId('cell-is_active')).toHaveTextContent('0');

    fireEvent.click(screen.getByTestId('back-button'));
    expect(onPop).toHaveBeenCalledTimes(1);
  });

  it('opens a pod’s full detail page from its row', async () => {
    setServerRows('regionClubPods', [makePod()]);
    renderDrawer([ASHA_CLUBS, RUNNERS_PODS]);

    const [pod] = await rows();
    fireEvent.click(pod);

    expect(await screen.findByTestId('pod-route')).toHaveTextContent('pod-doc-4821');
  });

  it('shows a host’s pods, scoped to this region, straight from the canvas', async () => {
    renderDrawer([ROHAN_PODS]);

    expect(screen.getByTestId('region-drill-title')).toHaveTextContent('Rohan Mehta');
    expect(screen.getByText('Pods this host runs inside your region.')).toBeInTheDocument();
    expect(useApolloTableFetch).toHaveBeenLastCalledWith(
      expect.anything(),
      REGION_HOST_PODS,
      'regionHostPods',
      { extraVariables: { host_user_id: 'u-host-rohan' } },
      ['u-host-rohan'],
    );
    expect(await screen.findByTestId('table-empty')).toHaveTextContent('This host has no pods in your region yet.');
    expect(screen.getByTestId('duncit-table')).toHaveAttribute('data-table-id', 'regional-pods-regionHostPods');
  });

  it('closes from its close button', async () => {
    const { onClose } = renderDrawer([ROHAN_PODS]);
    fireEvent.click(screen.getByRole('button', { name: 'shell.common.close' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });
});
