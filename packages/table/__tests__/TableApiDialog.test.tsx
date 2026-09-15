import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { accessMock, copyToClipboard, notify } = vi.hoisted(() => ({
  accessMock: vi.fn(),
  copyToClipboard: vi.fn(),
  notify: vi.fn(),
}));

vi.mock('@duncit/app-settings', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useTableApiAccess: accessMock,
}));
vi.mock('@duncit/utils', () => ({ copyToClipboard }));
vi.mock('@duncit/dialogs', () => ({ notify }));

const { TableApiDialog } = await import('../src/tableApi/TableApiDialog');

const QUERY = { search: '', page: 1, pageSize: 25, sortBy: null, sortDir: 'asc' as const, filters: [] };
const source = { resultKey: 'podsTable', variablesOf: () => ({ query: { page: 1, page_size: 25 } }) };
const BASE = 'https://server.duncit.com/table-api';

function renderDialog(access: Record<string, unknown>) {
  accessMock.mockReturnValue({ loading: false, token: null, baseUrl: '', error: false, ...access });
  const onClose = vi.fn();
  render(<TableApiDialog open onClose={onClose} source={source} query={QUERY} />);
  return onClose;
}

beforeEach(() => {
  accessMock.mockReset();
  copyToClipboard.mockReset();
  notify.mockReset();
});

describe('TableApiDialog', () => {
  it('waits for the access read before building a URL', () => {
    renderDialog({ loading: true });
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByTestId('table-api-url')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy GET URL' })).toBeDisabled();
  });

  it('says when the access read failed', () => {
    renderDialog({ error: true });
    expect(screen.getByText(/could not be loaded/)).toBeInTheDocument();
  });

  it('points to Tech settings and uses a placeholder when there is no token yet', () => {
    renderDialog({ baseUrl: BASE });
    expect(screen.getByText(/Table API → Settings/)).toBeInTheDocument();
    expect(screen.getByTestId('table-api-url')).toHaveTextContent(`GET ${BASE}/podsTable?token=YOUR_TOKEN&page=1&page_size=25`);
  });

  it('keeps showing the URL while a refetch is in flight, and copies it', async () => {
    copyToClipboard.mockResolvedValue(true);
    renderDialog({ loading: true, baseUrl: BASE, token: 'dtt_4821' });
    expect(screen.getByText(/Treat it like a password/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Copy GET URL' }));
    await waitFor(() => expect(notify).toHaveBeenCalledWith('GET URL copied', 'success'));
    expect(copyToClipboard).toHaveBeenCalledWith(`${BASE}/podsTable?token=dtt_4821&page=1&page_size=25`);
  });

  it('says when the copy did not land, and closes', async () => {
    copyToClipboard.mockResolvedValue(false);
    const onClose = renderDialog({ baseUrl: BASE, token: 'dtt_4821' });
    fireEvent.click(screen.getByRole('button', { name: 'Copy GET URL' }));
    await waitFor(() => expect(notify).toHaveBeenCalledWith('Could not copy the URL', 'error'));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
