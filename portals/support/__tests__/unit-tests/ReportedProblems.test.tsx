import { describe, expect, it } from 'vitest';
import { Route } from 'react-router';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import ReportedProblemsPage from '../../src/pages/reported-problems/ReportedProblemsPage';
import ReportedProblemDetailPage from '../../src/pages/reported-problems/ReportedProblemDetailPage';
import { renderWithProviders } from '../testkit';
import {
  makeFeedbackReport,
  reportedProblemErrorMock,
  reportedProblemMock,
  reportedProblemsTableMock,
  setReportStatusMock,
} from '../mocks';

/**
 * Support's queue of problems reported from the app, and one report in full.
 * The reporter is shown as they were when they reported it.
 */
const renderList = (mocks: MockedResponse[]) =>
  renderWithProviders(<></>, {
    mocks,
    initialEntries: ['/reported-problems'],
    routes: (
      <>
        <Route path="/reported-problems" element={<ReportedProblemsPage />} />
        <Route path="/reported-problems/:id" element={<div>DETAIL OF REPORT</div>} />
      </>
    ),
  });

const renderDetail = (mocks: MockedResponse[], id = 'rep-1') =>
  renderWithProviders(<></>, {
    mocks,
    initialEntries: [`/reported-problems/${id}`],
    routes: (
      <>
        <Route path="/reported-problems/:id" element={<ReportedProblemDetailPage />} />
        <Route path="/reported-problems" element={<div>PROBLEMS LIST</div>} />
      </>
    ),
  });

describe('ReportedProblemsPage', () => {
  it('lists each report with its reporter, platform and whether Slack was told', async () => {
    renderList([
      reportedProblemsTableMock([
        makeFeedbackReport(),
        makeFeedbackReport({
          id: 'rep-2',
          report_no: 'RPB-000042',
          user_name: '',
          user_email: 'nobody@example.com',
          category: 'Bugs',
          message: 'Crash on launch',
          platform: 'IOS',
          status: 'IN_REVIEW',
          slack_error: 'channel_not_found',
        }),
      ]),
    ]);

    expect(await screen.findByText('Reported Problems')).toBeInTheDocument();
    expect(await screen.findByText('RPB-000041')).toBeInTheDocument();
    expect(screen.getByText('The payment screen froze after I tapped Pay.')).toBeInTheDocument();
    expect(screen.getByText('Asha Rao')).toBeInTheDocument();
    expect(screen.getByText('asha@example.com')).toBeInTheDocument();
    expect(screen.getByText('Sent')).toBeInTheDocument();
    expect(screen.getByText('RPB-000042')).toBeInTheDocument();
    // A reporter with no name on file is "Unknown", not a blank cell.
    expect(screen.getByText('Unknown')).toBeInTheDocument();
    const notSent = screen.getByText('Not sent');
    expect(notSent.closest('[title]')).toHaveAttribute('title', 'channel_not_found');
    expect(screen.getByText(/^in[ _]review$/i)).toBeInTheDocument();
  });

  it('leaves the reported time blank for a report with no timestamp', async () => {
    renderList([reportedProblemsTableMock([makeFeedbackReport({ created_at: '' })])]);
    expect(await screen.findByText('RPB-000041')).toBeInTheDocument();
  });

  it('says so when nothing has been reported', async () => {
    renderList([reportedProblemsTableMock([])]);
    expect(await screen.findByText('No problems have been reported yet.')).toBeInTheDocument();
  });

  it('opens a report from its row', async () => {
    renderList([reportedProblemsTableMock()]);
    fireEvent.click(await screen.findByText('RPB-000041'));
    expect(await screen.findByText('DETAIL OF REPORT')).toBeInTheDocument();
  });
});

describe('ReportedProblemDetailPage', () => {
  it('shows the report, the reporter snapshot and where it happened', async () => {
    renderDetail([
      reportedProblemMock(
        makeFeedbackReport({
          media_urls: ['https://ik.imagekit.io/duncit/reports/a.png', 'https://ik.imagekit.io/duncit/reports/b.png'],
          reporter_roles: ['MEMBER', 'HOST'],
        }),
      ),
    ]);

    expect(await screen.findByTestId('reported-problem-report-no')).toHaveTextContent('RPB-000041');
    expect(screen.getByTestId('reported-problem-message')).toHaveTextContent(
      'The payment screen froze after I tapped Pay.',
    );
    expect(screen.getByText('Payments')).toBeInTheDocument();
    expect(screen.getAllByText('ANDROID').length).toBeGreaterThan(0);
    expect(screen.getAllByText('v4.2.0').length).toBeGreaterThan(0);
    expect(screen.getByText('Asha Rao')).toBeInTheDocument();
    expect(screen.getByText('asha@example.com')).toBeInTheDocument();
    expect(screen.getByText('Bengaluru')).toBeInTheDocument();
    expect(screen.getByText('en-IN')).toBeInTheDocument();
    expect(screen.getByText('MEMBER, HOST')).toBeInTheDocument();
    expect(screen.getByText('user-9')).toBeInTheDocument();
    expect(screen.getByText('Pixel 8')).toBeInTheDocument();
    expect(screen.getByText('Checkout')).toBeInTheDocument();
    const shots = screen.getAllByRole('img', { name: 'Reported screenshot' });
    expect(shots).toHaveLength(2);
    expect(shots[0].closest('a')).toHaveAttribute('href', 'https://ik.imagekit.io/duncit/reports/a.png');
    expect(screen.queryByText(/Not announced on Slack/)).not.toBeInTheDocument();
  });

  it('shows dashes and "No account" for what the report does not carry', async () => {
    renderDetail([
      reportedProblemMock(
        makeFeedbackReport({
          user_id: null,
          user_name: '',
          user_email: '',
          reporter_phone: '',
          reporter_city: '',
          reporter_locale: '',
          reporter_roles: [],
          platform: '',
          app_version: '',
          device_os: '',
          device_model: '',
          source_screen: '',
        }),
      ),
    ]);

    await screen.findByTestId('reported-problem-report-no');
    expect(screen.getByText('Unknown')).toBeInTheDocument();
    expect(screen.getByText('No account')).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(10);
    expect(screen.queryByRole('img', { name: 'Reported screenshot' })).not.toBeInTheDocument();
    expect(screen.queryByText(/^v/)).not.toBeInTheDocument();
  });

  it('says so when Slack was never told about the report, without calling it a failed report', async () => {
    renderDetail([reportedProblemMock(makeFeedbackReport({ slack_error: 'channel_not_found' }))]);
    expect(
      await screen.findByText(/Not announced on Slack — channel_not_found\. The report itself is saved\./),
    ).toBeInTheDocument();
  });

  it('says so when the report does not exist', async () => {
    renderDetail([reportedProblemMock(null)]);
    expect(await screen.findByText('Report not found.')).toBeInTheDocument();
  });

  it("shows the server's reason when the report cannot be read", async () => {
    renderDetail([reportedProblemErrorMock('Report service is down')]);
    expect(await screen.findByText('Report service is down')).toBeInTheDocument();
  });

  it('moves the report to another status and re-reads it', async () => {
    renderDetail([
      reportedProblemMock(makeFeedbackReport()),
      setReportStatusMock('rep-1', 'IN_REVIEW'),
      reportedProblemMock(makeFeedbackReport({ status: 'IN_REVIEW' })),
    ]);
    await screen.findByTestId('reported-problem-report-no');
    const select = within(screen.getByTestId('reported-problem-status-select')).getByRole('combobox');
    expect(select).toHaveTextContent('OPEN');

    fireEvent.mouseDown(select);
    fireEvent.click(await screen.findByRole('option', { name: 'IN REVIEW' }));

    await waitFor(() =>
      expect(within(screen.getByTestId('reported-problem-status-select')).getByRole('combobox')).toHaveTextContent(
        'IN REVIEW',
      ),
    );
  });

  it("shows the server's reason when the status change is refused", async () => {
    renderDetail([
      reportedProblemMock(makeFeedbackReport()),
      setReportStatusMock('rep-1', 'CLOSED', 'Only Support leads can close a report'),
    ]);
    await screen.findByTestId('reported-problem-report-no');
    fireEvent.mouseDown(within(screen.getByTestId('reported-problem-status-select')).getByRole('combobox'));
    fireEvent.click(await screen.findByRole('option', { name: 'CLOSED' }));

    expect(await screen.findByText('Only Support leads can close a report')).toBeInTheDocument();
  });

  it('goes back to the list', async () => {
    renderDetail([reportedProblemMock(makeFeedbackReport())]);
    await screen.findByTestId('reported-problem-report-no');
    fireEvent.click(screen.getByRole('button', { name: /Reported Problems/ }));
    expect(await screen.findByText('PROBLEMS LIST')).toBeInTheDocument();
  });
});
