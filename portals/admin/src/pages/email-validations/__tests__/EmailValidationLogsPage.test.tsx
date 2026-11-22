import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import type { EmailValidationCheckKey } from '@duncit/gql-types';
import { renderWithProviders } from '../../../__tests__/testkit';
import { REVALIDATE_EMAIL, type EmailValidationLogRow } from '../queries';
import EmailValidationLogsPage from '../EmailValidationLogsPage';

const h = vi.hoisted(() => ({ rows: [] as unknown[], fetches: 0, resultKey: '' }));

// The grid is the portal-wide stub; the column builders stay real.
vi.mock('@duncit/table', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/table')>()),
  DuncitTable: (await import('../../../__tests__/table-mock')).DuncitTable,
  useApolloTableFetch: (_client: unknown, _doc: unknown, resultKey: string) => {
    h.resultKey = resultKey;
    return async () => {
      h.fetches += 1;
      return { rows: h.rows, total: h.rows.length };
    };
  },
}));

const check = (key: EmailValidationCheckKey, passed: boolean | null) => ({
  __typename: 'EmailValidationCheck' as const,
  key,
  passed,
});

const row = (over: Partial<EmailValidationLogRow> = {}): EmailValidationLogRow => ({
  id: 'v1',
  email: 'asha@example.com',
  verdict: 'RISKY',
  portal: 'finance',
  suggestion: '',
  created_at: '2026-11-20T10:00:00.000Z',
  source: 'SINGLE',
  revalidated_from: null,
  checked_by: 'fin@duncit.com',
  checks: [check('SYNTAX', true), check('SMTP_CONNECTION', false), check('MAILBOX_EXISTS', null)],
  ...over,
});

const revalidated = (id: string, newId: string): MockedResponse => ({
  request: { query: REVALIDATE_EMAIL, variables: { id } },
  result: {
    data: {
      revalidateEmail: {
        __typename: 'EmailValidation',
        ...row({ id: newId, verdict: 'VALID', portal: 'admin', revalidated_from: id, checked_by: 'admin@duncit.com' }),
        checks: [check('SYNTAX', true), check('MAILBOX_EXISTS', true)],
      },
    },
  },
});

const openMenuItem = async (index: number, item: 'view' | 'revalidate') => {
  fireEvent.click((await screen.findAllByTestId('row-actions-menu'))[index]);
  fireEvent.click(await screen.findByTestId(`row-actions-menu-${item}`));
};

beforeEach(() => {
  h.rows = [];
  h.fetches = 0;
});

describe('EmailValidationLogsPage', () => {
  it('lists the log with result, tests passed, console, how it ran and who ran it', async () => {
    h.rows = [
      row(),
      row({ id: 'v2', email: 'bulk@example.com', verdict: 'VALID', source: 'BULK', portal: 'crm' }),
      row({ id: 'v3', email: 'again@example.com', revalidated_from: 'v1', portal: 'admin' }),
    ];
    renderWithProviders(<EmailValidationLogsPage />);

    expect(screen.getByRole('heading', { name: 'Email validation logs' })).toBeInTheDocument();
    expect(h.resultKey).toBe('emailValidationsTable');
    const rows = await screen.findAllByTestId('table-row');
    expect(rows).toHaveLength(3);

    const first = within(rows[0]);
    expect(first.getByText('asha@example.com')).toBeInTheDocument();
    expect(first.getByTestId('email-verdict-risky')).toHaveTextContent('Risky');
    // Of the two tests that ran, one passed; the unrun one is not counted.
    expect(first.getByTestId('value-checks')).toHaveTextContent('1 of 2 passed');
    expect(first.getByTestId('value-portal')).toHaveTextContent('Finance');
    expect(first.getByTestId('value-source')).toHaveTextContent('One address');
    expect(first.getByText('fin@duncit.com')).toBeInTheDocument();

    expect(within(rows[1]).getByTestId('value-source')).toHaveTextContent('Bulk upload');
    expect(within(rows[1]).getByTestId('value-portal')).toHaveTextContent('CRM');
    expect(within(rows[2]).getByTestId('value-source')).toHaveTextContent('Re-validation');
  });

  it('shows the empty state when nothing was validated', async () => {
    renderWithProviders(<EmailValidationLogsPage />);
    expect(await screen.findByTestId('table-empty')).toHaveTextContent('No email addresses have been validated yet.');
  });

  it('opens a logged result without running anything', async () => {
    h.rows = [row()];
    renderWithProviders(<EmailValidationLogsPage />);

    await openMenuItem(0, 'view');

    const dialog = await screen.findByTestId('email-validation-log-dialog');
    expect(within(dialog).getByText('Validation result')).toBeInTheDocument();
    expect(within(dialog).getByTestId('email-verdict-risky')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByTestId('email-validation-log-close'));
    await waitFor(() => expect(screen.queryByTestId('email-validation-log-dialog')).not.toBeInTheDocument());
  });

  it('re-validates from the row, shows the new result, says the old one is kept and reloads the log', async () => {
    h.rows = [row()];
    renderWithProviders(<EmailValidationLogsPage />, { mocks: [revalidated('v1', 'v9')] });
    await screen.findAllByTestId('table-row');
    const before = h.fetches;

    await openMenuItem(0, 'revalidate');

    const dialog = await screen.findByTestId('email-validation-log-dialog');
    expect(await within(dialog).findByTestId('email-verdict-valid')).toBeInTheDocument();
    expect(await screen.findByText('Validated again. The earlier result is kept in the log.')).toBeInTheDocument();
    await waitFor(() => expect(h.fetches).toBe(before + 1));
  });

  it('re-validates again from the dialog, chaining from the latest result', async () => {
    h.rows = [row()];
    renderWithProviders(<EmailValidationLogsPage />, { mocks: [revalidated('v1', 'v9'), revalidated('v9', 'v10')] });

    await openMenuItem(0, 'view');
    const dialog = await screen.findByTestId('email-validation-log-dialog');
    fireEvent.click(within(dialog).getByTestId('email-validation-log-revalidate'));
    expect(await within(dialog).findByTestId('email-verdict-valid')).toBeInTheDocument();

    fireEvent.click(within(dialog).getByTestId('email-validation-log-revalidate'));
    await waitFor(() => expect(within(dialog).getByTestId('email-validation-log-revalidate')).toBeEnabled());
    expect(within(dialog).queryByTestId('email-validation-log-error')).not.toBeInTheDocument();
  });

  it('says so when the re-run fails, keeping the result it had', async () => {
    h.rows = [row()];
    const failing: MockedResponse = {
      request: { query: REVALIDATE_EMAIL, variables: { id: 'v1' } },
      error: new Error('Email verifier answered 502'),
    };
    renderWithProviders(<EmailValidationLogsPage />, { mocks: [failing] });

    await openMenuItem(0, 'revalidate');

    const error = await screen.findByTestId('email-validation-log-error');
    expect(error).toHaveTextContent('Could not validate this email again.');
    expect(error).toHaveTextContent('Email verifier answered 502');
    expect(within(screen.getByTestId('email-validation-log-dialog')).getByTestId('email-verdict-risky')).toBeInTheDocument();
  });
});
