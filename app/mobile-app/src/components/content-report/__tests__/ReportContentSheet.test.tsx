import { act, configure, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { logs } from '@duncit/logs';

import { ReportContentSheet } from '@/components/content-report/ReportContentSheet';
import { ReportPendingNotice } from '@/components/content-report/ReportPendingNotice';
import {
  MyOpenReportDocument,
  ReportCategoriesDocument,
  ReportPostDocument,
  ReportProfileDocument,
} from '@/graphql/report';
import { graphqlRequest } from '@/services/graphql.client';
import { ApiError } from '@/utils/errors';
import { renderWithProviders } from '@/utils/test-utils';

// Several requests settle before the form shows; give CI's coverage run room.
configure({ asyncUtilTimeout: 5000 });
jest.setTimeout(20000);

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));

const mockRequest = graphqlRequest as jest.Mock;

const categories = [
  { key: 'SPAM', label: 'Spam', description: '', requires_details: false },
  { key: 'OTHER', label: 'Something else', description: 'Tell us more', requires_details: true },
];

interface Answers {
  open?: () => Promise<unknown>;
  categories?: () => Promise<unknown>;
  send?: () => Promise<unknown>;
}

/**
 * Answers by operation, not call order: the sheet asks for the categories and
 * the viewer's open report at once, and the provider stack makes requests of
 * its own through the same client.
 */
function answerWith({
  open = () => Promise.resolve({ myOpenReport: null }),
  categories: cats = () => Promise.resolve({ reportCategories: categories }),
  send = () => Promise.resolve({}),
}: Answers = {}) {
  mockRequest.mockImplementation((document: unknown) => {
    if (document === MyOpenReportDocument) return open();
    if (document === ReportCategoriesDocument) return cats();
    if (document === ReportPostDocument || document === ReportProfileDocument) return send();
    return Promise.resolve({});
  });
}

const sentPost = () => Promise.resolve({ reportPost: { id: 'r1', report_no: 'REP-101' } });

async function openForm(props: Partial<Parameters<typeof ReportContentSheet>[0]> = {}) {
  const view = renderWithProviders(
    <ReportContentSheet targetId="post-1" kind="POST" onClose={jest.fn()} {...props} />,
  );
  await screen.findByTestId('report-reason-SPAM');
  return view;
}

beforeEach(() => {
  mockRequest.mockReset();
  answerWith();
});

describe('ReportContentSheet', () => {
  it('stays closed and asks nothing while there is no target', () => {
    renderWithProviders(<ReportContentSheet targetId={null} kind="POST" onClose={jest.fn()} />);
    expect(screen.queryByTestId('report-content-sheet')).toBeNull();
    expect(mockRequest).not.toHaveBeenCalledWith(
      MyOpenReportDocument,
      expect.anything(),
      expect.anything(),
    );
  });

  it('checks for an earlier report first, with Submit held until it answers', async () => {
    let answerOpen: (value: unknown) => void = () => undefined;
    answerWith({
      open: () =>
        new Promise((resolve) => {
          answerOpen = resolve;
        }),
    });
    renderWithProviders(<ReportContentSheet targetId="post-1" kind="POST" onClose={jest.fn()} />);
    expect(await screen.findByTestId('report-content-checking')).toBeOnTheScreen();
    expect(screen.getByLabelText('Checking your earlier reports')).toBeOnTheScreen();
    expect(screen.getByTestId('report-content-submit').props['aria-disabled']).toBe(true);
    expect(screen.queryByTestId('report-content-details')).toBeNull();
    expect(mockRequest).toHaveBeenCalledWith(
      MyOpenReportDocument,
      { id: 'post-1' },
      { auth: true },
    );

    await act(async () => {
      answerOpen({ myOpenReport: null });
    });
    expect(screen.queryByTestId('report-content-checking')).toBeNull();
    expect(await screen.findByTestId('report-content-details')).toBeOnTheScreen();
    expect(
      screen.getByText('Tell us what is wrong with it. Our Legal team reviews every report.'),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('report-content-submit').props['aria-disabled']).toBe(false);
  });

  it('shows the earlier, still-open report instead of the form', async () => {
    const onClose = jest.fn();
    answerWith({
      open: () => Promise.resolve({ myOpenReport: { id: 'r0', report_no: 'REP-7' } }),
    });
    renderWithProviders(<ReportContentSheet targetId="post-1" kind="POST" onClose={onClose} />);
    expect(await screen.findByTestId('report-content-pending')).toBeOnTheScreen();
    expect(screen.getByText('Already reported by you')).toBeOnTheScreen();
    expect(screen.getByText(/Your reference is REP-7\./)).toBeOnTheScreen();
    expect(screen.queryByTestId('report-content-details')).toBeNull();
    expect(screen.queryByTestId('report-content-submit')).toBeNull();
    expect(
      screen.queryByText('Tell us what is wrong with it. Our Legal team reviews every report.'),
    ).toBeNull();
    fireEvent.press(screen.getByTestId('report-content-done'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('falls back to the form when the earlier-report check fails', async () => {
    const warn = jest.spyOn(logs.mobileApp, 'warn').mockImplementation(() => undefined);
    const failure = new Error('offline');
    answerWith({ open: () => Promise.reject(failure) });
    await openForm();
    expect(screen.queryByTestId('report-content-pending')).toBeNull();
    expect(screen.getByTestId('report-content-submit')).toBeOnTheScreen();
    expect(warn).toHaveBeenCalledWith('contentReport', 'myOpenReport', { error: failure });
    warn.mockRestore();
  });

  it('asks for a reason, then for words when the reason needs them', async () => {
    await openForm();
    fireEvent.press(screen.getByTestId('report-content-submit'));
    expect(await screen.findByTestId('report-content-error')).toHaveTextContent(
      'Pick a reason first',
    );
    fireEvent.press(screen.getByTestId('report-reason-OTHER'));
    fireEvent.changeText(screen.getByTestId('report-content-details'), '   ');
    fireEvent.press(screen.getByTestId('report-content-submit'));
    await waitFor(() =>
      expect(screen.getByTestId('report-content-error')).toHaveTextContent(
        'Tell us what is wrong with this content',
      ),
    );
    expect(mockRequest).not.toHaveBeenCalledWith(
      ReportPostDocument,
      expect.anything(),
      expect.anything(),
    );
  });

  it('files the post report, shows its reference and closes on Done', async () => {
    const onClose = jest.fn();
    const onReported = jest.fn();
    answerWith({ send: sentPost });
    await openForm({ onClose, onReported });
    fireEvent.press(screen.getByTestId('report-reason-OTHER'));
    fireEvent.changeText(screen.getByTestId('report-content-details'), '  Copied my photo  ');
    fireEvent.press(screen.getByTestId('report-content-submit'));

    expect(await screen.findByTestId('report-content-received')).toBeOnTheScreen();
    expect(mockRequest).toHaveBeenCalledWith(
      ReportPostDocument,
      { id: 'post-1', reason: 'OTHER', details: 'Copied my photo' },
      { auth: true },
    );
    expect(screen.getByText(/Your reference is REP-101\./)).toBeOnTheScreen();
    expect(onReported).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('report-content-details')).toBeNull();
    expect(screen.queryByTestId('report-content-submit')).toBeNull();
    fireEvent.press(screen.getByTestId('report-content-done'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('files a profile report through its own mutation', async () => {
    answerWith({
      send: () => Promise.resolve({ reportProfile: { id: 'r2', report_no: 'REP-202' } }),
    });
    renderWithProviders(
      <ReportContentSheet targetId="user-9" kind="PROFILE" onClose={jest.fn()} />,
    );
    await screen.findByTestId('report-reason-SPAM');
    expect(screen.getByText('Report this profile')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('report-reason-SPAM'));
    fireEvent.press(screen.getByTestId('report-content-submit'));
    expect(await screen.findByText(/Your reference is REP-202\./)).toBeOnTheScreen();
    expect(mockRequest).toHaveBeenCalledWith(
      ReportProfileDocument,
      { id: 'user-9', reason: 'SPAM', details: '' },
      { auth: true },
    );
  });

  it('shows the sending state on the button while the report is in flight', async () => {
    let land: (value: unknown) => void = () => undefined;
    answerWith({
      send: () =>
        new Promise((resolve) => {
          land = resolve;
        }),
    });
    await openForm();
    fireEvent.press(screen.getByTestId('report-reason-SPAM'));
    fireEvent.press(screen.getByTestId('report-content-submit'));
    expect(await screen.findByTestId('report-content-submit-spinner')).toBeOnTheScreen();
    expect(screen.getByLabelText('Sending your report')).toBeOnTheScreen();
    await act(async () => {
      land({ reportPost: { id: 'r3', report_no: '' } });
    });
    // No reference came back: the generic acknowledgement, not an empty one.
    expect(await screen.findByTestId('report-content-received')).toHaveTextContent(
      /Thanks — our Legal team will review this$/,
    );
  });

  it('names a refusal for an already-open report in plain words', async () => {
    answerWith({
      send: () =>
        Promise.reject(new ApiError('server words', 409, { code: 'REPORT_ALREADY_PENDING' })),
    });
    await openForm();
    fireEvent.press(screen.getByTestId('report-reason-SPAM'));
    fireEvent.press(screen.getByTestId('report-content-submit'));
    expect(await screen.findByTestId('report-content-error')).toHaveTextContent(
      'You can’t report this again until our team resolves your earlier report.',
    );
    expect(screen.queryByText('server words')).toBeNull();
  });

  it('shows the server message for any other refusal', async () => {
    answerWith({ send: () => Promise.reject(new ApiError('Post was removed', 404)) });
    await openForm();
    fireEvent.press(screen.getByTestId('report-reason-SPAM'));
    fireEvent.press(screen.getByTestId('report-content-submit'));
    expect(await screen.findByTestId('report-content-error')).toHaveTextContent('Post was removed');
    // Still the form: the member can try again.
    expect(screen.getByTestId('report-content-submit')).toBeOnTheScreen();
  });

  it('falls back to its own words when the failure carries none', async () => {
    // A GraphQL error with a blank message: nothing worth showing came back.
    const blank = Object.assign(new Error(''), { errors: [{ message: '' }] });
    answerWith({ send: () => Promise.reject(blank) });
    await openForm();
    fireEvent.press(screen.getByTestId('report-reason-SPAM'));
    fireEvent.press(screen.getByTestId('report-content-submit'));
    expect(await screen.findByTestId('report-content-error')).toHaveTextContent(
      'Could not send your report',
    );
  });

  it('offers a retry when the reasons cannot be loaded', async () => {
    let failed = false;
    answerWith({
      categories: () => {
        if (failed) return Promise.resolve({ reportCategories: categories });
        failed = true;
        return Promise.reject(new Error('offline'));
      },
    });
    renderWithProviders(<ReportContentSheet targetId="post-1" kind="STORY" onClose={jest.fn()} />);
    fireEvent.press(await screen.findByTestId('report-categories-retry'));
    expect(await screen.findByTestId('report-reason-SPAM')).toBeOnTheScreen();
  });

  // One sheet instance serves every post: a new target starts from a clean form.
  it('starts over for the next target', async () => {
    answerWith({ send: sentPost });
    const onClose = jest.fn();
    const view = await openForm({ onClose });
    fireEvent.changeText(screen.getByTestId('report-content-details'), 'Spam links');
    fireEvent.press(screen.getByTestId('report-content-submit'));
    expect(await screen.findByTestId('report-content-error')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('report-reason-SPAM'));
    fireEvent.press(screen.getByTestId('report-content-submit'));
    await screen.findByTestId('report-content-received');

    view.rerender(<ReportContentSheet targetId="post-2" kind="POST" onClose={onClose} />);
    expect(await screen.findByTestId('report-content-details')).toBeOnTheScreen();
    expect(screen.queryByTestId('report-content-received')).toBeNull();
    expect(screen.queryByTestId('report-content-error')).toBeNull();
    expect(screen.getByTestId('report-content-details').props.value).toBe('');
    expect(mockRequest).toHaveBeenCalledWith(
      MyOpenReportDocument,
      { id: 'post-2' },
      { auth: true },
    );
  });
});

describe('ReportPendingNotice', () => {
  it('quotes the earlier report reference', () => {
    renderWithProviders(<ReportPendingNotice reportNo="REP-55" />);
    expect(screen.getByTestId('report-content-pending')).toBeOnTheScreen();
    expect(screen.getByText('Already reported by you')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'You can’t report this again until our team resolves your earlier report. Your reference is REP-55.',
      ),
    ).toBeOnTheScreen();
  });

  it('says the same thing without a reference when the server gave none', () => {
    renderWithProviders(<ReportPendingNotice reportNo="" />);
    expect(
      screen.getByText('You can’t report this again until our team resolves your earlier report.'),
    ).toBeOnTheScreen();
  });
});
