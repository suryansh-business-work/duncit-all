import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../testkit';
import { mutation, ops, resetOps } from '../mocks/ops';
import { statusReportRow } from '../mocks/status-reports.mock';

vi.mock('@apollo/client/react', async (io) => (await import('../mocks/ops')).apolloOpsFactory(io));
vi.mock('@duncit/dialogs', async (io) => (await import('../mocks/ops')).dialogsOpsFactory(io));
vi.mock('@duncit/table', async (io) => {
  const actual = await io<typeof import('@duncit/table')>();
  const { ops: o } = await import('../mocks/ops');
  return {
    ...actual,
    useApolloTableFetch: () => async () => ({ rows: o.tableRows, total: o.tableRows.length }),
  };
});
// The uploader belongs to @duncit/media-picker; a textarea holding the same
// newline-separated value keeps the dialog's own conversion logic under test.
vi.mock('@duncit/media-picker', async (io) => ({
  ...(await io<typeof import('@duncit/media-picker')>()),
  MediaListField: (p: { label: string; value: string; onChange: (v: string) => void }) => (
    <textarea aria-label={p.label} value={p.value} onChange={(e) => p.onChange(e.target.value)} />
  ),
}));

import StatusReportsPage from '../../src/pages/status-reports-page';
import {
  fromMediaList,
  impactLabel,
  reportWebsite,
  statusLabel,
  toMediaList,
} from '../../src/pages/status-reports-page/queries';

beforeEach(() => {
  resetOps();
  ops.tableRows = [statusReportRow()];
});

const openFirst = async (text = 'Checkout spins forever') => {
  renderWithProviders(<StatusReportsPage />);
  fireEvent.click(await screen.findByText(text));
  return screen.findByRole('dialog');
};

describe('status report helpers', () => {
  it('prefers the catalogue address, then the page origin, then nothing', () => {
    expect(reportWebsite(statusReportRow())).toBe('https://app.example.test/home');
    expect(reportWebsite(statusReportRow({ service_url: '' }))).toBe('https://app.example.test');
    expect(reportWebsite(statusReportRow({ service_url: '', page_url: 'not a url' }))).toBe('');
    expect(reportWebsite(statusReportRow({ service_url: '', page_url: '' }))).toBe('');
  });

  it('round-trips the media list and drops blank lines', () => {
    expect(toMediaList(['a', 'b'])).toBe('a\nb');
    expect(fromMediaList(' a \n\n  \nb\n')).toEqual(['a', 'b']);
    expect(fromMediaList('')).toEqual([]);
  });

  it('falls back to a default label for a value it does not know', () => {
    const t = (key: string) => key;
    expect(impactLabel(t, 'SLOW')).toBe('status.impact.slow');
    expect(impactLabel(t, 'WHAT' as never)).toBe('status.impact.other');
    expect(statusLabel(t, 'CLOSED')).toBe('status.reportStatus.closed');
    expect(statusLabel(t, 'WHAT' as never)).toBe('status.reportStatus.new');
  });
});

describe('Status reports table', () => {
  it('shows the website host as a link that does not open the dialog, and fallbacks', async () => {
    ops.tableRows = [
      statusReportRow(),
      statusReportRow({
        id: 'sr2',
        message: 'Second',
        service_url: 'not a url',
        service_name: '',
        environment: 'mars',
      }),
      statusReportRow({ id: 'sr3', message: 'Third', service_url: '', page_url: '' }),
    ];
    renderWithProviders(<StatusReportsPage />);
    const link = await screen.findByRole('link', { name: 'app.example.test' });
    expect(link).toHaveAttribute('href', 'https://app.example.test/home');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    fireEvent.click(link);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // An address that cannot be parsed is shown as typed.
    expect(screen.getByRole('link', { name: 'not a url' })).toBeInTheDocument();
    expect(screen.getByText('Not known')).toBeInTheDocument();
    expect(screen.getByText('Not specified')).toBeInTheDocument();
    expect(screen.getByText('mars')).toBeInTheDocument();
  });
});

describe('Status report dialog', () => {
  it('shows the report, then saves the triage with the staff images split into a list', async () => {
    ops.tableRows = [
      statusReportRow({
        status: 'IN_PROGRESS',
        impact: 'PAYMENT',
        note: 'looking',
        staff_image_urls: ['https://img.example.test/a.png'],
        image_urls: ['https://img.example.test/r.png'],
      }),
    ];
    const dialog = await openFirst();
    expect(within(dialog).getByText('Duncit mWeb')).toBeInTheDocument();
    expect(within(dialog).getByText('u-77')).toBeInTheDocument();
    expect(within(dialog).getByText('203.0.113.7')).toBeInTheDocument();
    expect(within(dialog).getByText('TestBrowser/1.0')).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: 'Open the full-size image' })).toHaveAttribute(
      'href',
      'https://img.example.test/r.png'
    );
    expect(within(dialog).getByLabelText('Triage note')).toHaveValue('looking');
    expect(within(dialog).getByLabelText('Team attachments')).toHaveValue('https://img.example.test/a.png');

    fireEvent.change(within(dialog).getByLabelText('Triage note'), { target: { value: 'fixed in 1.2' } });
    fireEvent.change(within(dialog).getByLabelText('Team attachments'), {
      target: { value: 'https://img.example.test/a.png\n\n  https://img.example.test/b.png  ' },
    });
    fireEvent.mouseDown(within(dialog).getByRole('combobox'));
    fireEvent.click(await screen.findByRole('option', { name: 'Resolved' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(mutation('UpdateStatusReport')).toHaveBeenCalledWith({
        variables: {
          report_id: 'sr1',
          status: 'RESOLVED',
          note: 'fixed in 1.2',
          staff_images: ['https://img.example.test/a.png', 'https://img.example.test/b.png'],
        },
      })
    );
    await waitFor(() => expect(ops.notifySuccess).toHaveBeenCalledWith('Report updated'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('shows the placeholders for anonymous reports with no attachments or address', async () => {
    ops.tableRows = [
      statusReportRow({ user_id: null, ip: null, user_agent: null, service_name: '', service_url: '', page_url: '' }),
    ];
    const dialog = await openFirst();
    expect(within(dialog).getByText('Not signed in')).toBeInTheDocument();
    expect(within(dialog).getAllByText('Not known').length).toBeGreaterThan(0);
    expect(within(dialog).getByText('Not specified')).toBeInTheDocument();
    expect(within(dialog).getByText('The reporter attached none.')).toBeInTheDocument();
  });

  it('reports the server message when saving fails and stays open', async () => {
    ops.mut.UpdateStatusReport = vi.fn().mockRejectedValue(new Error('conflict'));
    const dialog = await openFirst();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledWith('conflict'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('uses the generic copy when the failure carries no message', async () => {
    ops.mut.UpdateStatusReport = vi.fn().mockRejectedValue('weird');
    const dialog = await openFirst();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledWith('The report could not be updated'));
  });

  it('deletes after the operator confirms', async () => {
    ops.confirm.mockResolvedValue(true);
    const dialog = await openFirst();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() =>
      expect(mutation('DeleteStatusReports')).toHaveBeenCalledWith({ variables: { ids: ['sr1'] } })
    );
    expect(ops.confirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Delete this report?', destructive: true })
    );
    await waitFor(() => expect(ops.notifySuccess).toHaveBeenCalledWith('Report deleted'));
  });

  it('does nothing when the confirmation is declined', async () => {
    ops.confirm.mockResolvedValue(false);
    const dialog = await openFirst();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(ops.confirm).toHaveBeenCalled());
    expect(mutation('DeleteStatusReports')).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('reports a failed delete and keeps the dialog', async () => {
    ops.confirm.mockResolvedValue(true);
    ops.mut.DeleteStatusReports = vi.fn().mockRejectedValue(new Error('forbidden'));
    const dialog = await openFirst();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalled());
    expect(ops.notifySuccess).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('closes without saving', async () => {
    const dialog = await openFirst();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(mutation('UpdateStatusReport')).not.toHaveBeenCalled();
  });
});
