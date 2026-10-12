import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { notifySuccess } from '@duncit/dialogs';
import ReportedContentTab from '../../src/pages/ugc-monitoring/reported/ReportedContentTab';
import { renderWithProviders } from '../testkit';
import {
  makeContentReport,
  makeReportCategory,
  markReportOkMock,
  reportCategoriesMock,
  sendReportMailMock,
  takeDownReportMock,
  updateReportStatusErrorMock,
  updateReportStatusMock,
} from '../mocks';
import { __setTableRows } from './table-mock';

vi.mock('@duncit/table', () => import('./table-mock'));
vi.mock(import('@duncit/dialogs'), async (importOriginal) => ({
  ...(await importOriginal()),
  notifySuccess: vi.fn(),
}));

/**
 * Legal's queue of everything users reported, and the dialog that answers one.
 * The preview is the snapshot taken at report time — a story is usually gone
 * by the time anybody looks.
 */
const PHOTO = makeContentReport();
const VIDEO = makeContentReport({
  id: 'rpt-2',
  report_no: 'RPT-000124',
  target_type: 'POST',
  target_preview_url: 'https://ik.imagekit.io/duncit/posts/rally.mp4?tr=orig',
  target_caption: '',
  reason: 'OTHER',
  reason_label: 'Something else',
  details: '',
  reporter_name: '',
  target_owner_name: '',
  status: 'RECEIVED',
  resolution: 'Asked the club admin to review.',
});
const NO_PREVIEW = makeContentReport({
  id: 'rpt-3',
  report_no: 'RPT-000125',
  target_type: 'PROFILE',
  target_preview_url: '',
  status: 'ACTIONED',
});

// The tab also reads the report categories, for the Reason filter's options.
const renderPage = (mocks: MockedResponse[] = []) =>
  renderWithProviders(<ReportedContentTab />, { mocks: [reportCategoriesMock(), ...mocks] });

const openRow = async (index: number) => {
  await screen.findAllByText('RPT-000123');
  fireEvent.click(screen.getAllByTestId('table-row')[index]);
  return screen.findByRole('dialog');
};

beforeEach(() => {
  vi.mocked(notifySuccess).mockClear();
  __setTableRows([PHOTO, VIDEO, NO_PREVIEW]);
});

describe('ReportedContentTab — the queue', () => {
  it('shows each report with its snapshot and status', async () => {
    renderPage();
    await screen.findAllByText('RPT-000123');
    const [photo, video, noPreview] = screen.getAllByTestId('table-row');

    expect(within(photo).getAllByText('Story').length).toBeGreaterThan(0);
    expect(within(photo).getAllByText('In review').length).toBeGreaterThan(0);
    expect(photo.querySelector('img')).toHaveAttribute('src', PHOTO.target_preview_url);
    expect(within(video).getAllByText('Received').length).toBeGreaterThan(0);
    expect(within(noPreview).getAllByText('Profile').length).toBeGreaterThan(0);
    // A report without a snapshot falls back to the placeholder icon.
    expect(noPreview.querySelector('img')).toBeNull();
    expect(within(noPreview).getByTestId('ImageNotSupportedOutlinedIcon')).toBeInTheDocument();
  });
});

describe('ReportedContentTab — the dialog', () => {
  it('shows a photo snapshot with its caption and the people involved', async () => {
    renderPage();
    const dialog = await openRow(0);

    expect(within(dialog).getByText('Report RPT-000123')).toBeInTheDocument();
    const img = within(dialog).getByRole('img', { name: 'Saturday doubles at Court 2' });
    expect(img).toHaveAttribute('src', PHOTO.target_preview_url);
    expect(within(dialog).getByText('Posted by: Rahul Mehta · Reported by: Asha Rao')).toBeInTheDocument();
    expect(within(dialog).getByText('Spam or misleading')).toBeInTheDocument();
    expect(within(dialog).getByText('Keeps posting the same promo link.')).toBeInTheDocument();
  });

  it('plays a video snapshot and says what is missing in words', async () => {
    renderPage();
    const dialog = await openRow(1);

    const video = dialog.querySelector('video');
    expect(video).toHaveAttribute('src', VIDEO.target_preview_url);
    expect(video).toHaveAttribute('controls');
    expect(within(dialog).getByText('Posted by: — · Reported by: —')).toBeInTheDocument();
    expect(within(dialog).getByText('Something else')).toBeInTheDocument();
    expect(within(dialog).getByText('The reporter did not add anything.')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('What we did about it')).toHaveValue('Asked the club admin to review.');
  });

  it('says when no snapshot was captured', async () => {
    renderPage();
    const dialog = await openRow(2);
    expect(within(dialog).getByText('No preview was captured for this report.')).toBeInTheDocument();
  });

  it('records the action taken and re-reads the queue', async () => {
    renderPage([updateReportStatusMock(makeContentReport({ status: 'ACTIONED' }))]);
    const dialog = await openRow(0);

    fireEvent.mouseDown(within(dialog).getByRole('combobox', { name: 'Status' }));
    fireEvent.click(screen.getByRole('option', { name: 'Actioned' }));
    fireEvent.change(within(dialog).getByLabelText('What we did about it'), {
      target: { value: 'Removed the story and warned the poster.' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Report updated'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it("shows the server's reason when the update is refused", async () => {
    renderPage([updateReportStatusErrorMock('Only Legal can close a report')]);
    const dialog = await openRow(0);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(await within(dialog).findByText('Only Legal can close a report')).toBeInTheDocument();
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it('falls back to its own words when the refusal carries none', async () => {
    renderPage([updateReportStatusErrorMock('')]);
    const dialog = await openRow(0);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(await within(dialog).findByText('Could not update this report')).toBeInTheDocument();
  });

  it('closes from the corner icon and from the Close button', async () => {
    renderPage();
    let dialog = await openRow(0);
    fireEvent.click(within(dialog).getAllByRole('button', { name: 'Close' })[0]);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    dialog = await openRow(1);
    const closeButtons = within(dialog).getAllByRole('button', { name: 'Close' });
    fireEvent.click(closeButtons.at(-1) as HTMLElement);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

/* ---- Row actions, verdicts and mails ---- */

const REMOVED = makeContentReport({
  id: 'rpt-4',
  report_no: 'RPT-000126',
  status: 'ACTIONED',
  target_live: false,
  target_removed_at: '2026-03-05T10:00:00.000Z',
});
const GONE_PROFILE = makeContentReport({
  id: 'rpt-5',
  report_no: 'RPT-000127',
  target_type: 'PROFILE',
  status: 'DISMISSED',
  target_live: false,
  target_removed_at: null,
});
const LIVE_PROFILE = makeContentReport({
  id: 'rpt-6',
  report_no: 'RPT-000128',
  target_type: 'PROFILE',
  target_live: true,
});

const rowActions = (id: string) => screen.getByTestId(`report-actions-${id}`);
const action = (kind: string, id: string) => within(rowActions(id)).getByTestId(`report-${kind}-${id}`);

describe('ReportedContentTab — what a reviewer may still do', () => {
  beforeEach(() => {
    __setTableRows([PHOTO, REMOVED, GONE_PROFILE, LIVE_PROFILE]);
  });

  it('keeps a live post or story open to both verdicts', async () => {
    renderPage();
    await screen.findAllByText('RPT-000123');
    expect(action('take-down', 'rpt-1')).toBeEnabled();
    expect(action('looks-good', 'rpt-1')).toBeEnabled();
  });

  it('disables both verdicts once Legal has taken the content down, and says so in the Content column', async () => {
    renderPage();
    await screen.findAllByText('RPT-000126');
    expect(action('take-down', 'rpt-4')).toBeDisabled();
    expect(action('looks-good', 'rpt-4')).toBeDisabled();
    const rows = screen.getAllByTestId('table-row');
    expect(within(rows[1]).getAllByText('Taken down').length).toBeGreaterThan(0);
  });

  it('cannot take down a profile, and cannot rule on a dismissed report', async () => {
    renderPage();
    await screen.findAllByText('RPT-000127');
    // A profile has nothing to remove, whether or not it is still there.
    expect(action('take-down', 'rpt-5')).toBeDisabled();
    expect(action('take-down', 'rpt-6')).toBeDisabled();
    expect(action('looks-good', 'rpt-5')).toBeDisabled();
    expect(action('looks-good', 'rpt-6')).toBeEnabled();
    const rows = screen.getAllByTestId('table-row');
    expect(within(rows[2]).getAllByText('No longer available').length).toBeGreaterThan(0);
    expect(within(rows[3]).getAllByText('Live').length).toBeGreaterThan(0);
  });

  it('names the report on every action, since the tooltip is the accessible name', async () => {
    renderPage();
    await screen.findAllByText('RPT-000123');
    const scope = within(rowActions('rpt-1'));
    expect(scope.getByRole('button', { name: 'Open RPT-000123' })).toBeInTheDocument();
    expect(scope.getByRole('button', { name: 'Take down the content in RPT-000123' })).toBeInTheDocument();
    expect(scope.getByRole('button', { name: 'Mark the content in RPT-000123 as fine' })).toBeInTheDocument();
    expect(scope.getByRole('button', { name: 'Mail the reporter of RPT-000123' })).toBeInTheDocument();
    expect(scope.getByRole('button', { name: 'Mail the owner of the content in RPT-000123' })).toBeInTheDocument();
  });

  it('opens the report from its row Open button', async () => {
    renderPage();
    await screen.findAllByText('RPT-000123');
    fireEvent.click(action('open', 'rpt-1'));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Report RPT-000123')).toBeInTheDocument();
  });

  it('offers the Reason filter every category, switched off or not', async () => {
    renderWithProviders(<ReportedContentTab />, {
      mocks: [
        reportCategoriesMock([
          makeReportCategory(),
          makeReportCategory({ id: 'cat-2', key: 'COPYRIGHT', label: 'Copyright', is_active: false }),
        ]),
      ],
    });
    await waitFor(() =>
      expect(JSON.parse(screen.getByTestId('col-reason').dataset.options ?? '[]')).toEqual([
        { value: 'SPAM', label: 'Spam or misleading' },
        { value: 'COPYRIGHT', label: 'Copyright' },
      ]),
    );
  });
});

describe('ReportedContentTab — verdicts', () => {
  const note = () => screen.getByTestId('report-decision-note');
  const confirmButton = () => screen.getByTestId('report-decision-confirm');
  const openDecision = async (kind: 'take-down' | 'looks-good', id = 'rpt-1') => {
    await screen.findAllByText('RPT-000123');
    fireEvent.click(action(kind, id));
    return screen.findByTestId('report-decision-dialog');
  };

  beforeEach(() => {
    __setTableRows([PHOTO, VIDEO]);
  });

  it('shows what is about to be removed and whose it is before taking content down', async () => {
    renderPage();
    const dialog = await openDecision('take-down');

    expect(within(dialog).getByText('Take this content down?')).toBeInTheDocument();
    expect(within(dialog).getByText('Story by Rahul Mehta · RPT-000123')).toBeInTheDocument();
    expect(within(dialog).getByTestId('report-decision-warning')).toHaveTextContent(
      'removed for everyone straight away and cannot be brought back',
    );
    expect(within(dialog).getByRole('img', { name: 'Saturday doubles at Court 2' })).toBeInTheDocument();
  });

  it('takes the content down with the trimmed note, then confirms and re-reads', async () => {
    renderPage([
      takeDownReportMock(
        makeContentReport({ target_live: false }),
        (variables) => variables.id === 'rpt-1' && variables.note === 'Repeated promo link.',
      ),
    ]);
    await openDecision('take-down');
    fireEvent.change(note(), { target: { value: '  Repeated promo link.  ' } });
    fireEvent.click(confirmButton());

    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Content taken down'));
    await waitFor(() => expect(screen.queryByTestId('report-decision-dialog')).not.toBeInTheDocument());
  });

  it('rules content fine through the same confirmation, with a different warning', async () => {
    renderPage([
      markReportOkMock(
        makeContentReport({ status: 'DISMISSED' }),
        (variables) => variables.id === 'rpt-1' && variables.note === '',
      ),
    ]);
    const dialog = await openDecision('looks-good');

    expect(within(dialog).getByText('Mark this content as fine?')).toBeInTheDocument();
    expect(within(dialog).getByTestId('report-decision-warning')).toHaveTextContent('The content stays up.');
    fireEvent.click(confirmButton());

    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Reports closed as fine'));
  });

  it('names a missing owner with a dash rather than leaving a gap', async () => {
    renderPage();
    const dialog = await openDecision('take-down', 'rpt-2');
    expect(within(dialog).getByText('Post by — · RPT-000124')).toBeInTheDocument();
  });

  it("shows the server's reason when the verdict is refused and does not claim success", async () => {
    renderPage([takeDownReportMock(undefined, () => true, 'Content is already gone')]);
    await openDecision('take-down');
    fireEvent.click(confirmButton());

    expect(await screen.findByTestId('report-decision-error')).toHaveTextContent('Content is already gone');
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it('falls back to its own words when the refusal carries none', async () => {
    renderPage([markReportOkMock(undefined, () => true, '')]);
    await openDecision('looks-good');
    fireEvent.click(confirmButton());

    expect(await screen.findByTestId('report-decision-error')).toHaveTextContent(
      'Could not update this report',
    );
  });

  it('starts every confirmation with an empty note and no leftover error', async () => {
    renderPage([takeDownReportMock(undefined, () => true, 'Content is already gone')]);
    await openDecision('take-down');
    fireEvent.change(note(), { target: { value: 'Draft thought' } });
    fireEvent.click(confirmButton());
    await screen.findByTestId('report-decision-error');
    fireEvent.click(screen.getByTestId('report-decision-cancel'));
    await waitFor(() => expect(screen.queryByTestId('report-decision-dialog')).not.toBeInTheDocument());

    fireEvent.click(action('looks-good', 'rpt-2'));
    await screen.findByTestId('report-decision-dialog');
    expect(note()).toHaveValue('');
    expect(screen.queryByTestId('report-decision-error')).not.toBeInTheDocument();
  });

  it('cannot be dismissed while the verdict is being applied', async () => {
    renderPage([{ ...takeDownReportMock(), delay: 400 }]);
    const dialog = await openDecision('take-down');
    fireEvent.click(confirmButton());

    await waitFor(() => expect(confirmButton()).toBeDisabled());
    expect(screen.getByTestId('report-decision-cancel')).toBeDisabled();
    fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });
    expect(screen.getByTestId('report-decision-dialog')).toBeInTheDocument();

    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Content taken down'));
  });

  it('ignores a second click on Confirm while the dialog is fading out after success', async () => {
    renderPage([takeDownReportMock()]);
    await openDecision('take-down');
    const confirm = confirmButton();
    fireEvent.click(confirm);
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledTimes(1));

    // The verdict is applied and the report is gone from the dialog; the late
    // click must not fire a second take-down (the mock only answers once).
    fireEvent.click(confirm);
    await waitFor(() => expect(screen.queryByTestId('report-decision-dialog')).not.toBeInTheDocument());
    expect(notifySuccess).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape when nothing is being applied', async () => {
    renderPage();
    const dialog = await openDecision('take-down');
    fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });
    await waitFor(() => expect(screen.queryByTestId('report-decision-dialog')).not.toBeInTheDocument());
    expect(notifySuccess).not.toHaveBeenCalled();
  });
});

describe('ReportedContentTab — writing to the people involved', () => {
  const subject = () => screen.getByTestId('report-mail-subject');
  const message = () => screen.getByTestId('report-mail-message');
  const send = () => screen.getByTestId('report-mail-send');
  const openMail = async (who: 'reporter' | 'owner', id = 'rpt-1') => {
    await screen.findAllByText('RPT-000123');
    fireEvent.click(action(`mail-${who}`, id));
    return screen.findByTestId('report-mail-dialog');
  };

  beforeEach(() => {
    __setTableRows([PHOTO, VIDEO]);
  });

  it('addresses the reporter by name and sends the trimmed subject and message', async () => {
    renderPage([
      sendReportMailMock(
        (variables) =>
          variables.id === 'rpt-1' &&
          JSON.stringify(variables.input) ===
            JSON.stringify({
              recipient: 'REPORTER',
              subject: 'About your report',
              message: 'We removed the story.',
            }),
      ),
    ]);
    const dialog = await openMail('reporter');
    expect(within(dialog).getByText('Mail the reporter')).toBeInTheDocument();
    expect(screen.getByTestId('report-mail-to')).toHaveTextContent('To Asha Rao');
    expect(within(dialog).getByText(/RPT-000123/)).toBeInTheDocument();

    fireEvent.change(subject(), { target: { value: '  About your report ' } });
    fireEvent.change(message(), { target: { value: ' We removed the story. ' } });
    fireEvent.click(send());

    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Mail sent'));
    await waitFor(() => expect(screen.queryByTestId('report-mail-dialog')).not.toBeInTheDocument());
  });

  it('addresses the content owner, or a dash when the account has no name', async () => {
    renderPage([
      sendReportMailMock((variables) => (variables.input as { recipient: string }).recipient === 'OWNER'),
    ]);
    const dialog = await openMail('owner');
    expect(within(dialog).getByText('Mail the content owner')).toBeInTheDocument();
    expect(screen.getByTestId('report-mail-to')).toHaveTextContent('To Rahul Mehta');
    fireEvent.change(subject(), { target: { value: 'Your story' } });
    fireEvent.change(message(), { target: { value: 'It broke our rules.' } });
    fireEvent.click(send());
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Mail sent'));
    await waitFor(() => expect(screen.queryByTestId('report-mail-dialog')).not.toBeInTheDocument());

    // VIDEO has no owner name on file.
    await openMail('owner', 'rpt-2');
    expect(screen.getByTestId('report-mail-to')).toHaveTextContent('To —');
  });

  it('refuses an empty subject and message', async () => {
    renderPage();
    await openMail('reporter');
    fireEvent.click(send());

    expect(await screen.findByText('Add a subject')).toBeInTheDocument();
    expect(screen.getByText('Write a message')).toBeInTheDocument();
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it('refuses an over-long subject and message', async () => {
    renderPage();
    await openMail('reporter');
    fireEvent.change(subject(), { target: { value: 's'.repeat(151) } });
    fireEvent.change(message(), { target: { value: 'm'.repeat(5001) } });
    fireEvent.click(send());

    expect(await screen.findByText('Keep the subject under 150 characters')).toBeInTheDocument();
    expect(screen.getByText('Keep the message under 5,000 characters')).toBeInTheDocument();
  });

  it("shows the server's reason when the mail is refused", async () => {
    renderPage([sendReportMailMock(() => true, 'The account has no email address')]);
    await openMail('reporter');
    fireEvent.change(subject(), { target: { value: 'Hello' } });
    fireEvent.change(message(), { target: { value: 'World' } });
    fireEvent.click(send());

    expect(await screen.findByTestId('report-mail-error')).toHaveTextContent(
      'The account has no email address',
    );
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it('falls back to its own words when the refusal carries none', async () => {
    renderPage([sendReportMailMock(() => true, '')]);
    await openMail('reporter');
    fireEvent.change(subject(), { target: { value: 'Hello' } });
    fireEvent.change(message(), { target: { value: 'World' } });
    fireEvent.click(send());

    expect(await screen.findByTestId('report-mail-error')).toHaveTextContent('Could not send this mail');
  });

  it('never carries a half-written mail over to the next person', async () => {
    renderPage();
    await openMail('reporter');
    fireEvent.change(subject(), { target: { value: 'Half written' } });
    fireEvent.click(screen.getByTestId('report-mail-cancel'));
    await waitFor(() => expect(screen.queryByTestId('report-mail-dialog')).not.toBeInTheDocument());

    fireEvent.click(action('mail-owner', 'rpt-1'));
    await screen.findByTestId('report-mail-dialog');
    expect(subject()).toHaveValue('');
  });

  it('cannot be dismissed while the mail is being sent', async () => {
    renderPage([{ ...sendReportMailMock(), delay: 400 }]);
    const dialog = await openMail('reporter');
    fireEvent.change(subject(), { target: { value: 'Hello' } });
    fireEvent.change(message(), { target: { value: 'World' } });
    fireEvent.click(send());

    await waitFor(() => expect(send()).toBeDisabled());
    expect(screen.getByTestId('report-mail-cancel')).toBeDisabled();
    fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });
    expect(screen.getByTestId('report-mail-dialog')).toBeInTheDocument();

    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Mail sent'));
  });

  it('closes on Escape when nothing is being sent', async () => {
    renderPage();
    const dialog = await openMail('reporter');
    fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });
    await waitFor(() => expect(screen.queryByTestId('report-mail-dialog')).not.toBeInTheDocument());
  });
});

describe('ReportedContentTab — the detail dialog', () => {
  const entry = (
    id: string,
    over: Partial<ReturnType<typeof makeContentReport>['history'][number]>,
  ): ReturnType<typeof makeContentReport>['history'][number] => ({
    __typename: 'ContentReportAction',
    id,
    action: 'STATUS_CHANGED',
    by_name: 'Priya Sharma',
    at: '2026-03-04T10:00:00.000Z',
    note: '',
    ...over,
  });
  const HISTORY = [
    entry('h-1', { action: 'MAIL_REPORTER', note: 'Subject: Update\n\nWe looked into it.' }),
    entry('h-2', { by_name: '', at: '2026-03-06T10:00:00.000Z', note: 'ACTIONED' }),
    entry('h-3', { at: '2026-03-05T10:00:00.000Z', note: 'Moved by hand' }),
    entry('h-4', { action: 'TAKEN_DOWN', at: '2026-03-03T10:00:00.000Z' }),
  ];

  it('lists the activity newest first, with a status change in words and notes as typed', async () => {
    __setTableRows([makeContentReport({ history: HISTORY })]);
    renderPage();
    const dialog = await openRow(0);

    const ids = within(dialog)
      .getAllByTestId(/^report-history-h-/)
      .map((el) => el.getAttribute('data-testid'));
    expect(ids).toEqual(['report-history-h-2', 'report-history-h-3', 'report-history-h-1', 'report-history-h-4']);

    const statusChange = within(dialog).getByTestId('report-history-h-2');
    expect(within(statusChange).getByText('Changed the status')).toBeInTheDocument();
    // The stored enum is shown as the status it names, not as ACTIONED.
    expect(within(statusChange).getByText('Actioned')).toBeInTheDocument();
    expect(statusChange).toHaveTextContent('— ·');

    const byHand = within(dialog).getByTestId('report-history-h-3');
    expect(within(byHand).getByText('Moved by hand')).toBeInTheDocument();
    const mailed = within(dialog).getByTestId('report-history-h-1');
    expect(mailed).toHaveTextContent('Mailed the reporter');
    expect(mailed).toHaveTextContent('We looked into it.');
    // An entry with no note shows only its action line.
    expect(within(dialog).getByTestId('report-history-h-4')).toHaveTextContent(/^Took the content down/);
  });

  it('says nothing has been done yet when there is no activity', async () => {
    __setTableRows([PHOTO]);
    renderPage();
    const dialog = await openRow(0);
    expect(within(dialog).getByTestId('report-history-empty')).toHaveTextContent(
      'Nothing has been done about this report yet.',
    );
  });

  it('shows how many people reported it and whether the content is still live', async () => {
    __setTableRows([makeContentReport({ report_count: 3 })]);
    renderPage();
    const dialog = await openRow(0);
    expect(within(dialog).getByText('Reports on this content: 3')).toBeInTheDocument();
    expect(within(dialog).getByTestId('report-detail-content-state')).toHaveTextContent('Live');
  });

  it('shows a taken-down report as "Taken down" with its verdicts disabled', async () => {
    __setTableRows([REMOVED]);
    renderPage();
    await screen.findAllByText('RPT-000126');
    fireEvent.click(screen.getByTestId('table-row'));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByTestId('report-detail-content-state')).toHaveTextContent('Taken down');
    expect(within(dialog).getByTestId('report-take-down-rpt-4')).toBeDisabled();
    expect(within(dialog).getByTestId('report-looks-good-rpt-4')).toBeDisabled();
  });

  it('shows a dash for the received time when the report carries none', async () => {
    __setTableRows([makeContentReport({ created_at: '' })]);
    renderPage();
    const dialog = await openRow(0);
    expect(within(dialog).getByText('Story · —')).toBeInTheDocument();
  });

  it('replaces the detail dialog with the verdict confirmation rather than stacking them', async () => {
    __setTableRows([PHOTO]);
    renderPage();
    const dialog = await openRow(0);
    fireEvent.click(within(dialog).getByTestId('report-take-down-rpt-1'));

    expect(await screen.findByTestId('report-decision-dialog')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByTestId('report-detail-dialog')).not.toBeInTheDocument());
  });

  it('replaces the detail dialog with the mail dialog', async () => {
    __setTableRows([PHOTO]);
    renderPage();
    const dialog = await openRow(0);
    fireEvent.click(within(dialog).getByTestId('report-mail-owner-rpt-1'));

    expect(await screen.findByTestId('report-mail-dialog')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByTestId('report-detail-dialog')).not.toBeInTheDocument());
  });
});
