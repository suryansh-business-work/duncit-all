import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../testkit';

const m = vi.hoisted(() => ({
  query: vi.fn(),
  mutate: vi.fn(),
  loading: false,
  notify: vi.fn(),
  confirm: vi.fn(),
  download: vi.fn(),
}));

vi.mock('@apollo/client/react', async (orig) => ({
  ...(await orig<typeof import('@apollo/client/react')>()),
  useApolloClient: () => ({ query: m.query }),
  useMutation: () => [m.mutate, { loading: m.loading }],
}));
vi.mock('@duncit/dialogs', () => ({
  notify: m.notify,
  useConfirm: () => m.confirm,
}));
vi.mock('@duncit/utils', async (orig) => ({
  ...(await orig<typeof import('@duncit/utils')>()),
  downloadTextFile: m.download,
}));
vi.mock('../../src/components/CopyGetApiButton', () => ({
  default: (p: { path: string; params?: Record<string, string> }) => (
    <span data-testid="copy-api">{`${p.path}?${new URLSearchParams(p.params).toString()}`}</span>
  ),
}));

import LogImportExport from '../../src/pages/telemetry-logs-page/LogImportExport';

const pickFile = (label: string, content: string) => {
  const input = screen.getByLabelText(label, { exact: false }) as HTMLInputElement;
  const file = new File([content], 'in.json', { type: 'application/json' });
  fireEvent.change(input, { target: { files: [file] } });
};

beforeEach(() => {
  Object.values(m).forEach((v) => typeof v === 'function' && 'mockReset' in v && v.mockReset());
  m.loading = false;
});

describe('LogImportExport', () => {
  const renderLogs = (onImported = vi.fn()) => {
    renderWithProviders(<LogImportExport level="error" onImported={onImported} />);
    return onImported;
  };
  const logFile = JSON.stringify({
    logs: [{ app: 'mweb', level: 'error', page: '/x', component: 'C', id: 'l1' }],
  });

  it('pins the level into the copy-API link', () => {
    renderLogs();
    expect(screen.getByTestId('copy-api')).toHaveTextContent('/telemetry/logs.json?level=error');
  });

  it('downloads the level history', async () => {
    m.query.mockResolvedValue({
      data: {
        telemetryLogsExport: [
          { id: 'l1', app: 'mweb', level: 'error', page: '/x', component: 'C', message: 'm' },
        ],
      },
    });
    renderLogs();
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    await waitFor(() => expect(m.download).toHaveBeenCalled());
    expect(m.query.mock.calls[0][0].variables).toEqual({ level: 'error' });
    expect(m.download.mock.calls[0][1]).toMatch(/error/);
    expect(m.notify).toHaveBeenCalledWith('Exported 1 error logs', 'success');
  });

  it('says there are no logs to export', async () => {
    m.query.mockResolvedValue({ data: undefined });
    renderLogs();
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    await waitFor(() =>
      expect(m.notify).toHaveBeenCalledWith('There are no error logs to export yet.', 'info'),
    );
  });

  it('reports an export failure', async () => {
    m.query.mockRejectedValue(new Error('logs down'));
    renderLogs();
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    await waitFor(() => expect(m.notify).toHaveBeenCalledWith('logs down', 'error'));
  });

  it('rejects an invalid file', async () => {
    renderLogs();
    pickFile('JSON file', '{"logs":[{"app":"x"}]}');
    await waitFor(() =>
      expect(m.notify).toHaveBeenCalledWith(
        expect.stringContaining('missing its app, level, page or component'),
        'error',
      ),
    );
    expect(m.confirm).not.toHaveBeenCalled();
  });

  it('imports and reports a clean result', async () => {
    m.confirm.mockResolvedValue(true);
    m.mutate.mockResolvedValue({
      data: { importTelemetryLogs: { created: 1, skipped: 2, expiring: 0 } },
    });
    const onImported = renderLogs();
    pickFile('JSON file', logFile);
    await waitFor(() => expect(onImported).toHaveBeenCalled());
    expect(m.confirm.mock.calls[0][0].title).toBe('Import 1 logs');
    expect(m.notify).toHaveBeenCalledWith('Imported — 1 added, 2 already here', 'success');
  });

  it('warns when imported rows are already past retention', async () => {
    m.confirm.mockResolvedValue(true);
    m.mutate.mockResolvedValue({
      data: { importTelemetryLogs: { created: 1, skipped: 0, expiring: 3 } },
    });
    renderLogs();
    pickFile('JSON file', logFile);
    await waitFor(() =>
      expect(m.notify).toHaveBeenCalledWith(
        'Imported — 1 added, 0 already here — 3 are older than the retention window',
        'warning',
      ),
    );
  });

  it('defaults counts to zero when the server returns no result', async () => {
    m.confirm.mockResolvedValue(true);
    m.mutate.mockResolvedValue({ data: undefined });
    renderLogs();
    pickFile('JSON file', logFile);
    await waitFor(() =>
      expect(m.notify).toHaveBeenCalledWith('Imported — 0 added, 0 already here', 'success'),
    );
  });

  it('does not import when declined', async () => {
    m.confirm.mockResolvedValue(false);
    renderLogs();
    pickFile('JSON file', logFile);
    await waitFor(() => expect(m.confirm).toHaveBeenCalled());
    expect(m.mutate).not.toHaveBeenCalled();
  });

  it('reports an import failure', async () => {
    m.confirm.mockResolvedValue(true);
    m.mutate.mockRejectedValue(new Error('logs rejected'));
    const onImported = renderLogs();
    pickFile('JSON file', logFile);
    await waitFor(() => expect(m.notify).toHaveBeenCalledWith('logs rejected', 'error'));
    expect(onImported).not.toHaveBeenCalled();
  });

  it('ignores a cancelled picker and opens the picker from the button', () => {
    renderLogs();
    const input = screen.getByLabelText('JSON file', { exact: false }) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [] } });
    expect(m.confirm).not.toHaveBeenCalled();
    const click = vi.spyOn(input, 'click');
    fireEvent.click(screen.getByRole('button', { name: 'Import' }));
    expect(click).toHaveBeenCalled();
  });

  it('shows progress while importing', () => {
    m.loading = true;
    renderLogs();
    expect(screen.getByRole('button', { name: 'Importing…' })).toBeDisabled();
  });
});
