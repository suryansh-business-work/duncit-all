import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { useRef } from 'react';
import MonitoringLogsTable from '../../src/pages/ai-monitoring/logs/MonitoringLogsTable';
import type { MonitoringLogRow } from '../../src/pages/ai-monitoring/queries';
import { renderWithProviders } from '../testkit';

vi.mock('@duncit/table', () => import('./table-mock'));

/**
 * The AI Monitoring log table.
 *
 * Every column here is a small piece of product judgement about an upload
 * nobody has looked at yet — who it belonged to, whether the check finished,
 * and what the model actually said. The cases below are about the fallbacks:
 * a log row is written before the check runs, so most fields are legitimately
 * empty for a while and none of them may render as blank or "undefined".
 */
const row = (over: Partial<MonitoringLogRow> = {}): MonitoringLogRow => ({
  id: 'log-1',
  url: 'https://ik.imagekit.io/duncit/pods/cover.jpg',
  file_name: 'cover.jpg',
  folder: '/pods',
  surface: 'MWEB',
  user_id: 'u-1',
  entity: 'Riya Sharma',
  risk: 'LOW',
  status: 'COMPLETED',
  action: 'ALLOWED',
  summary: 'Nothing of concern.',
  model: 'gpt-4o-mini',
  duration_ms: 812,
  error: '',
  checked_at: '2026-09-01T10:05:00.000Z',
  created_at: '2026-09-01T10:04:00.000Z',
  ...over,
});

function Harness({
  rows,
  onRowClick = vi.fn(),
}: Readonly<{ rows: MonitoringLogRow[]; onRowClick?: (row: MonitoringLogRow) => void }>) {
  const refetchRef = useRef<(() => void) | null>(null);
  const fetchRows = async () => ({ rows, total: rows.length });
  return (
    <MonitoringLogsTable
      fetchRows={fetchRows as never}
      refetchRef={refetchRef}
      onRowClick={onRowClick}
    />
  );
}

const mount = (rows: MonitoringLogRow[], onRowClick?: (row: MonitoringLogRow) => void) =>
  renderWithProviders(<Harness rows={rows} onRowClick={onRowClick} />);

describe('MonitoringLogsTable', () => {
  it('shows who uploaded the image and which account it belonged to', async () => {
    mount([row()]);

    expect(await screen.findByText('Riya Sharma')).toBeInTheDocument();
    expect(screen.getByText('u-1')).toBeInTheDocument();
  });

  it('names a signed-out upload rather than leaving the row blank', async () => {
    mount([row({ entity: null, user_id: null })]);

    // An anonymous upload is a real case — the check still ran, and the table
    // has to say who it could not name.
    expect(await screen.findByText('Signed-out upload')).toBeInTheDocument();
    expect(screen.getByText('no account attached')).toBeInTheDocument();
  });

  it('shows the status, risk and action of a finished check', async () => {
    mount([row()]);

    expect(await screen.findByText('COMPLETED')).toBeInTheDocument();
    expect(screen.getByText('LOW')).toBeInTheDocument();
    expect(screen.getByText('ALLOWED')).toBeInTheDocument();
  });

  it('shows a pending check without pretending it has a verdict', async () => {
    mount([row({ status: 'PENDING', risk: 'PENDING', action: 'NONE', summary: '' })]);

    expect(await screen.findAllByText('PENDING')).toHaveLength(2);
    expect(screen.getByText('NONE')).toBeInTheDocument();
  });

  it("falls back to the failure text when the model never gave a comment", async () => {
    mount([row({ summary: '', error: 'OpenAI 429: rate limited', status: 'FAILED' })]);

    // Without this the row reads as a clean check that found nothing.
    expect(await screen.findByText('OpenAI 429: rate limited')).toBeInTheDocument();
  });

  it('falls back again when there is neither a comment nor an error', async () => {
    mount([row({ summary: '', error: '' })]);

    expect(await screen.findByText('—')).toBeInTheDocument();
  });

  it('names the upload by file name, falling back to its URL', async () => {
    const { rerender } = mount([row()]);
    expect(await screen.findByText('cover.jpg')).toBeInTheDocument();

    rerender(<Harness rows={[row({ file_name: '' })]} />);
    await waitFor(() =>
      expect(
        screen.getByText('https://ik.imagekit.io/duncit/pods/cover.jpg'),
      ).toBeInTheDocument(),
    );
  });

  it('shows where an upload came from, and defaults the folder to root', async () => {
    mount([row({ surface: '', folder: '' })]);

    await waitFor(() => expect(screen.getByText('/')).toBeInTheDocument());
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('opens the row it was clicked on', async () => {
    const onRowClick = vi.fn();
    mount([row()], onRowClick);

    fireEvent.click(await screen.findByTestId('table-row'));
    expect(onRowClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'log-1' }));
  });
});
