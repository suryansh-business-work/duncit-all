import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { renderWithProviders } from '../../../__tests__/testkit';
import { __setTableRows } from '../../portal-access-page/__tests__/table-mock';
import { APPROVE_REQUEST, DENY_REQUEST } from '../queries';
import type { ApprovalRequest } from '../helpers';
import ApprovalsPage from '../ApprovalsPage';

/** Serves fixed rows through the portal-wide grid stub (see that file). */
vi.mock('@duncit/table', () => import('../../portal-access-page/__tests__/table-mock'));

const request: ApprovalRequest = {
  id: 'req-1',
  type: 'VENUE_CHANGE_REQUEST',
  status: 'PENDING',
  source_portal: 'partners',
  title: 'Move pod to a new venue',
  summary: 'Host asked to switch venue',
  details: [],
  kind: 'VENUE',
  subject_name: 'Asha Rao',
  subject_email: 'asha@duncit.com',
  subject_phone: null,
  requested_by_name: 'Asha Rao',
  reviewed_by_name: null,
  reviewed_at: null,
  review_notes: null,
  created_at: '2026-08-01T10:00:00.000Z',
  updated_at: '2026-08-01T10:00:00.000Z',
};

const approveMock = (): MockedResponse => ({
  request: { query: APPROVE_REQUEST, variables: { id: 'req-1' } },
  result: { data: { approveRequest: { __typename: 'ApprovalRequest', id: 'req-1', status: 'APPROVED' } } },
});

const denyMock = (notes: string): MockedResponse => ({
  request: { query: DENY_REQUEST, variables: { id: 'req-1', notes } },
  result: { data: { denyRequest: { __typename: 'ApprovalRequest', id: 'req-1', status: 'DENIED' } } },
});

const openReview = async () => {
  fireEvent.click(await screen.findByRole('button', { name: 'Review' }));
  return screen.findByRole('dialog');
};

beforeEach(() => {
  __setTableRows([request]);
});

describe('ApprovalsPage — approving', () => {
  it('approves the reviewed request, closes the dialog and confirms with a toast', async () => {
    renderWithProviders(<ApprovalsPage />, { mocks: [approveMock()] });
    await openReview();

    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

    expect(await screen.findByText('Request approved')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('keeps the dialog open and shows the server error when approving fails', async () => {
    renderWithProviders(<ApprovalsPage />, {
      mocks: [
        { request: { query: APPROVE_REQUEST, variables: { id: 'req-1' } }, error: new Error('Request already reviewed') },
      ],
    });
    await openReview();

    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

    expect(await screen.findByText('Request already reviewed')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByText('Request approved')).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Approve' })).toBeEnabled());
  });
});

describe('ApprovalsPage — denying', () => {
  it('sends the typed reason with the deny and confirms with a toast', async () => {
    renderWithProviders(<ApprovalsPage />, { mocks: [denyMock('Venue is closed that week')] });
    await openReview();

    fireEvent.click(screen.getByRole('button', { name: 'Deny' }));
    fireEvent.change(screen.getByLabelText(/Reason for denial/), {
      target: { value: '  Venue is closed that week  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Deny' }));

    expect(await screen.findByText('Request denied')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('shows the server error when denying fails', async () => {
    renderWithProviders(<ApprovalsPage />, {
      mocks: [
        {
          request: { query: DENY_REQUEST, variables: { id: 'req-1', notes: 'Duplicate' } },
          error: new Error('Could not deny request'),
        },
      ],
    });
    await openReview();

    fireEvent.click(screen.getByRole('button', { name: 'Deny' }));
    fireEvent.change(screen.getByLabelText(/Reason for denial/), { target: { value: 'Duplicate' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Deny' }));

    expect(await screen.findByText('Could not deny request')).toBeInTheDocument();
    expect(screen.queryByText('Request denied')).not.toBeInTheDocument();
  });
});

describe('ApprovalsPage — the toast', () => {
  it('can be dismissed from its close button', async () => {
    renderWithProviders(<ApprovalsPage />, { mocks: [approveMock()] });
    await openReview();
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await screen.findByText('Request approved');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    await waitFor(() => expect(screen.queryByText('Request approved')).not.toBeInTheDocument());
  });
});
