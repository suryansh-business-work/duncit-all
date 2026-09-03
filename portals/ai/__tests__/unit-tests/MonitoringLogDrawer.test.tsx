import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import MonitoringLogDrawer from '../../src/pages/ai-monitoring/logs/MonitoringLogDrawer';
import type { MonitoringLogRow } from '../../src/pages/ai-monitoring/queries';
import { renderWithProviders } from '../testkit';

/**
 * One AI check, in full.
 *
 * The table answers "what happened"; the drawer answers "why should I believe
 * it". An action taken against someone's upload has to be explainable, so the
 * cases below are about the trail — the picture judged, the model that judged
 * it, and the raw failure text when it did not finish — rather than the markup.
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
  summary: 'Nothing of concern in this image.',
  model: 'gpt-4o-mini',
  duration_ms: 812,
  error: '',
  checked_at: '2026-09-01T10:05:00.000Z',
  created_at: '2026-09-01T10:04:00.000Z',
  ...over,
});

describe('MonitoringLogDrawer', () => {
  it('stays shut until a row is chosen', () => {
    renderWithProviders(<MonitoringLogDrawer row={null} onClose={vi.fn()} />);

    expect(screen.queryByText('cover.jpg')).not.toBeInTheDocument();
  });

  it('shows the image that was judged, and who uploaded it', () => {
    renderWithProviders(<MonitoringLogDrawer row={row()} onClose={vi.fn()} />);

    expect(screen.getByText('cover.jpg')).toBeInTheDocument();
    const image = document.querySelector('img') as HTMLImageElement;
    expect(image.src).toBe('https://ik.imagekit.io/duncit/pods/cover.jpg');
    expect(screen.getByText('Riya Sharma')).toBeInTheDocument();
    expect(screen.getByText('u-1')).toBeInTheDocument();
  });

  it('names the verdict, the risk and the action taken', () => {
    renderWithProviders(<MonitoringLogDrawer row={row()} onClose={vi.fn()} />);

    expect(screen.getByText('COMPLETED')).toBeInTheDocument();
    expect(screen.getByText('LOW')).toBeInTheDocument();
    expect(screen.getByText('ALLOWED')).toBeInTheDocument();
  });

  it('reports the model and how long the check took', () => {
    renderWithProviders(<MonitoringLogDrawer row={row()} onClose={vi.fn()} />);

    expect(screen.getByText('gpt-4o-mini')).toBeInTheDocument();
    expect(screen.getByText('812 ms')).toBeInTheDocument();
    expect(screen.getByText('Nothing of concern in this image.')).toBeInTheDocument();
  });

  it('says an upload was signed out rather than leaving the row blank', () => {
    renderWithProviders(
      <MonitoringLogDrawer row={row({ entity: null, user_id: null })} onClose={vi.fn()} />,
    );

    // An anonymous upload is a real case — the check still ran, and the log has
    // to say who it could not name.
    expect(screen.queryByText('Riya Sharma')).not.toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('falls back for every field the check never filled in', () => {
    renderWithProviders(
      <MonitoringLogDrawer
        row={row({
          file_name: '',
          surface: '',
          folder: '',
          model: '',
          duration_ms: 0,
          summary: '',
          checked_at: null,
        })}
        onClose={vi.fn()}
      />,
    );

    // A PENDING check has almost none of this yet; the drawer must not render
    // "0 ms" or an empty line as if they were findings.
    expect(screen.getByText('Uploaded image')).toBeInTheDocument();
    expect(screen.getByText('/')).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThan(1);
  });

  it('shows the raw failure text only when the check did not finish', () => {
    const { rerender } = renderWithProviders(
      <MonitoringLogDrawer row={row()} onClose={vi.fn()} />,
    );
    expect(screen.queryByText('Failure detail')).not.toBeInTheDocument();

    rerender(
      <MonitoringLogDrawer
        row={row({ status: 'FAILED', error: 'OpenAI 429: rate limited' })}
        onClose={vi.fn()}
      />,
    );

    // Without the raw text a failed check is indistinguishable from a clean
    // one that simply found nothing.
    expect(screen.getByText('Failure detail')).toBeInTheDocument();
    expect(screen.getByText('OpenAI 429: rate limited')).toBeInTheDocument();
  });

  it('opens the full image in a new tab, safely', () => {
    renderWithProviders(<MonitoringLogDrawer row={row()} onClose={vi.fn()} />);

    const open = screen.getByRole('link', { name: 'Open image' });
    expect(open).toHaveAttribute('href', 'https://ik.imagekit.io/duncit/pods/cover.jpg');
    expect(open).toHaveAttribute('target', '_blank');
    expect(open).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('closes from the button', () => {
    const onClose = vi.fn();
    renderWithProviders(<MonitoringLogDrawer row={row()} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
