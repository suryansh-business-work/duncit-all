import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { renderWithProviders } from '../../../../__tests__/testkit';
import PodIdeasPage from '../PodIdeasPage';
import { DELETE_IDEA, POD_IDEA_DETAILS, SET_STATUS, type IdeaRow } from '../queries';

// The table-mock stand-in runs IdeasTable's real columns and buttons; only the
// Apollo-backed fetch is replaced, so the page's refetches can be counted.
const fetchRows = vi.hoisted(() => vi.fn());
vi.mock('@duncit/table', async () => {
  const tableMock = await import('../../../../__tests__/table-mock');
  return { ...tableMock, useApolloTableFetch: () => fetchRows };
});

const idea: IdeaRow = {
  id: 'idea-1',
  author_id: 'u1',
  title: 'Sunday board games',
  description: 'Catan and Codenames at the cafe',
  likes_count: 12,
  shares_count: 3,
  comments_count: 0,
  status: 'PENDING',
  created_at: '2026-03-04T10:15:00.000Z',
  author: { user_id: 'u1', full_name: 'Asha Rao', first_name: 'Asha', email: 'asha@duncit.com', profile_photo: null },
};

const detailsIdea = (status: string) => ({
  __typename: 'PodIdea',
  ...idea,
  status,
  author: { __typename: 'PodIdeaAuthor', user_id: 'u1', full_name: 'Asha Rao', email: 'asha@duncit.com', profile_photo: null },
  comments: [],
});

const setStatusMock = (status: string, result: MockedResponse['result']): MockedResponse => ({
  request: { query: SET_STATUS, variables: { id: 'idea-1', status } },
  result,
});

const statusOk = (status: string) => ({
  data: { setPodIdeaStatus: { __typename: 'PodIdea', id: 'idea-1', status } },
});

/** A fade-out long enough that a closed dialog is still on screen for a click. */
const slowExitTheme = createTheme({ transitions: { duration: { leavingScreen: 60_000 } } });

const renderPage = (mocks: MockedResponse[] = [], wrap: (ui: ReactElement) => ReactElement = (ui) => ui) =>
  renderWithProviders(wrap(<PodIdeasPage />), { mocks });

const openDeleteDialog = async () => {
  fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
  return screen.findByRole('dialog', { name: 'Delete idea?' });
};

beforeEach(() => {
  fetchRows.mockReset();
  fetchRows.mockResolvedValue({ rows: [idea], total: 1 });
});

describe('PodIdeasPage / listing and status', () => {
  it('lists the ideas the table fetches under the page title', async () => {
    renderPage();
    expect(screen.getByText('Pod Ideas')).toBeInTheDocument();
    const row = await screen.findByTestId('table-row');
    expect(within(row).getByTestId('value-title')).toHaveTextContent('Sunday board games');
    expect(fetchRows).toHaveBeenCalledTimes(1);
  });

  it('approving a row toasts the new status, refetches the table, and Escape dismisses the toast', async () => {
    renderPage([setStatusMock('APPROVED', statusOk('APPROVED'))]);

    fireEvent.click(await screen.findByRole('button', { name: 'Approve' }));

    expect(await screen.findByText('Marked approved')).toBeInTheDocument();
    expect(fetchRows).toHaveBeenCalledTimes(2);

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByText('Marked approved')).not.toBeInTheDocument());
  });

  it('toasts the server error and does not refetch when a status change fails', async () => {
    renderPage([setStatusMock('REJECTED', { errors: [new GraphQLError('Idea is locked')] })]);

    fireEvent.click(await screen.findByRole('button', { name: 'Reject' }));

    expect(await screen.findByText('Idea is locked')).toBeInTheDocument();
    expect(fetchRows).toHaveBeenCalledTimes(1);
  });
});

describe('PodIdeasPage / details', () => {
  it('opens the details of a row, refreshes the table when it changes there, and closes', async () => {
    const details = (status: string): MockedResponse => ({
      request: { query: POD_IDEA_DETAILS, variables: { id: 'idea-1' } },
      result: { data: { podIdea: detailsIdea(status) } },
    });
    renderPage([details('PENDING'), setStatusMock('REJECTED', statusOk('REJECTED')), details('REJECTED')]);

    fireEvent.click(await screen.findByRole('button', { name: 'View' }));
    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByText('Catan and Codenames at the cafe')).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Reject' }));
    await waitFor(() => expect(fetchRows).toHaveBeenCalledTimes(2));

    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

describe('PodIdeasPage / deleting', () => {
  it('asks first, then deletes the idea, toasts, closes the dialog and refetches', async () => {
    renderPage([
      { request: { query: DELETE_IDEA, variables: { id: 'idea-1' } }, result: { data: { deletePodIdea: true } } },
    ]);

    const dialog = await openDeleteDialog();
    expect(within(dialog).getByText('Sunday board games')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('Deleted')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Delete idea?' })).not.toBeInTheDocument());
    expect(fetchRows).toHaveBeenCalledTimes(2);
  });

  it('keeps the dialog open and toasts the server error when deletion fails', async () => {
    renderPage([
      { request: { query: DELETE_IDEA, variables: { id: 'idea-1' } }, result: { errors: [new GraphQLError('Not allowed')] } },
    ]);

    const dialog = await openDeleteDialog();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('Not allowed')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Delete idea?' })).toBeInTheDocument();
    expect(fetchRows).toHaveBeenCalledTimes(1);
  });

  it('Cancel backs out, and a Delete click while the dialog fades out deletes nothing', async () => {
    const deleteResult = vi.fn(() => ({ data: { deletePodIdea: true } }));
    renderPage(
      [
        { request: { query: DELETE_IDEA, variables: () => true }, result: deleteResult },
        setStatusMock('APPROVED', statusOk('APPROVED')),
      ],
      (ui) => <ThemeProvider theme={slowExitTheme}>{ui}</ThemeProvider>,
    );

    const dialog = await openDeleteDialog();
    const deleteButton = within(dialog).getByRole('button', { name: 'Delete' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('dialog', { name: 'Delete idea?' })).toBeInTheDocument();

    fireEvent.click(deleteButton);
    // A delete that went ahead (or failed) would have raised a toast by now.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    // The mock link answers requests in the order they were sent, so once this
    // later approval has landed, a delete sent by the click above would have too.
    fireEvent.click(screen.getByRole('button', { name: 'Approve', hidden: true }));
    expect(await screen.findByText('Marked approved')).toBeInTheDocument();

    expect(deleteResult).not.toHaveBeenCalled();
    expect(screen.queryByText('Deleted')).not.toBeInTheDocument();
    expect(fetchRows).toHaveBeenCalledTimes(2);
  });
});
