import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { gql } from '@apollo/client';
import type { MockedResponse } from '@apollo/client/testing';
import { notifyError } from '@duncit/dialogs';
import UserVerificationsSection from '../UserVerificationsSection';
import type { VerificationItem } from '../VerificationCells';
import { renderWithProviders } from './testkit';
import { __setTableRows, tableFetchCalls } from './table-mock';

vi.mock('@duncit/table', () => import('./table-mock'));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notifyError: vi.fn(),
}));

const USER_ID = 'u-9';

/**
 * The section keeps its mutation private, so the test re-declares the exact
 * document it must send. A renamed field or argument in the component breaks
 * the MockedProvider match and fails here — which is the contract we want.
 */
const REVIEW = gql`
  mutation AdminReviewVerification(
    $user_id: ID!
    $type: VerificationType!
    $status: VerificationStatus!
    $reject_reason: String
  ) {
    reviewVerification(
      user_id: $user_id
      type: $type
      status: $status
      reject_reason: $reject_reason
    ) {
      type
      status
    }
  }
`;

const identity = (over: Partial<VerificationItem> = {}): VerificationItem => ({
  type: 'IDENTITY',
  status: 'PENDING',
  document_url: 'https://cdn.test/aadhaar.pdf',
  address: null,
  reject_reason: null,
  ...over,
});

const address = (over: Partial<VerificationItem> = {}): VerificationItem => ({
  type: 'ADDRESS',
  status: 'APPROVED',
  document_url: null,
  address: {
    line1: 'Flat 3B',
    line2: '',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411001',
    country: 'India',
  },
  reject_reason: null,
  ...over,
});

const email = (over: Partial<VerificationItem> = {}): VerificationItem => ({
  type: 'EMAIL',
  status: 'VERIFIED_BY_APP',
  document_url: null,
  address: null,
  reject_reason: null,
  ...over,
});

const reviewMock = (
  variables: Record<string, unknown>,
  onCall?: () => void,
): MockedResponse => ({
  request: { query: REVIEW, variables },
  result: () => {
    onCall?.();
    return {
      data: {
        reviewVerification: {
          __typename: 'UserVerification',
          type: variables.type,
          status: variables.status,
        },
      },
    };
  },
});

const failingReviewMock = (variables: Record<string, unknown>): MockedResponse => ({
  request: { query: REVIEW, variables },
  error: new Error('Reviewer lacks permission'),
});

/** Finds the table row whose Type cell shows `label` (e.g. "Identity"). */
const row = (label: string) => {
  const found = screen
    .getAllByTestId('table-row')
    .find((node) => within(node).getByTestId('value-type').textContent === label);
  if (!found) throw new Error(`No verification row for ${label}`);
  return found;
};

beforeEach(() => {
  __setTableRows([]);
  vi.mocked(notifyError).mockClear();
});

describe('UserVerificationsSection — table wiring', () => {
  it('asks the server for this user only, and shows the empty copy when nothing is submitted', async () => {
    renderWithProviders(<UserVerificationsSection userId={USER_ID} />);

    await waitFor(() => expect(screen.getByTestId('table-empty')).toBeInTheDocument());
    expect(screen.getByTestId('table-empty')).toHaveTextContent('No verifications yet.');
    expect(tableFetchCalls.resultKey).toBe('userVerificationsTable');
    expect(tableFetchCalls.extraVariables).toEqual({ user_id: USER_ID });
    expect(screen.getByText('Verification')).toBeInTheDocument();
  });

  it('never fetches rows when there is no user id yet', async () => {
    __setTableRows([identity()]);
    renderWithProviders(<UserVerificationsSection userId="" />);

    await waitFor(() => expect(screen.getByTestId('table-empty')).toBeInTheDocument());
    expect(screen.queryAllByTestId('table-row')).toHaveLength(0);
  });
});

describe('UserVerificationsSection — row rendering', () => {
  it('shows human labels for every type and status', async () => {
    __setTableRows([identity(), address(), email()]);
    renderWithProviders(<UserVerificationsSection userId={USER_ID} />);

    await waitFor(() => expect(row('Identity')).toBeInTheDocument());
    expect(within(row('Identity')).getByTestId('value-type')).toHaveTextContent('Identity');
    expect(within(row('Identity')).getByTestId('value-status')).toHaveTextContent('Under Review');
    expect(within(row('Address')).getByTestId('value-type')).toHaveTextContent('Address');
    expect(within(row('Address')).getByTestId('value-status')).toHaveTextContent('Approved');
    expect(within(row('Email')).getByTestId('value-status')).toHaveTextContent('Verified by the App');
  });

  it('renders the identity document as a link and the address as one joined line', async () => {
    __setTableRows([identity(), address()]);
    renderWithProviders(<UserVerificationsSection userId={USER_ID} />);

    await waitFor(() => expect(row('Identity')).toBeInTheDocument());
    const link = within(row('Identity')).getByRole('link', { name: 'View' });
    expect(link).toHaveAttribute('href', 'https://cdn.test/aadhaar.pdf');
    expect(within(row('Address')).getByTestId('value-details')).toHaveTextContent(
      'Flat 3B, Pune Maharashtra 411001, India',
    );
  });

  it('offers review controls only while a row is still awaiting a decision', async () => {
    // identity() is PENDING; address() is already APPROVED; email() is the
    // app's own verification and was never ours to decide.
    __setTableRows([identity(), address(), email()]);
    renderWithProviders(<UserVerificationsSection userId={USER_ID} />);

    await waitFor(() => expect(row('Identity')).toBeInTheDocument());
    expect(within(row('Identity')).getByRole('button', { name: 'Approve' })).toBeInTheDocument();
    expect(within(row('Address')).queryByRole('button', { name: 'Reject' })).toBeNull();
    expect(within(row('Address')).getByText('No review needed')).toBeInTheDocument();
    expect(within(row('Email')).queryByRole('button', { name: 'Approve' })).toBeNull();
    expect(within(row('Email')).getByText('No review needed')).toBeInTheDocument();
  });
});

describe('UserVerificationsSection — reviewing', () => {
  it('approves with no reason and refreshes the row from the server', async () => {
    const onReview = vi.fn();
    __setTableRows([identity()]);
    renderWithProviders(<UserVerificationsSection userId={USER_ID} />, {
      mocks: [
        reviewMock(
          { user_id: USER_ID, type: 'IDENTITY', status: 'APPROVED', reject_reason: null },
          () => {
            onReview();
            __setTableRows([identity({ status: 'APPROVED' })]);
          },
        ),
      ],
    });

    await waitFor(() => expect(row('Identity')).toBeInTheDocument());
    fireEvent.click(within(row('Identity')).getByRole('button', { name: 'Approve' }));

    await waitFor(() => expect(onReview).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(within(row('Identity')).getByTestId('value-status')).toHaveTextContent('Approved'),
    );
    expect(notifyError).not.toHaveBeenCalled();
  });

  it('sends the typed reject reason with a rejection', async () => {
    const onReview = vi.fn();
    // Awaiting a decision — a settled row offers nothing to click.
    __setTableRows([address({ status: 'PENDING' })]);
    renderWithProviders(<UserVerificationsSection userId={USER_ID} />, {
      mocks: [
        reviewMock(
          {
            user_id: USER_ID,
            type: 'ADDRESS',
            status: 'REJECTED',
            reject_reason: 'Pincode does not match',
          },
          onReview,
        ),
      ],
    });

    await waitFor(() => expect(row('Address')).toBeInTheDocument());
    fireEvent.change(within(row('Address')).getByPlaceholderText('Reject reason'), {
      target: { value: 'Pincode does not match' },
    });
    fireEvent.click(within(row('Address')).getByRole('button', { name: 'Reject' }));

    await waitFor(() => expect(onReview).toHaveBeenCalledTimes(1));
    expect(notifyError).not.toHaveBeenCalled();
  });

  it('surfaces a failed review through the shared error toast', async () => {
    __setTableRows([identity()]);
    renderWithProviders(<UserVerificationsSection userId={USER_ID} />, {
      mocks: [
        failingReviewMock({
          user_id: USER_ID,
          type: 'IDENTITY',
          status: 'APPROVED',
          reject_reason: null,
        }),
      ],
    });

    await waitFor(() => expect(row('Identity')).toBeInTheDocument());
    fireEvent.click(within(row('Identity')).getByRole('button', { name: 'Approve' }));

    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('Reviewer lacks permission'));
    // The row keeps its pre-review status because nothing was saved.
    expect(within(row('Identity')).getByTestId('value-status')).toHaveTextContent('Under Review');
  });
});
