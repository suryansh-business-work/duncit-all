import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { renderWithProviders } from '../../../__tests__/testkit';
import { __setTableRows, tableFetchCalls } from './table-mock';
import { APPROVE_PORTAL_ACCESS, DENY_PORTAL_ACCESS } from '../queries';
import type { PortalAccessRequest } from '../helpers';
import PortalAccessPage from '../PortalAccessPage';

vi.mock('@duncit/table', () => import('./table-mock'));

const makeRow = (over: Partial<PortalAccessRequest> = {}): PortalAccessRequest => ({
  id: 'req-1',
  status: 'PENDING',
  title: null,
  summary: null,
  target_id: 'finance',
  subject_name: 'Asha Rao',
  subject_email: 'asha@duncit.com',
  requested_by_name: 'Asha Rao',
  reviewed_by_name: null,
  reviewed_at: null,
  review_notes: null,
  created_at: '2026-03-01T10:00:00.000Z',
  ...over,
});

const approveMock = (id: string, onCall?: () => void): MockedResponse => ({
  request: { query: APPROVE_PORTAL_ACCESS, variables: { id } },
  result: () => {
    onCall?.();
    return { data: { approveRequest: { __typename: 'ApprovalRequest', id, status: 'APPROVED' } } };
  },
});

const denyMock = (id: string, onCall?: () => void): MockedResponse => ({
  request: { query: DENY_PORTAL_ACCESS, variables: { id } },
  result: () => {
    onCall?.();
    return { data: { denyRequest: { __typename: 'ApprovalRequest', id, status: 'DENIED' } } };
  },
});

const failingApproveMock = (id: string, message: string): MockedResponse => ({
  request: { query: APPROVE_PORTAL_ACCESS, variables: { id } },
  error: new Error(message),
});

const failingDenyMock = (id: string, message: string): MockedResponse => ({
  request: { query: DENY_PORTAL_ACCESS, variables: { id } },
  error: new Error(message),
});

beforeEach(() => {
  __setTableRows([]);
});

describe('PortalAccessPage — layout and filter toggle', () => {
  it('renders the title, subtitle and defaults the filter to Pending', async () => {
    renderWithProviders(<PortalAccessPage />);

    expect(screen.getByText('Portal Access')).toBeInTheDocument();
    expect(
      screen.getByText('Jump to Portal requests — who asked for which console, and when.'),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(tableFetchCalls.extraFilters).toEqual([
        { field: 'type', op: 'eq', value: 'PORTAL_ACCESS' },
        { field: 'status', op: 'eq', value: 'PENDING' },
      ]),
    );
  });

  it('drops the status filter when "All" is selected, and refetches on every change', async () => {
    renderWithProviders(<PortalAccessPage />);
    await waitFor(() => expect(tableFetchCalls.resultKey).toBe('approvalRequestsTable'));

    fireEvent.click(screen.getByRole('button', { name: 'All' }));

    await waitFor(() =>
      expect(tableFetchCalls.extraFilters).toEqual([{ field: 'type', op: 'eq', value: 'PORTAL_ACCESS' }]),
    );
  });

  it('scopes to a different status when Denied is picked', async () => {
    renderWithProviders(<PortalAccessPage />);
    await waitFor(() => expect(tableFetchCalls.resultKey).toBe('approvalRequestsTable'));

    fireEvent.click(screen.getByRole('button', { name: 'Denied' }));

    await waitFor(() =>
      expect(tableFetchCalls.extraFilters).toEqual([
        { field: 'type', op: 'eq', value: 'PORTAL_ACCESS' },
        { field: 'status', op: 'eq', value: 'DENIED' },
      ]),
    );
  });

  it('re-clicking the already-selected filter (exclusive deselect) leaves the filter unchanged', async () => {
    renderWithProviders(<PortalAccessPage />);
    await waitFor(() => expect(tableFetchCalls.resultKey).toBe('approvalRequestsTable'));

    // The default is Pending; clicking it again fires onChange(null) in MUI's
    // exclusive ToggleButtonGroup, which the page must ignore rather than
    // clearing the filter.
    fireEvent.click(screen.getByRole('button', { name: 'Pending' }));

    await waitFor(() =>
      expect(tableFetchCalls.extraFilters).toEqual([
        { field: 'type', op: 'eq', value: 'PORTAL_ACCESS' },
        { field: 'status', op: 'eq', value: 'PENDING' },
      ]),
    );
  });
});

describe('PortalAccessPage — approve flow', () => {
  it('confirms with the requester and portal name, then approves on accept', async () => {
    __setTableRows([makeRow()]);
    renderWithProviders(<PortalAccessPage />, { mocks: [approveMock('req-1')] });

    fireEvent.click(await screen.findByRole('button', { name: 'Approve' }));

    expect(
      await screen.findByText(
        'Grant Asha Rao access to the Finance portal? Their account gets the portal role and they are emailed.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Approve portal access' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

    await waitFor(() =>
      expect(
        screen.getByText('Access approved — role granted and the requester emailed.'),
      ).toBeInTheDocument(),
    );
  });

  it('does nothing when the approval confirmation is cancelled', async () => {
    __setTableRows([makeRow()]);
    renderWithProviders(<PortalAccessPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Approve' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));

    await waitFor(() =>
      expect(screen.queryByText('Approve portal access')).not.toBeInTheDocument(),
    );
    expect(
      screen.queryByText('Access approved — role granted and the requester emailed.'),
    ).not.toBeInTheDocument();
  });

  it('falls the confirm message back to an em dash when the requester has no name', async () => {
    __setTableRows([makeRow({ subject_name: null })]);
    renderWithProviders(<PortalAccessPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Approve' }));

    expect(
      await screen.findByText(
        'Grant — access to the Finance portal? Their account gets the portal role and they are emailed.',
      ),
    ).toBeInTheDocument();
  });

  it('shows the server error and does not toast success when approving fails', async () => {
    __setTableRows([makeRow()]);
    renderWithProviders(<PortalAccessPage />, {
      mocks: [failingApproveMock('req-1', 'Role grant failed')],
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Approve' }));
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

    await waitFor(() => expect(screen.getByText('Role grant failed')).toBeInTheDocument());
    expect(
      screen.queryByText('Access approved — role granted and the requester emailed.'),
    ).not.toBeInTheDocument();
  });
});

describe('PortalAccessPage — deny flow', () => {
  it('confirms as a destructive action and denies on accept', async () => {
    __setTableRows([makeRow()]);
    renderWithProviders(<PortalAccessPage />, { mocks: [denyMock('req-1')] });

    fireEvent.click(await screen.findByRole('button', { name: 'Deny' }));

    expect(
      await screen.findByText(
        'Deny Asha Rao access to the Finance portal? They are emailed about the decision.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Deny portal access' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Deny' }));

    await waitFor(() =>
      expect(screen.getByText('Request denied — the requester was emailed.')).toBeInTheDocument(),
    );
  });

  it('does nothing when the deny confirmation is cancelled', async () => {
    __setTableRows([makeRow()]);
    renderWithProviders(<PortalAccessPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Deny' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByText('Deny portal access')).not.toBeInTheDocument());
    expect(screen.queryByText('Request denied — the requester was emailed.')).not.toBeInTheDocument();
  });

  it('shows the server error and does not toast success when denying fails', async () => {
    __setTableRows([makeRow()]);
    renderWithProviders(<PortalAccessPage />, {
      mocks: [failingDenyMock('req-1', 'Could not notify the requester')],
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Deny' }));
    fireEvent.click(screen.getByRole('button', { name: 'Deny' }));

    await waitFor(() =>
      expect(screen.getByText('Could not notify the requester')).toBeInTheDocument(),
    );
    expect(screen.queryByText('Request denied — the requester was emailed.')).not.toBeInTheDocument();
  });
});

describe('PortalAccessPage — decided rows', () => {
  it('shows the reviewer instead of actions for an already-decided row', async () => {
    __setTableRows([
      makeRow({ id: 'req-2', status: 'APPROVED', reviewed_by_name: 'Root Admin' }),
    ]);
    renderWithProviders(<PortalAccessPage />);

    expect(await screen.findByText('Root Admin')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    // Assert against the wrapping table row scope to avoid matching the
    // ToggleButtonGroup's own "Denied" filter button.
    expect(within(screen.getByTestId('table-row')).queryByRole('button')).not.toBeInTheDocument();
  });
});
