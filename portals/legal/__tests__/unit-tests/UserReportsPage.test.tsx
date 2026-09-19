import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { notifySuccess } from '@duncit/dialogs';
import UserReportsPage from '../../src/pages/reports/UserReportsPage';
import { renderWithProviders } from '../testkit';
import { makeContentReport, updateReportStatusErrorMock, updateReportStatusMock } from '../mocks';
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

const renderPage = (mocks: MockedResponse[] = []) => renderWithProviders(<UserReportsPage />, { mocks });

const openRow = async (index: number) => {
  await screen.findByText('RPT-000123');
  fireEvent.click(screen.getAllByTestId('table-row')[index]);
  return screen.findByRole('dialog');
};

beforeEach(() => {
  vi.mocked(notifySuccess).mockClear();
  __setTableRows([PHOTO, VIDEO, NO_PREVIEW]);
});

describe('UserReportsPage — the queue', () => {
  it('shows each report with its snapshot and status', async () => {
    renderPage();
    await screen.findByText('RPT-000123');
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

describe('UserReportsPage — the dialog', () => {
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
