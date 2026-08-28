import { useState } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { notifyError } from '@duncit/dialogs';
import ContactActionsSection from '../ContactActionsSection';
import { DELETE_USER_CONTACT_ACTION, type ContactActionRow } from '../queries';
import { renderWithProviders } from './testkit';
import { __setTableRows, tableFetchCalls } from './table-mock';

vi.mock('@duncit/table', () => import('./table-mock'));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notifyError: vi.fn(),
}));

const USER_ID = 'u-contact-1';

const call = (over: Partial<ContactActionRow> = {}): ContactActionRow => ({
  id: 'ca-1',
  type: 'CALL',
  target: '+919000000001',
  subject: 'Followed up',
  notes: 'Explained the refund',
  status: 'CONNECTED',
  duration_seconds: 180,
  recording_url: '',
  created_at: '2026-02-01T10:00:00.000Z',
  ...over,
});

/** Finds the table row whose Type cell's value is `type` (CALL / EMAIL). */
const row = (type: string) => {
  const found = screen
    .getAllByTestId('table-row')
    .find((node) => within(node).getByTestId('value-type').textContent === type);
  if (!found) throw new Error(`No contact-action row for ${type}`);
  return found;
};

/** The rendered Type chip inside a row, distinct from the plain `value-type` text. */
const typeChip = (node: HTMLElement) => node.querySelector('[data-testid="cell-type"] .MuiChip-root');

const deleteMock = (actionId: string, onCall?: () => void): MockedResponse => ({
  request: { query: DELETE_USER_CONTACT_ACTION, variables: { action_id: actionId } },
  result: () => {
    onCall?.();
    return { data: { deleteUserContactAction: true } };
  },
});

const failingDeleteMock = (actionId: string): MockedResponse => ({
  request: { query: DELETE_USER_CONTACT_ACTION, variables: { action_id: actionId } },
  error: new Error('Could not reach the contact-log service'),
});

/** Bumps `refreshToken`, mirroring how UserDetailsPage refreshes the table
 * after ContactActionDialog logs a new call/email. */
function RefreshHarness({ userId }: Readonly<{ userId: string }>) {
  const [refreshToken, setRefreshToken] = useState(0);
  return (
    <>
      <button type="button" onClick={() => setRefreshToken((v) => v + 1)}>
        bump
      </button>
      <ContactActionsSection userId={userId} refreshToken={refreshToken} />
    </>
  );
}

beforeEach(() => {
  __setTableRows([]);
  vi.mocked(notifyError).mockClear();
});

describe('ContactActionsSection — table wiring', () => {
  it('scopes the table fetch to this user and labels the section', async () => {
    renderWithProviders(<ContactActionsSection userId={USER_ID} refreshToken={0} />);

    expect(screen.getByText('Call & Email Logs')).toBeInTheDocument();
    expect(screen.getByText('Filter user outreach by type, status, or notes.')).toBeInTheDocument();
    expect(tableFetchCalls.resultKey).toBe('userContactActionsTable');
    expect(tableFetchCalls.extraVariables).toEqual({ user_id: USER_ID });
    await waitFor(() => expect(screen.getByTestId('table-empty')).toBeInTheDocument());
  });

  it('shows the empty copy when there are no logs yet', async () => {
    renderWithProviders(<ContactActionsSection userId={USER_ID} refreshToken={0} />);

    await waitFor(() => expect(screen.getByTestId('table-empty')).toBeInTheDocument());
    expect(screen.getByTestId('table-empty')).toHaveTextContent('No contact logs yet.');
  });

  it('never fetches rows when there is no user id yet', async () => {
    __setTableRows([call()]);
    renderWithProviders(<ContactActionsSection userId="" refreshToken={0} />);

    await waitFor(() => expect(screen.getByTestId('table-empty')).toBeInTheDocument());
    expect(screen.queryAllByTestId('table-row')).toHaveLength(0);
  });
});

describe('ContactActionsSection — row rendering', () => {
  it('colors a CALL chip primary and an EMAIL chip secondary', async () => {
    __setTableRows([call({ id: 'ca-1', type: 'CALL' }), call({ id: 'ca-2', type: 'EMAIL', target: 'a@b.com' })]);
    renderWithProviders(<ContactActionsSection userId={USER_ID} refreshToken={0} />);

    await waitFor(() => expect(row('CALL')).toBeInTheDocument());
    expect(typeChip(row('CALL'))).toHaveClass('MuiChip-colorPrimary');
    expect(typeChip(row('EMAIL'))).toHaveClass('MuiChip-colorSecondary');
  });

  it('shows subject, notes and a recording link only when each is present', async () => {
    __setTableRows([
      call({ id: 'ca-1', subject: 'Followed up', notes: 'Explained the refund', recording_url: 'https://cdn.test/call.mp3' }),
    ]);
    renderWithProviders(<ContactActionsSection userId={USER_ID} refreshToken={0} />);

    await waitFor(() => expect(row('CALL')).toBeInTheDocument());
    expect(within(row('CALL')).getByText('Followed up')).toBeInTheDocument();
    expect(within(row('CALL')).getByText('Explained the refund')).toBeInTheDocument();
    const link = within(row('CALL')).getByRole('link', { name: 'Recording' });
    expect(link).toHaveAttribute('href', 'https://cdn.test/call.mp3');
  });

  it('omits subject, notes and recording link entirely when none are set', async () => {
    __setTableRows([call({ id: 'ca-1', subject: '', notes: '', recording_url: '' })]);
    renderWithProviders(<ContactActionsSection userId={USER_ID} refreshToken={0} />);

    await waitFor(() => expect(row('CALL')).toBeInTheDocument());
    expect(within(row('CALL')).queryByRole('link', { name: 'Recording' })).toBeNull();
  });

  it('appends the call duration to the timestamp, and omits it when there is none', async () => {
    __setTableRows([
      call({ id: 'ca-1', created_at: '2026-02-01T10:00:00.000Z', duration_seconds: 90 }),
      call({ id: 'ca-2', created_at: '2026-02-02T10:00:00.000Z', duration_seconds: 0, type: 'EMAIL', target: 'a@b.com' }),
    ]);
    renderWithProviders(<ContactActionsSection userId={USER_ID} refreshToken={0} />);

    await waitFor(() => expect(row('CALL')).toBeInTheDocument());
    expect(within(row('CALL')).getByTestId('value-created_at').textContent).toContain('(90s)');
    expect(within(row('EMAIL')).getByTestId('value-created_at').textContent).not.toContain('s)');
  });
});

describe('ContactActionsSection — deleting a log', () => {
  it('deletes the log and refreshes the table on success', async () => {
    const onDelete = vi.fn();
    __setTableRows([call({ id: 'ca-1' })]);
    renderWithProviders(<ContactActionsSection userId={USER_ID} refreshToken={0} />, {
      mocks: [
        deleteMock('ca-1', () => {
          onDelete();
          __setTableRows([]);
        }),
      ],
    });

    await waitFor(() => expect(row('CALL')).toBeInTheDocument());
    fireEvent.click(within(row('CALL')).getByRole('button', { name: 'delete contact log' }));

    await waitFor(() => expect(onDelete).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByTestId('table-empty')).toBeInTheDocument());
    expect(notifyError).not.toHaveBeenCalled();
  });

  it('shows the server error through the shared toast when the delete fails', async () => {
    __setTableRows([call({ id: 'ca-1' })]);
    renderWithProviders(<ContactActionsSection userId={USER_ID} refreshToken={0} />, {
      mocks: [failingDeleteMock('ca-1')],
    });

    await waitFor(() => expect(row('CALL')).toBeInTheDocument());
    fireEvent.click(within(row('CALL')).getByRole('button', { name: 'delete contact log' }));

    await waitFor(() =>
      expect(notifyError).toHaveBeenCalledWith('Could not reach the contact-log service'),
    );
    // The row is still there — nothing was deleted server-side.
    expect(row('CALL')).toBeInTheDocument();
  });
});

describe('ContactActionsSection — refreshToken', () => {
  it('reloads the table whenever the parent bumps refreshToken', async () => {
    __setTableRows([call({ id: 'ca-1' })]);
    renderWithProviders(<RefreshHarness userId={USER_ID} />);

    await waitFor(() => expect(row('CALL')).toBeInTheDocument());

    __setTableRows([call({ id: 'ca-2', type: 'EMAIL', target: 'a@b.com' })]);
    fireEvent.click(screen.getByRole('button', { name: 'bump' }));

    await waitFor(() => expect(row('EMAIL')).toBeInTheDocument());
    expect(screen.queryAllByTestId('table-row')).toHaveLength(1);
  });
});
