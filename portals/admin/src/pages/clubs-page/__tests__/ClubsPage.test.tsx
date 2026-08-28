import type { MutableRefObject, ReactNode } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { Route, useParams } from 'react-router-dom';
import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import { renderWithProviders } from '../../../__tests__/testkit';
import { CATEGORIES, DELETE, type ClubRow } from '../queries';
import ClubsPage from '../ClubsPage';

const refetchSpy = vi.hoisted(() => vi.fn());

vi.mock('@duncit/table', () => import('../../../__tests__/table-mock'));

const ROW: ClubRow = {
  id: 'c1',
  club_id: 'CLB-1',
  club_name: 'Chess Club',
  locality: 'Indiranagar',
  category_id: 'cat-1',
  is_verified: true,
  is_active: true,
  created_at: '2026-02-01T00:00:00.000Z',
};

vi.mock('../ClubsTable', () => ({
  default: ({
    toolbarActions,
    catName,
    refetchRef,
    onEdit,
    onRemove,
    onView,
  }: {
    toolbarActions?: ReactNode;
    catName: (id: string) => string;
    refetchRef: MutableRefObject<(() => void) | null>;
    onEdit: (c: ClubRow) => void;
    onRemove: (c: ClubRow) => void;
    onView: (c: ClubRow) => void;
  }) => (
    <div>
      {toolbarActions}
      <span data-testid="cat-known">{catName('cat-1')}</span>
      <span data-testid="cat-unknown">{catName('nope')}</span>
      <button type="button" onClick={() => onEdit(ROW)}>
        row-edit
      </button>
      <button type="button" onClick={() => onRemove(ROW)}>
        row-remove
      </button>
      <button type="button" onClick={() => onView(ROW)}>
        row-view
      </button>
      <button
        type="button"
        onClick={() => {
          refetchRef.current = refetchSpy;
        }}
      >
        set-refetch
      </button>
    </div>
  ),
}));

const categoriesMock = (): MockedResponse => ({
  request: { query: CATEGORIES },
  result: {
    data: {
      categories: [
        { __typename: 'Category', id: 'cat-1', name: 'Board Games', level: 2, parent_id: 'sc1' },
      ],
    },
  },
  maxUsageCount: 5,
});

/** Stands in for the real `/clubs/:id/edit` route (the club editor page) so a
 * navigation there is observable without mounting the whole club-form. */
function ClubEditRouteProbe() {
  const { id } = useParams();
  return <div>club-edit-page:{id}</div>;
}

const renderPage = (mocks: MockedResponse[] = [], entry = '/clubs') =>
  renderWithProviders(<ClubsPage />, {
    mocks: [categoriesMock(), ...mocks],
    initialEntries: [entry],
    routes: (
      <>
        <Route path="/clubs" element={<ClubsPage />} />
        <Route path="/clubs/new" element={<div>club-new-page</div>} />
        <Route path="/clubs/:id/edit" element={<ClubEditRouteProbe />} />
        <Route path="/clubs/:id" element={<div>club-details-page</div>} />
      </>
    ),
  });

describe('ClubsPage', () => {
  beforeEach(() => {
    refetchSpy.mockReset();
  });

  it('resolves category names for the table and dashes out unknown ids', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('cat-known')).toHaveTextContent('Board Games'));
    expect(screen.getByTestId('cat-unknown')).toHaveTextContent('—');
  });

  it('navigates to /clubs/new when "New Club" is clicked', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'New Club' }));
    expect(await screen.findByText('club-new-page')).toBeInTheDocument();
  });

  it('navigates to the edit route for the row being edited', async () => {
    renderPage();
    fireEvent.click(screen.getByText('row-edit'));
    expect(await screen.findByText('club-edit-page:c1')).toBeInTheDocument();
  });

  it('navigates to the club details page from the row view action', async () => {
    renderPage();
    fireEvent.click(screen.getByText('row-view'));
    expect(await screen.findByText('club-details-page')).toBeInTheDocument();
  });

  it('redirects a legacy /clubs?edit=<id> bookmark to the edit route', async () => {
    renderPage([], '/clubs?edit=c9');
    expect(await screen.findByText('club-edit-page:c9')).toBeInTheDocument();
  });

  it('deletes a club after the confirmation is accepted', async () => {
    renderPage([
      {
        request: { query: DELETE, variables: { id: 'c1' } },
        result: { data: { deleteClub: true } },
      },
    ]);
    fireEvent.click(screen.getByText('set-refetch'));
    fireEvent.click(screen.getByText('row-remove'));
    expect(await screen.findByText('Delete club "Chess Club"?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(await screen.findByText('Deleted')).toBeInTheDocument();
    expect(refetchSpy).toHaveBeenCalledTimes(1);
  });

  it('does not delete when the confirmation is cancelled', async () => {
    renderPage();
    fireEvent.click(screen.getByText('row-remove'));
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByText('Delete club "Chess Club"?')).not.toBeInTheDocument());
    expect(screen.queryByText('Deleted')).not.toBeInTheDocument();
  });

  it('notifies when the delete mutation fails', async () => {
    renderPage([
      {
        request: { query: DELETE, variables: { id: 'c1' } },
        result: { errors: [new GraphQLError('Club still has pods')] },
      },
    ]);
    fireEvent.click(screen.getByText('row-remove'));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('Club still has pods')).toBeInTheDocument();
    expect(screen.queryByText('Deleted')).not.toBeInTheDocument();
  });
});
