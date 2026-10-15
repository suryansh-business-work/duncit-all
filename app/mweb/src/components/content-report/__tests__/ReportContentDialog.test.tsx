import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { GraphQLError } from 'graphql';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logs } from '@duncit/logs';
import ReportContentDialog from '../ReportContentDialog';
import { MY_OPEN_REPORT, REPORT_CATEGORIES, REPORT_POST } from '../queries';

const h = vi.hoisted(() => ({ notify: vi.fn() }));
vi.mock('../../notify', () => ({ notify: h.notify }));

const ALREADY_PENDING = 'You can’t report this again until our team resolves your earlier report.';

const categoriesMock: MockedResponse = {
  request: { query: REPORT_CATEGORIES },
  result: {
    data: {
      reportCategories: [
        { key: 'SPAM', label: 'Spam', description: '', requires_details: false },
        { key: 'OTHER', label: 'Something else', description: 'Tell us more', requires_details: true },
      ],
    },
  },
};

const openReport = (myOpenReport: { id: string; report_no: string } | null): MockedResponse => ({
  request: { query: MY_OPEN_REPORT, variables: { id: 'post-1' } },
  result: { data: { myOpenReport } },
});

const reportPost = (answer: MockedResponse['result'] | Error, reason = 'SPAM', details = ''): MockedResponse => ({
  request: { query: REPORT_POST, variables: { id: 'post-1', reason, details } },
  ...(answer instanceof Error ? { error: answer } : { result: answer }),
});

function renderDialog(mocks: MockedResponse[], targetId: string | null = 'post-1') {
  const onClose = vi.fn();
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <ReportContentDialog targetId={targetId} kind="POST" onClose={onClose} />
    </MockedProvider>,
  );
  return { onClose };
}

const pickSpam = async () => fireEvent.click(await screen.findByLabelText('Spam'));

beforeEach(() => h.notify.mockReset());
afterEach(() => vi.restoreAllMocks());

describe('ReportContentDialog — checking for an earlier report', () => {
  it('checks first: a labelled spinner, a busy body, and no way to submit yet', () => {
    renderDialog([openReport(null), categoriesMock]);
    expect(screen.getByRole('dialog', { name: 'Report this post' })).toBeInTheDocument();
    const checking = screen.getByTestId('report-content-checking');
    expect(within(checking).getByRole('progressbar')).toHaveAccessibleName('Checking your earlier reports');
    expect(checking.parentElement).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByTestId('report-content-details')).not.toBeInTheDocument();
    expect(screen.getByTestId('report-content-submit')).toBeDisabled();
  });

  it('shows the form once there is no open report', async () => {
    renderDialog([openReport(null), categoriesMock]);
    expect(await screen.findByTestId('report-content-details')).toBeInTheDocument();
    expect(screen.queryByTestId('report-content-checking')).not.toBeInTheDocument();
    expect(screen.queryByTestId('report-content-pending')).not.toBeInTheDocument();
    expect(screen.getByTestId('report-content-submit')).toBeEnabled();
  });

  it('asks nothing and shows nothing while closed', () => {
    const asked = vi.fn(() => true);
    renderDialog([{ request: { query: MY_OPEN_REPORT, variables: asked }, result: { data: { myOpenReport: null } } }], null);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(asked).not.toHaveBeenCalled();
  });
});

describe('ReportContentDialog — an earlier report is still open', () => {
  it('shows the pending notice with the earlier reference instead of the form, and closes on Done', async () => {
    const { onClose } = renderDialog([openReport({ id: 'r1', report_no: 'RPT-0042' }), categoriesMock]);
    const notice = await screen.findByTestId('report-content-pending');
    expect(notice).toHaveAttribute('role', 'status');
    expect(notice).toHaveTextContent('Already reported by you');
    expect(notice).toHaveTextContent(`${ALREADY_PENDING} Your reference is RPT-0042.`);

    expect(screen.queryByTestId('report-content-details')).not.toBeInTheDocument();
    expect(screen.queryByTestId('report-content-submit')).not.toBeInTheDocument();
    expect(screen.queryByTestId('report-content-cancel')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('says the same without a reference when the server kept none', async () => {
    renderDialog([openReport({ id: 'r1', report_no: '' }), categoriesMock]);
    const notice = await screen.findByTestId('report-content-pending');
    expect(notice).toHaveTextContent(ALREADY_PENDING);
    expect(notice).not.toHaveTextContent('Your reference is');
  });

  it('falls back to the form when the check itself fails, and logs it', async () => {
    const warn = vi.spyOn(logs.mWeb, 'warn').mockImplementation(() => undefined);
    renderDialog([
      { request: { query: MY_OPEN_REPORT, variables: { id: 'post-1' } }, error: new Error('Network down') },
      categoriesMock,
    ]);
    expect(await screen.findByTestId('report-content-details')).toBeInTheDocument();
    expect(screen.queryByTestId('report-content-pending')).not.toBeInTheDocument();
    expect(warn).toHaveBeenCalledWith('contentReport', 'myOpenReport', expect.objectContaining({ error: expect.anything() }));
  });
});

describe('ReportContentDialog — submitting', () => {
  it('asks for a reason before sending anything', async () => {
    renderDialog([openReport(null), categoriesMock]);
    await screen.findByLabelText('Spam');
    fireEvent.click(screen.getByTestId('report-content-submit'));
    expect(await screen.findByTestId('report-content-error')).toHaveTextContent('Pick a reason first');
    expect(h.notify).not.toHaveBeenCalled();
  });

  it('sends the report, thanks the reporter with the reference and closes', async () => {
    const { onClose } = renderDialog([
      openReport(null),
      categoriesMock,
      reportPost({ data: { reportPost: { id: 'r9', report_no: 'RPT-0099' } } }),
    ]);
    await pickSpam();
    fireEvent.click(screen.getByTestId('report-content-submit'));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(h.notify).toHaveBeenCalledWith(
      'Thanks — our Legal team will review this. Your reference is RPT-0099.',
      'success',
    );
  });

  it('names a repeat the server refused (REPORT_ALREADY_PENDING) in its own words, not the raw message', async () => {
    const { onClose } = renderDialog([
      openReport(null),
      categoriesMock,
      reportPost({
        errors: [new GraphQLError('duplicate report', { extensions: { code: 'REPORT_ALREADY_PENDING' } })],
      }),
    ]);
    await pickSpam();
    fireEvent.click(screen.getByTestId('report-content-submit'));
    const error = await screen.findByTestId('report-content-error');
    expect(error).toHaveTextContent(ALREADY_PENDING);
    expect(error).not.toHaveTextContent('duplicate report');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('shows the server’s message for any other refusal', async () => {
    renderDialog([
      openReport(null),
      categoriesMock,
      reportPost({ errors: [new GraphQLError('This post was removed', { extensions: { code: 'NOT_FOUND' } })] }),
    ]);
    await pickSpam();
    fireEvent.click(screen.getByTestId('report-content-submit'));
    expect(await screen.findByTestId('report-content-error')).toHaveTextContent('This post was removed');
    expect(h.notify).not.toHaveBeenCalled();
  });
});
