import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { formatDateTime } from '@duncit/app-settings';
import { logs } from '@duncit/logs';
import { renderWithProviders } from '../testkit';
import { mutation, ops, resetOps } from '../mocks/ops';
import { graphQlFailure, requestRow } from '../mocks/portal-security.mock';

const spies = vi.hoisted(() => ({ client: { query: vi.fn() } }));

// The table's own fetch is real: it runs against `spies.client`, so the document
// and the result key the page asks for are the ones under test.
vi.mock('@apollo/client/react', async (io) => ({
  ...(await (await import('../mocks/ops')).apolloOpsFactory(io)),
  useApolloClient: () => spies.client,
}));
vi.mock('@duncit/dialogs', async (io) => (await import('../mocks/ops')).dialogsOpsFactory(io));

import VerificationRequestsPage from '../../src/pages/security/verification-requests';
import { PORTAL_SECURITY_EXCEPTIONS_TABLE } from '../../src/pages/security/verification-requests/queries';

const DECIDE = 'DecidePortalSecurityException';

const rowOf = (id: string) => screen.findByTestId(`tech-verification-requests-row-${id}`);

/** Opens the row's menu, picks Approve or Reject, and returns the dialog it opens. */
const openDecision = async (id: string, choice: 'approve' | 'reject') => {
  // A menu that was just closed is still on its way out; wait for it so the item found is the new one.
  await waitFor(() => expect(screen.queryByTestId(`row-actions-menu-${choice}`)).not.toBeInTheDocument());
  fireEvent.click(within(await rowOf(id)).getByTestId('row-actions-menu'));
  fireEvent.click(await screen.findByTestId(`row-actions-menu-${choice}`));
  return screen.findByRole('dialog');
};

const note = (dialog: HTMLElement) => within(dialog).getByLabelText('Note (optional)');
const submit = (dialog: HTMLElement) => within(dialog).getByTestId('decision-submit');

/** How many times the table has asked the server for its rows. */
const loads = () => spies.client.query.mock.calls.length;

beforeEach(() => {
  resetOps();
  vi.spyOn(logs.portal.tech, 'error').mockImplementation(() => undefined);
  spies.client.query.mockReset();
  spies.client.query.mockImplementation(async () => ({
    data: { portalSecurityExceptionsTable: { rows: ops.tableRows, total: ops.tableRows.length } },
  }));
  ops.tableRows = [requestRow()];
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('the request list', () => {
  it('lists each request with its status, why there was no location, and who decided it', async () => {
    ops.tableRows = [
      requestRow(),
      requestRow({
        id: 'req-2',
        user_name: 'Karan Bose',
        portal_key: 'tech',
        status: 'APPROVED',
        location_error: 'PERMISSION_DENIED',
        decided_by_name: 'Priya Nair',
        decided_at: '2026-11-21T09:00:00.000Z',
        decision_note: 'Confirmed with her manager.',
      }),
      requestRow({ id: 'req-3', status: 'FUTURE_STATUS', location_error: null }),
    ];
    renderWithProviders(<VerificationRequestsPage />);
    expect(await screen.findByRole('heading', { level: 1, name: 'Verification requests' })).toBeInTheDocument();

    const waiting = within(await rowOf('req-1'));
    expect(waiting.getByText('Meera Iyer')).toBeInTheDocument();
    expect(waiting.getByText('finance')).toBeInTheDocument();
    expect(
      waiting.getByText('My work laptop has no location service and the browser never shows the prompt.'),
    ).toBeInTheDocument();
    expect(waiting.getByText('Pending')).toBeInTheDocument();
    expect(waiting.getByText('The browser could not work out a position.')).toBeInTheDocument();
    expect(waiting.getByText(formatDateTime('2026-11-21T07:00:00.000Z'))).toBeInTheDocument();
    // Nobody has decided it, so the decided time and the note are empty rather than a stale name.
    expect(waiting.getAllByText('—')).toHaveLength(2);
    expect(waiting.queryByText(/^by /)).not.toBeInTheDocument();

    const decided = within(await rowOf('req-2'));
    expect(decided.getByText('Approved')).toBeInTheDocument();
    expect(decided.getByText('Location access was declined in the browser.')).toBeInTheDocument();
    expect(decided.getByText(formatDateTime('2026-11-21T09:00:00.000Z'))).toBeInTheDocument();
    expect(decided.getByText('by Priya Nair')).toBeInTheDocument();
    expect(decided.getByText('Confirmed with her manager.')).toBeInTheDocument();

    // A status this page has no wording for shows as the server sent it; no location problem, no
    // decision and no note are all dashes.
    const odd = within(await rowOf('req-3'));
    expect(odd.getByText('FUTURE_STATUS')).toBeInTheDocument();
    expect(odd.getAllByText('—')).toHaveLength(3);
  });

  it('asks the server for the newest request first', async () => {
    renderWithProviders(<VerificationRequestsPage />);
    await rowOf('req-1');
    expect(spies.client.query).toHaveBeenCalledWith({
      query: PORTAL_SECURITY_EXCEPTIONS_TABLE,
      variables: { query: expect.objectContaining({ page: 1, sort_by: 'created_at', sort_dir: 'desc', filters: [] }) },
      fetchPolicy: 'network-only',
    });
  });

  it('offers Approve and Reject only on a request that is still waiting', async () => {
    ops.tableRows = [
      requestRow(),
      ...['APPROVED', 'REJECTED', 'USED', 'EXPIRED', 'FUTURE_STATUS'].map((status, index) =>
        requestRow({ id: `done-${index}`, status }),
      ),
    ];
    renderWithProviders(<VerificationRequestsPage />);

    const waiting = within(await rowOf('req-1'));
    expect(waiting.getByRole('button', { name: 'Actions for Meera Iyer' })).toBeInTheDocument();
    for (let index = 0; index < 5; index += 1) {
      expect(within(await rowOf(`done-${index}`)).queryByTestId('row-actions-menu')).not.toBeInTheDocument();
    }
  });

  it('names the person in the row menu even when the request carries no name', async () => {
    ops.tableRows = [requestRow({ user_name: '' })];
    renderWithProviders(<VerificationRequestsPage />);
    expect(within(await rowOf('req-1')).getByRole('button', { name: 'Actions for —' })).toBeInTheDocument();
  });
});

describe('approving', () => {
  it('shows the whole request, then approves with the note the reviewer wrote, trimmed', async () => {
    renderWithProviders(<VerificationRequestsPage />);
    const dialog = await openDecision('req-1', 'approve');
    expect(within(dialog).getByText('Approve this request?')).toBeInTheDocument();
    expect(within(dialog).getByText(/They can verify without sharing a location/)).toBeInTheDocument();
    // The reason is read in full here, not in the cell that cuts it off.
    expect(
      within(dialog).getByText('My work laptop has no location service and the browser never shows the prompt.'),
    ).toBeInTheDocument();
    expect(within(dialog).getByText('Meera Iyer')).toBeInTheDocument();
    expect(within(dialog).getByText('finance')).toBeInTheDocument();
    expect(within(dialog).getByText('The browser could not work out a position.')).toBeInTheDocument();
    expect(within(dialog).getByText('The person sees this note.')).toBeInTheDocument();

    const before = loads();
    fireEvent.change(note(dialog), { target: { value: '  Confirmed with her manager.  ' } });
    fireEvent.click(submit(dialog));

    await waitFor(() =>
      expect(mutation(DECIDE)).toHaveBeenCalledWith({
        variables: { input: { id: 'req-1', approve: true, note: 'Confirmed with her manager.' } },
      }),
    );
    await waitFor(() => expect(ops.notifySuccess).toHaveBeenCalledWith('Request approved.'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    // The list is read again, so the request leaves the waiting state on screen.
    await waitFor(() => expect(loads()).toBeGreaterThan(before));
    expect(ops.notifyError).not.toHaveBeenCalled();
  });

  it('sends no note at all when the reviewer wrote none', async () => {
    renderWithProviders(<VerificationRequestsPage />);
    const dialog = await openDecision('req-1', 'approve');
    fireEvent.click(submit(dialog));
    await waitFor(() =>
      expect(mutation(DECIDE)).toHaveBeenCalledWith({ variables: { input: { id: 'req-1', approve: true, note: null } } }),
    );
  });

  it('treats a note of only spaces as no note', async () => {
    renderWithProviders(<VerificationRequestsPage />);
    const dialog = await openDecision('req-1', 'approve');
    fireEvent.change(note(dialog), { target: { value: '     ' } });
    fireEvent.click(submit(dialog));
    await waitFor(() =>
      expect(mutation(DECIDE)).toHaveBeenCalledWith({ variables: { input: { id: 'req-1', approve: true, note: null } } }),
    );
  });
});

describe('rejecting', () => {
  it('rejects the request with the note, and says so', async () => {
    renderWithProviders(<VerificationRequestsPage />);
    const dialog = await openDecision('req-1', 'reject');
    expect(within(dialog).getByText('Reject this request?')).toBeInTheDocument();
    expect(within(dialog).getByText('They will need to share a location to continue.')).toBeInTheDocument();
    expect(submit(dialog)).toHaveTextContent('Reject');

    fireEvent.change(note(dialog), { target: { value: 'Use the office network and try again.' } });
    fireEvent.click(submit(dialog));

    await waitFor(() =>
      expect(mutation(DECIDE)).toHaveBeenCalledWith({
        variables: { input: { id: 'req-1', approve: false, note: 'Use the office network and try again.' } },
      }),
    );
    await waitFor(() => expect(ops.notifySuccess).toHaveBeenCalledWith('Request rejected.'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

describe('the note rules', () => {
  it('refuses a note over 300 characters without calling the server, and accepts exactly 300', async () => {
    renderWithProviders(<VerificationRequestsPage />);
    const dialog = await openDecision('req-1', 'approve');

    fireEvent.change(note(dialog), { target: { value: 'a'.repeat(301) } });
    fireEvent.click(submit(dialog));
    expect(await within(dialog).findByText('Keep the note within 300 characters.')).toBeInTheDocument();
    expect(mutation(DECIDE)).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Trimmed to 300, the note passes, and the message goes as soon as it does.
    fireEvent.change(note(dialog), { target: { value: `  ${'a'.repeat(300)}  ` } });
    await waitFor(() =>
      expect(within(dialog).queryByText('Keep the note within 300 characters.')).not.toBeInTheDocument(),
    );
    fireEvent.click(submit(dialog));
    await waitFor(() =>
      expect(mutation(DECIDE)).toHaveBeenCalledWith({
        variables: { input: { id: 'req-1', approve: true, note: 'a'.repeat(300) } },
      }),
    );
  });
});

describe('when the server refuses the decision', () => {
  it.each([
    [
      'CONFLICT',
      'This request has already been decided',
      'This request was already decided, so nothing changed. The list has been refreshed.',
    ],
    ['FORBIDDEN', 'You cannot decide your own request', 'You are not allowed to decide this request. You cannot decide your own.'],
    ['NOT_FOUND', 'Request not found', 'This request no longer exists. The list has been refreshed.'],
  ])('explains a %s in words, closes the dialog and reloads the stale list', async (code, serverMessage, expected) => {
    ops.mut[DECIDE] = vi.fn().mockRejectedValue(graphQlFailure(code, serverMessage));
    renderWithProviders(<VerificationRequestsPage />);
    const dialog = await openDecision('req-1', 'approve');
    const before = loads();

    fireEvent.click(submit(dialog));

    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledWith(expected));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(loads()).toBeGreaterThan(before));
    expect(ops.notifySuccess).not.toHaveBeenCalled();
    expect(ops.notifyError).not.toHaveBeenCalledWith(serverMessage);
    expect(logs.portal.tech.error).toHaveBeenCalledWith(
      'VerificationRequests',
      'decide',
      expect.objectContaining({ code, request_id: 'req-1' }),
    );
  });

  it('keeps the dialog and the note when the connection fails, so the reviewer can try again', async () => {
    // Fails once, as a dropped connection does, then answers.
    ops.mut[DECIDE] = vi
      .fn()
      .mockRejectedValueOnce(new Error('Failed to fetch'))
      .mockResolvedValue({ data: {} });
    renderWithProviders(<VerificationRequestsPage />);
    const dialog = await openDecision('req-1', 'approve');
    const before = loads();
    fireEvent.change(note(dialog), { target: { value: 'Looks fine.' } });
    fireEvent.click(submit(dialog));

    await waitFor(() =>
      expect(ops.notifyError).toHaveBeenCalledWith('The request could not be decided. Please try again.'),
    );
    expect(ops.notifyError).not.toHaveBeenCalledWith('Failed to fetch');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(note(dialog)).toHaveValue('Looks fine.');
    expect(submit(dialog)).toBeEnabled();
    expect(loads()).toBe(before);
    expect(logs.portal.tech.error).toHaveBeenCalledWith(
      'VerificationRequests',
      'decide',
      expect.objectContaining({ request_id: 'req-1' }),
    );

    // The retry goes through with what was typed — the same request, not a new one.
    fireEvent.click(submit(dialog));
    await waitFor(() => expect(ops.notifySuccess).toHaveBeenCalledWith('Request approved.'));
    const attempt = { variables: { input: { id: 'req-1', approve: true, note: 'Looks fine.' } } };
    expect(mutation(DECIDE).mock.calls).toEqual([[attempt], [attempt]]);
  });
});

describe('leaving the dialog', () => {
  it('cancels without deciding, and the next request starts with a blank note', async () => {
    ops.tableRows = [requestRow(), requestRow({ id: 'req-2', user_name: 'Karan Bose' })];
    renderWithProviders(<VerificationRequestsPage />);
    const first = await openDecision('req-1', 'reject');
    fireEvent.change(note(first), { target: { value: 'half written' } });
    fireEvent.click(within(first).getByTestId('decision-cancel'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(mutation(DECIDE)).not.toHaveBeenCalled();

    const second = await openDecision('req-2', 'reject');
    expect(within(second).getByText('Karan Bose')).toBeInTheDocument();
    expect(note(second)).toHaveValue('');
  });

  it('closes on Escape while nothing is being sent', async () => {
    renderWithProviders(<VerificationRequestsPage />);
    const dialog = await openDecision('req-1', 'approve');
    fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('cannot be dismissed, or submitted twice, while the decision is on its way', async () => {
    ops.mutLoading[DECIDE] = true;
    renderWithProviders(<VerificationRequestsPage />);
    const dialog = await openDecision('req-1', 'approve');
    expect(submit(dialog)).toBeDisabled();
    expect(within(dialog).getByTestId('decision-cancel')).toBeDisabled();
    fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
