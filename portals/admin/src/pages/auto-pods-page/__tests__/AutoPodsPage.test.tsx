import type { MutableRefObject, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { Route, useLocation } from 'react-router-dom';
import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import { renderWithProviders } from '../../../__tests__/testkit';
import { ADMIN_AUTO_PODS_TABLE, CANCEL_AUTO_POD, DELETE_AUTO_POD, type AutoPodTableRow } from '../queries';
import AutoPodsPage from '../AutoPodsPage';

const harness = vi.hoisted(() => ({
  fetchCalls: [] as { query: unknown; rootField: string }[],
  tableRefetch: vi.fn(),
  row: {
    id: 'doc1',
    pod_id: null as string | null,
  },
}));

vi.mock('@duncit/table', () => ({
  useApolloTableFetch: (_client: unknown, query: unknown, rootField: string) => {
    harness.fetchCalls.push({ query, rootField });
    return async () => ({ rows: [], total: 0 });
  },
}));

vi.mock('../AutoPodsTable', () => ({
  default: (props: {
    refetchRef: MutableRefObject<(() => void) | null>;
    toolbarActions?: ReactNode;
    onEdit: (row: AutoPodTableRow) => void;
    onCancel: (row: AutoPodTableRow) => void;
    onDelete: (row: AutoPodTableRow) => void;
    onViewPod: (row: AutoPodTableRow) => void;
  }) => {
    props.refetchRef.current = harness.tableRefetch;
    return (
      <div>
        {props.toolbarActions}
        <button type="button" onClick={() => props.onEdit(harness.row as AutoPodTableRow)}>
          row-edit
        </button>
        <button type="button" onClick={() => props.onCancel(harness.row as AutoPodTableRow)}>
          row-cancel
        </button>
        <button type="button" onClick={() => props.onDelete(harness.row as AutoPodTableRow)}>
          row-delete
        </button>
        <button type="button" onClick={() => props.onViewPod(harness.row as AutoPodTableRow)}>
          row-view-pod
        </button>
      </div>
    );
  },
}));

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="pathname">{location.pathname}</span>;
}

const renderPage = (mocks: MockedResponse[] = []) =>
  renderWithProviders(<></>, {
    mocks,
    initialEntries: ['/auto-pods'],
    routes: (
      <>
        <Route
          path="/auto-pods"
          element={
            <>
              <AutoPodsPage />
              <LocationProbe />
            </>
          }
        />
        <Route
          path="/auto-pods/new"
          element={
            <>
              <div>NEW AUTO POD ROUTE</div>
              <LocationProbe />
            </>
          }
        />
        <Route
          path="/auto-pods/:id/edit"
          element={
            <>
              <div>EDIT AUTO POD ROUTE</div>
              <LocationProbe />
            </>
          }
        />
        <Route
          path="/pods/:id"
          element={
            <>
              <div>POD DETAIL ROUTE</div>
              <LocationProbe />
            </>
          }
        />
      </>
    ),
  });

beforeEach(() => {
  harness.fetchCalls.length = 0;
  harness.tableRefetch.mockReset();
  harness.row = { id: 'doc1', pod_id: null };
});

describe('AutoPodsPage / data fetch', () => {
  it('builds the table fetch off the admin auto pods table query', () => {
    renderPage();
    expect(harness.fetchCalls).toEqual([{ query: ADMIN_AUTO_PODS_TABLE, rootField: 'adminAutoPodsTable' }]);
  });
});

describe('AutoPodsPage / header + navigation', () => {
  it('shows the page title and subtitle', () => {
    renderPage();
    expect(screen.getByText('Auto Pods')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Pods the marketplace completes: a venue, a host and a club admin each enrol, in any order.',
      ),
    ).toBeInTheDocument();
  });

  it('navigates to the new-offer route from the toolbar CTA', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'New Auto Pod' }));
    expect(screen.getByText('NEW AUTO POD ROUTE')).toBeInTheDocument();
  });

  it("routes a row edit to the offer's edit route", () => {
    renderPage();
    fireEvent.click(screen.getByText('row-edit'));
    expect(screen.getByTestId('pathname')).toHaveTextContent('/auto-pods/doc1/edit');
  });

  it('opens the materialized pod when View Pod is used', () => {
    harness.row = { id: 'doc1', pod_id: 'pod-9' };
    renderPage();
    fireEvent.click(screen.getByText('row-view-pod'));
    expect(screen.getByText('POD DETAIL ROUTE')).toBeInTheDocument();
  });

  it('does nothing when View Pod is used on an offer with no pod yet', () => {
    harness.row = { id: 'doc1', pod_id: null };
    renderPage();
    fireEvent.click(screen.getByText('row-view-pod'));
    expect(screen.getByTestId('pathname')).toHaveTextContent('/auto-pods');
  });
});

describe('AutoPodsPage / cancel an offer', () => {
  it('asks for confirmation, with the reason field, before cancelling', async () => {
    renderPage();
    fireEvent.click(screen.getByText('row-cancel'));
    expect(await screen.findByText('Cancel this Auto Pod?')).toBeInTheDocument();
    expect(
      screen.getByText('Everyone who enrolled is told, and the venue gets its slot back. This cannot be undone.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Reason (optional)')).toBeInTheDocument();
  });

  it('cancels nothing when the confirmation is dismissed', async () => {
    renderPage();
    fireEvent.click(screen.getByText('row-cancel'));
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByText('Cancel this Auto Pod?')).not.toBeInTheDocument());
    expect(harness.tableRefetch).not.toHaveBeenCalled();
  });

  it('sends the typed reason, trimmed, and reloads the grid on success', async () => {
    let sentVariables: unknown;
    const mock: MockedResponse = {
      request: { query: CANCEL_AUTO_POD },
      variableMatcher: (variables) => {
        sentVariables = variables;
        return true;
      },
      result: {
        data: {
          cancelAutoPod: {
            __typename: 'AutoPod',
            id: 'doc1',
            stage: 'CANCELLED',
            cancel_reason: 'Venue double-booked',
            cancelled_at: '2026-01-10T00:00:00.000Z',
          },
        },
      },
    };
    renderPage([mock]);
    fireEvent.click(screen.getByText('row-cancel'));
    fireEvent.change(await screen.findByLabelText('Reason (optional)'), {
      target: { value: '  Venue double-booked  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel Auto Pod' }));

    expect(await screen.findByText('Auto Pod cancelled.')).toBeInTheDocument();
    expect(sentVariables).toEqual({ auto_pod_doc_id: 'doc1', reason: 'Venue double-booked' });
    await waitFor(() => expect(harness.tableRefetch).toHaveBeenCalledTimes(1));
  });

  it('sends null when no reason was typed', async () => {
    let sentVariables: unknown;
    const mock: MockedResponse = {
      request: { query: CANCEL_AUTO_POD },
      variableMatcher: (variables) => {
        sentVariables = variables;
        return true;
      },
      result: {
        data: {
          cancelAutoPod: { __typename: 'AutoPod', id: 'doc1', stage: 'CANCELLED', cancel_reason: null, cancelled_at: null },
        },
      },
    };
    renderPage([mock]);
    fireEvent.click(screen.getByText('row-cancel'));
    await screen.findByLabelText('Reason (optional)');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel Auto Pod' }));
    await screen.findByText('Auto Pod cancelled.');
    expect(sentVariables).toEqual({ auto_pod_doc_id: 'doc1', reason: null });
  });

  it('notifies with the server error and does not reload the grid when the mutation fails', async () => {
    const mock: MockedResponse = {
      request: { query: CANCEL_AUTO_POD },
      variableMatcher: () => true,
      result: { errors: [new GraphQLError('This Auto Pod can no longer be cancelled')] },
    };
    renderPage([mock]);
    fireEvent.click(screen.getByText('row-cancel'));
    await screen.findByLabelText('Reason (optional)');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel Auto Pod' }));

    expect(await screen.findByText('This Auto Pod can no longer be cancelled')).toBeInTheDocument();
    expect(screen.queryByText('Auto Pod cancelled.')).not.toBeInTheDocument();
    expect(harness.tableRefetch).not.toHaveBeenCalled();
  });
});

describe('AutoPodsPage / delete an offer', () => {
  it('asks for confirmation before deleting', async () => {
    renderPage();
    fireEvent.click(screen.getByText('row-delete'));
    expect(await screen.findByText('Delete this Auto Pod?')).toBeInTheDocument();
    expect(
      screen.getByText(
        'The record is removed for good. If partners have enrolled they are told, and the venue gets its slot back.',
      ),
    ).toBeInTheDocument();
  });

  it('deletes nothing when the confirmation is dismissed', async () => {
    renderPage();
    fireEvent.click(screen.getByText('row-delete'));
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByText('Delete this Auto Pod?')).not.toBeInTheDocument());
    expect(harness.tableRefetch).not.toHaveBeenCalled();
  });

  it('deletes, toasts and reloads the grid once confirmed', async () => {
    const mocks: MockedResponse[] = [
      {
        request: { query: DELETE_AUTO_POD, variables: { auto_pod_doc_id: 'doc1' } },
        result: { data: { deleteAutoPod: true } },
      },
    ];
    renderPage(mocks);
    fireEvent.click(screen.getByText('row-delete'));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete Auto Pod' }));

    expect(await screen.findByText('Auto Pod deleted.')).toBeInTheDocument();
    await waitFor(() => expect(harness.tableRefetch).toHaveBeenCalledTimes(1));
  });

  it('notifies with the server error and does not reload the grid when delete fails', async () => {
    const mocks: MockedResponse[] = [
      {
        request: { query: DELETE_AUTO_POD, variables: { auto_pod_doc_id: 'doc1' } },
        result: { errors: [new GraphQLError('This Auto Pod is live')] },
      },
    ];
    renderPage(mocks);
    fireEvent.click(screen.getByText('row-delete'));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete Auto Pod' }));

    expect(await screen.findByText('This Auto Pod is live')).toBeInTheDocument();
    expect(screen.queryByText('Auto Pod deleted.')).not.toBeInTheDocument();
    expect(harness.tableRefetch).not.toHaveBeenCalled();
  });
});
