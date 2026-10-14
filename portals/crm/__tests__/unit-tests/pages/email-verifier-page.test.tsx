import '../helpers/agGridEnv';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { MemoryRouter } from 'react-router';
import {
  CRM_EMAIL_STATUSES,
  CRM_EMAIL_VERIFICATIONS_TABLE,
  CRM_VERIFY_EMAIL,
  CRM_VERIFY_EMAILS_BULK,
  type CrmEmailVerification,
} from '@/api/emailVerification.gql';
import { EmailStatusProvider } from '@/components/email-status';
import EmailVerifierPage from '@/pages/tools/email-verifier';
import { BulkCheckCard } from '@/pages/tools/email-verifier/BulkCheckCard';
import { SingleCheckCard } from '@/pages/tools/email-verifier/SingleCheckCard';
import { VerificationResult } from '@/pages/tools/email-verifier/VerificationResult';
import { renderWithApollo } from '../helpers/renderWithApollo';

const { notifySuccess, jobsState } = vi.hoisted(() => ({
  notifySuccess: vi.fn(),
  jobsState: { jobs: [] as { kind: string; status: string }[] },
}));

vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notifySuccess,
}));

vi.mock('@duncit/shell', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/shell')>()),
  useBackgroundJobs: () => ({ jobs: jobsState.jobs, cancel: vi.fn(), dismiss: vi.fn(), clearFinished: vi.fn() }),
}));

const record = (overrides: Partial<CrmEmailVerification> = {}): CrmEmailVerification => ({
  id: 'r1',
  email: 'asha@example.com',
  status: 'VERIFIED',
  is_valid_syntax: true,
  accepts_mail: true,
  is_deliverable: true,
  is_catch_all: false,
  is_disposable: false,
  is_role_account: false,
  suggestion: '',
  source: 'SINGLE',
  checked_by: 'crm@duncit.com',
  created_at: '2026-10-14T10:00:00.000Z',
  ...overrides,
});

const typed = (row: CrmEmailVerification) => ({ __typename: 'CrmEmailVerification', ...row });

const anyVariables = () => true;

const tableMock = (rows: CrmEmailVerification[]): MockedResponse => ({
  request: { query: CRM_EMAIL_VERIFICATIONS_TABLE, variables: anyVariables },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: {
    data: {
      crmEmailVerificationsTable: { __typename: 'CrmEmailVerificationTablePage', total: rows.length, rows: rows.map(typed) },
    },
  },
});

const statusesMock: MockedResponse = {
  request: { query: CRM_EMAIL_STATUSES, variables: anyVariables },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { data: { crmEmailStatuses: [] } },
};

const withStore = (ui: ReactElement) => <EmailStatusProvider>{ui}</EmailStatusProvider>;

beforeEach(() => {
  window.localStorage.clear();
  jobsState.jobs = [];
  notifySuccess.mockClear();
});

describe('VerificationResult', () => {
  it('lists what the check found and suggests a likely intended address', () => {
    renderWithApollo(
      <VerificationResult result={record({ status: 'RISKY', is_catch_all: true, is_deliverable: false, suggestion: 'asha@gmail.com' })} />,
    );

    expect(screen.getByTestId('email-status-risky')).toBeInTheDocument();
    expect(screen.getByText('Catch-all domain: Yes')).toBeInTheDocument();
    expect(screen.getByText('Mailbox exists: No')).toBeInTheDocument();
    expect(screen.getByText('Did you mean asha@gmail.com?')).toBeInTheDocument();
  });

  it('shows no suggestion when there is none', () => {
    renderWithApollo(<VerificationResult result={record()} />);
    expect(screen.queryByText(/Did you mean/)).toBeNull();
  });
});

describe('SingleCheckCard', () => {
  it('checks the typed address, shows the result and tells the page to reload its history', async () => {
    const onChecked = vi.fn();
    renderWithApollo(withStore(<SingleCheckCard onChecked={onChecked} />), [
      {
        request: { query: CRM_VERIFY_EMAIL, variables: { email: 'asha@example.com' } },
        result: { data: { crmVerifyEmail: typed(record()) } },
      },
    ]);

    fireEvent.change(screen.getByTestId('email-verify-input'), { target: { value: 'asha@example.com' } });
    fireEvent.click(screen.getByTestId('email-verify-submit'));

    expect(await screen.findByTestId('email-verify-result')).toHaveTextContent('asha@example.com');
    expect(screen.getByText('Mailbox exists: Yes')).toBeInTheDocument();
    expect(onChecked).toHaveBeenCalledTimes(1);
  });

  it('shows no result and reloads nothing when the check failed', async () => {
    const onChecked = vi.fn();
    renderWithApollo(withStore(<SingleCheckCard onChecked={onChecked} />), [
      { request: { query: CRM_VERIFY_EMAIL, variables: { email: 'asha@example.com' } }, error: new Error('Email verifier is unreachable') },
    ]);

    fireEvent.change(screen.getByTestId('email-verify-input'), { target: { value: 'asha@example.com' } });
    fireEvent.click(screen.getByTestId('email-verify-submit'));

    await waitFor(() => expect(screen.getByTestId('email-verify-submit')).toHaveTextContent('Verify'));
    expect(screen.queryByTestId('email-verify-result')).toBeNull();
    expect(onChecked).not.toHaveBeenCalled();
  });
});

describe('BulkCheckCard', () => {
  const upload = (content = 'email\nasha@example.com\n', name = 'leads.csv') => {
    const file = new File([content], name, { type: 'text/csv' });
    fireEvent.change(screen.getByTestId('email-bulk-input'), { target: { files: [file] } });
  };

  it('sends the file to the server as base64 and confirms the job started', async () => {
    const variables = vi.fn((vars: Record<string, unknown>) => {
      expect(atob(String(vars.content_base64))).toBe('email\nasha@example.com\n');
      expect(vars.filename).toBe('leads.csv');
      expect(vars.url).toBe(globalThis.location.pathname);
      return true;
    });
    renderWithApollo(<BulkCheckCard running={0} />, [
      {
        request: { query: CRM_VERIFY_EMAILS_BULK, variables },
        result: { data: { crmVerifyEmailsBulk: { __typename: 'BackgroundJob', id: 'job1', total: 1 } } },
      },
    ]);

    upload();

    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Checking 1 email. Follow the progress in the header.'));
    expect(variables).toHaveBeenCalled();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows the server’s reason when a file is refused', async () => {
    renderWithApollo(<BulkCheckCard running={0} />, [
      {
        request: { query: CRM_VERIFY_EMAILS_BULK, variables: anyVariables },
        error: new Error('No email column found — add a header named "email"'),
      },
    ]);

    upload('name\nAsha\n');

    expect(await screen.findByText(/No email column found/)).toBeInTheDocument();
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it('ignores a cancelled file picker and says when bulk checks are running', () => {
    renderWithApollo(<BulkCheckCard running={2} />);
    fireEvent.change(screen.getByTestId('email-bulk-input'), { target: { files: [] } });
    expect(screen.getByTestId('email-bulk-running')).toHaveTextContent('2 bulk checks are running');
  });
});

describe('EmailVerifierPage', () => {
  it('shows both ways to check and the history of every check', async () => {
    renderWithApollo(
      withStore(<EmailVerifierPage />),
      [tableMock([record(), record({ id: 'r2', email: 'bad@example', status: 'INVALID', source: 'BULK', suggestion: 'bad@example.com' })]), statusesMock],
    );

    expect(screen.getByRole('heading', { name: 'Email Verifier', level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Check one email' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Bulk check from CSV' })).toBeInTheDocument();
    expect(await screen.findByText('bad@example')).toBeInTheDocument();
    expect(screen.getByText('Did you mean bad@example.com?')).toBeInTheDocument();
    expect(screen.getAllByText('Bulk CSV').length).toBeGreaterThan(0);
  });

  it('reloads the history while a bulk check runs and once it finishes', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const table = tableMock([record()]);
    const variables = vi.fn(anyVariables);
    table.request.variables = variables;
    jobsState.jobs = [{ kind: 'EMAIL_VERIFY', status: 'RUNNING' }];
    // Rendered by hand so `rerender` keeps the Apollo mocks around the page.
    const tree = () => (
      <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[table, statusesMock]}>
        <MemoryRouter>{withStore(<EmailVerifierPage />)}</MemoryRouter>
      </MockedProvider>
    );
    const view = render(tree());
    await screen.findByText('asha@example.com');
    expect(screen.getByTestId('email-bulk-running')).toBeInTheDocument();
    const before = variables.mock.calls.length;

    await vi.advanceTimersByTimeAsync(5000);
    await waitFor(() => expect(variables.mock.calls.length).toBeGreaterThan(before));

    const whileRunning = variables.mock.calls.length;
    jobsState.jobs = [{ kind: 'EMAIL_VERIFY', status: 'COMPLETED' }];
    view.rerender(tree());
    await waitFor(() => expect(variables.mock.calls.length).toBeGreaterThan(whileRunning));
    expect(screen.queryByTestId('email-bulk-running')).toBeNull();
    vi.useRealTimers();
  });
});
