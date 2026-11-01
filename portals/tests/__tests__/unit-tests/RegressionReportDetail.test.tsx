import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { Route } from 'react-router';
import { renderWithProviders } from '../testkit';
import { ops, resetOps } from '../mocks/ops';
import type { RegressionItemRow, RegressionReportDetail } from '../../src/pages/regression/queries';

vi.mock('@apollo/client/react', async (io) => (await import('../mocks/ops')).apolloOpsFactory(io));
vi.mock('@duncit/table', async (io) => {
  const actual = await io<typeof import('@duncit/table')>();
  const { ops: o } = await import('../mocks/ops');
  return { ...actual, useApolloTableFetch: () => async () => ({ rows: o.tableRows, total: o.tableRows.length }) };
});

import RegressionReportDetailPage from '../../src/pages/regression/report-detail';

const report = (over: Partial<RegressionReportDetail> = {}): RegressionReportDetail => ({
  id: 'rr1',
  kind: 'E2E',
  status: 'REGRESSED',
  run_id: 'run2',
  run_no: 'DUN-E2E-000102',
  base_run_id: 'run1',
  base_run_no: 'DUN-E2E-000101',
  branch: 'staging',
  workflow: '',
  created_at: '2026-10-31T10:00:00.000Z',
  items_kept: 1,
  truncated: false,
  items_purged: false,
  skipped_workspaces: [],
  counts: { regressed: 1, fixed: 0, still_failing: 2, new_failing: 0, new_tests: 0, removed_tests: 0 },
  coverage_total: null,
  coverage_workspaces: [],
  suites: [
    {
      suite: 'accounts',
      status_before: 'PASSED',
      status_after: 'FAILED',
      changed: true,
      passed_before: 10,
      passed_after: 9,
      passed_delta: -1,
      failed_before: 0,
      failed_after: 1,
      failed_delta: 1,
      tests_before: 10,
      tests_after: 10,
    },
  ],
  ...over,
});

const scenario: RegressionItemRow = {
  id: 'it1',
  bucket: 'REGRESSED',
  workspace: 'accounts',
  file: 'mweb/accounts/login.cy.ts',
  full_name: 'Login › signs in with OTP',
  title: 'signs in with OTP',
  failure_message: 'expected 200, got 500\n at spec',
};

const mount = (detail: RegressionReportDetail) => {
  ops.q = { RegressionReport: { data: { regressionReport: detail } } };
  return renderWithProviders(<></>, {
    initialEntries: ['/regression/rr1'],
    routes: <Route path="/regression/:reportId" element={<RegressionReportDetailPage />} />,
  });
};

beforeEach(() => {
  resetOps();
  ops.tableRows = [scenario];
});

describe('Regression report detail', () => {
  it('lists an E2E report scenario by scenario, grouped by suite, beside a suites tab', async () => {
    mount(report());

    expect(await screen.findByRole('tab', { name: 'Regressed (1)' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Still failing (2)' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'E2E suites' })).toBeInTheDocument();
    // An E2E report has no coverage to compare.
    expect(screen.queryByRole('tab', { name: 'Coverage change' })).not.toBeInTheDocument();

    expect(await screen.findByText('Login › signs in with OTP')).toBeInTheDocument();
    expect(screen.getByText('mweb/accounts/login.cy.ts')).toBeInTheDocument();
    expect(screen.getByText('expected 200, got 500')).toBeInTheDocument();
    expect(screen.getByText('Suite')).toBeInTheDocument();
    expect(screen.queryByText('Workspace')).not.toBeInTheDocument();
  });

  it('shows the suites side by side on the suites tab', async () => {
    mount(report());

    fireEvent.click(await screen.findByRole('tab', { name: 'E2E suites' }));

    expect(await screen.findByText('Changed')).toBeInTheDocument();
    expect(screen.getByText('accounts')).toBeInTheDocument();
    expect(screen.queryByText('Login › signs in with OTP')).not.toBeInTheDocument();
  });

  it('keeps the coverage tab and workspace column for a unit report', async () => {
    ops.tableRows = [{ ...scenario, workspace: 'server', file: 'src/a.test.ts', full_name: 'a › works' }];
    mount(report({ kind: 'UNIT', workflow: 'SONAR', suites: [] }));

    expect(await screen.findByRole('tab', { name: 'Coverage change' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'E2E suites' })).not.toBeInTheDocument();
    expect(await screen.findByText('a › works')).toBeInTheDocument();
    expect(screen.getByText('Workspace')).toBeInTheDocument();
  });
});
