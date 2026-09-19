import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import { RegionStructurePage } from '../../../../src/pages/region-structure';
import { MY_REGION_TREE, REGION_HOST_PODS } from '../../../../src/pages/queries';
import { renderWithProviders } from '../../../testkit';
import {
  ADMIN_NODE_ID,
  EMPTY_TREE_NODES,
  ROHAN_NODE_ID,
  TREE_EDGES,
  TREE_NODES,
  financeSettings,
  makePod,
  makeRegion,
} from '../../../mocks/region';
import { lastFlow, resetFlowMock } from '../../../mocks/xyflow';
import { resetTableMock, setServerRows, useApolloTableFetch } from '../../../mocks/table';

vi.mock('@xyflow/react', () => import('../../../mocks/xyflow'));
vi.mock('@duncit/table', () => import('../../../mocks/table'));

const treeMock = (nodes = TREE_NODES, edges = TREE_EDGES): MockedResponse => ({
  request: { query: MY_REGION_TREE },
  result: {
    data: {
      myRegion: makeRegion(),
      myRegionTree: { __typename: 'RegionTree', nodes, edges },
      publicFinanceSettings: financeSettings(),
    },
  },
});

const renderPage = (mocks: MockedResponse[] = [treeMock()], entry = '/') =>
  renderWithProviders(<RegionStructurePage />, { mocks, initialEntries: [entry] });

const drawn = () => screen.findByTestId(`flow-node-${ROHAN_NODE_ID}`);
const headerTitle = () => screen.queryByTestId('page-header-title');

beforeEach(() => {
  resetFlowMock();
  resetTableMock();
});

describe('RegionStructurePage — loading and states', () => {
  it('says it is drawing the region until the tree arrives', async () => {
    renderPage();
    expect(screen.getByRole('status')).toHaveTextContent('Drawing your region…');
    expect(headerTitle()).toHaveTextContent('Region Structure');
    expect(screen.getByText('Your whole region on one canvas — every city, locality, Club Admin and Host under you.')).toBeInTheDocument();

    await drawn();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(headerTitle()).toHaveTextContent('Bengaluru South');
    expect(screen.getByText('Click a Host to see the pods they run in this region.')).toBeInTheDocument();
    expect(screen.queryByText(/No Club Admins in your region yet/)).not.toBeInTheDocument();
    expect(screen.getAllByTestId('flow-edge')).toHaveLength(TREE_EDGES.length);
  });

  it('invites the manager to add Club Admins when the region is only its root', async () => {
    renderPage([treeMock(EMPTY_TREE_NODES, [])]);
    expect(await screen.findByText(/No Club Admins in your region yet/)).toBeInTheDocument();
    expect(screen.queryByText('Click a Host to see the pods they run in this region.')).not.toBeInTheDocument();
  });

  it('shows why the region could not be read', async () => {
    renderPage([
      { request: { query: MY_REGION_TREE }, result: { errors: [new GraphQLError('Only a Regional Club Admin can open this canvas.')] } },
    ]);
    expect(await screen.findByText('Only a Regional Club Admin can open this canvas.')).toBeInTheDocument();
    expect(headerTitle()).toHaveTextContent('Region Structure');
  });
});

describe('RegionStructurePage — search and orientation', () => {
  it('counts and lights what a linked search matches', async () => {
    renderPage([treeMock()], '/?q=rohan');
    expect(await screen.findByText('1 of 6 boxes match')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Search the canvas' })).toHaveValue('rohan');
    const meera = lastFlow.props?.nodes.find((node) => node.id.endsWith('/host:u-host-meera'));
    expect(meera?.data.matched).toBe(false);
  });

  it('says so when the search matches nothing — but not while still drawing', async () => {
    renderPage([treeMock()], '/?q=Mysuru');
    expect(screen.queryByText('Nothing on the canvas matches that search.')).not.toBeInTheDocument();
    expect(await screen.findByText('Nothing on the canvas matches that search.')).toBeInTheDocument();
  });

  it('narrows the canvas as the manager types', async () => {
    renderPage();
    await drawn();
    fireEvent.change(screen.getByRole('textbox', { name: 'Search the canvas' }), { target: { value: 'duncit.com' } });
    expect(await screen.findByText('2 of 6 boxes match')).toBeInTheDocument();
  });

  it('turns the tree to run top to bottom and remembers it', async () => {
    renderPage();
    await drawn();
    fireEvent.click(screen.getByRole('button', { name: 'Vertical' }));

    await waitFor(() => expect(lastFlow.props?.nodes[0].data.direction).toBe('TB'));
    expect(localStorage.getItem('regional_canvas_direction')).toBe('TB');
  });
});

describe('RegionStructurePage — drill-down', () => {
  it('opens a Host’s pods in this region, priced in the platform currency', async () => {
    setServerRows('regionHostPods', [makePod()]);
    renderPage();
    fireEvent.click(await drawn());

    const drawer = await screen.findByRole('dialog', { name: 'Rohan Mehta' });
    expect(within(drawer).getByText('Pods this host runs inside your region.')).toBeInTheDocument();
    expect(useApolloTableFetch).toHaveBeenLastCalledWith(
      expect.anything(),
      REGION_HOST_PODS,
      'regionHostPods',
      { extraVariables: { host_user_id: 'u-host-rohan' } },
      ['u-host-rohan'],
    );
    expect(await within(drawer).findByTestId('cell-pod_amount')).toHaveTextContent('₹1499.00');

    fireEvent.click(within(drawer).getByRole('button', { name: 'shell.common.close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('opens a Club Admin’s clubs from their box', async () => {
    renderPage();
    await drawn();
    fireEvent.click(screen.getByTestId(`flow-node-${ADMIN_NODE_ID}`));

    const drawer = await screen.findByRole('dialog', { name: 'Asha Rao' });
    expect(within(drawer).getByText('The clubs this Club Admin runs in your region.')).toBeInTheDocument();
  });
});

describe('RegionStructurePage — full screen', () => {
  it('drops the page chrome in full screen and returns on Escape', async () => {
    renderPage();
    await drawn();
    fireEvent.click(screen.getByRole('button', { name: 'Full screen' }));

    expect(headerTitle()).not.toBeInTheDocument();
    expect(screen.queryByText('Click a Host to see the pods they run in this region.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Exit full screen' })).toBeInTheDocument();

    // Only Escape leaves — any other key is the canvas's own business. The
    // listener sits on the window; a key pressed anywhere bubbles up to it.
    fireEvent.keyDown(document, { key: 'ArrowLeft' });
    expect(headerTitle()).not.toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(headerTitle()).toHaveTextContent('Bengaluru South');
  });

  it('leaves full screen from its own button too', async () => {
    renderPage();
    await drawn();
    fireEvent.click(screen.getByRole('button', { name: 'Full screen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Exit full screen' }));
    expect(headerTitle()).toHaveTextContent('Bengaluru South');
  });
});
