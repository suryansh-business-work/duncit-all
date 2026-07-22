import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { BugRow } from '../../src/pages/bugs-page/queries';

const m = vi.hoisted(() => ({
  updateMock: vi.fn(),
  notifyError: vi.fn(),
  refetchSpy: vi.fn(),
  assignRefetch: true,
}));

vi.mock('@apollo/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@apollo/client')>();
  return {
    ...actual,
    useApolloClient: () => ({}),
    useMutation: () => [m.updateMock, {}],
  };
});
vi.mock('@duncit/table', () => ({ useApolloTableFetch: () => vi.fn() }));
vi.mock('@duncit/dialogs', () => ({ notifyError: m.notifyError }));

const bug: BugRow = {
  id: 'b1',
  title: 'Boom',
  error_name: 'TypeError',
  message: 'x is undefined',
  page: '/home',
  source: 'mweb',
  app: 'DuncitApp',
  platform: 'web',
  os: 'iOS 17',
  occurrence_count: 5,
  first_seen_at: '2026-01-01T00:00:00.000Z',
  last_seen_at: '2026-01-02T00:00:00.000Z',
  env_counts: { localhost: 1, staging: 2, production: 3 },
  last_url: null,
  last_host: null,
  last_stack: null,
  status: 'OPEN',
};

vi.mock('../../src/pages/bugs-page/BugsTable', () => ({
  default: (p: {
    refetchRef: { current: (() => void) | null };
    onOpen: (b: BugRow) => void;
  }) => {
    if (m.assignRefetch) p.refetchRef.current = m.refetchSpy;
    return (
      <button type="button" onClick={() => p.onOpen(bug)}>
        open-bug
      </button>
    );
  },
}));
vi.mock('../../src/pages/bugs-page/BugDetailDialog', () => ({
  default: (p: {
    bug: BugRow | null;
    onClose: () => void;
    onStatus: (b: BugRow, s: string) => void;
  }) =>
    p.bug ? (
      <div data-testid="detail">
        <span>sel:{p.bug.status}</span>
        <button type="button" onClick={() => p.onStatus(p.bug!, 'RESOLVED')}>
          mark-resolved
        </button>
        <button type="button" onClick={p.onClose}>
          close-dialog
        </button>
      </div>
    ) : null,
}));

import BugsPage from '../../src/pages/bugs-page/index';

beforeEach(() => {
  m.updateMock.mockReset();
  m.notifyError.mockReset();
  m.refetchSpy.mockReset();
  m.assignRefetch = true;
});

describe('BugsPage', () => {
  it('marks a bug, toasts, refetches and closes the toast', async () => {
    m.updateMock.mockResolvedValueOnce({ data: { updateBugStatus: { id: 'b1', status: 'RESOLVED' } } });
    render(<BugsPage />);

    fireEvent.click(screen.getByRole('button', { name: 'open-bug' }));
    fireEvent.click(screen.getByRole('button', { name: 'mark-resolved' }));

    expect(await screen.findByText('Bug marked resolved')).toBeInTheDocument();
    expect(m.refetchSpy).toHaveBeenCalled();
    expect(m.notifyError).not.toHaveBeenCalled();

    // Escape closes the Snackbar → setToast(null).
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByText('Bug marked resolved')).not.toBeInTheDocument());
  });

  it('succeeds when no refetch handler is bound', async () => {
    m.assignRefetch = false;
    m.updateMock.mockResolvedValueOnce({ data: {} });
    render(<BugsPage />);

    fireEvent.click(screen.getByRole('button', { name: 'open-bug' }));
    fireEvent.click(screen.getByRole('button', { name: 'mark-resolved' }));

    expect(await screen.findByText('Bug marked resolved')).toBeInTheDocument();
    expect(m.refetchSpy).not.toHaveBeenCalled();
    expect(m.notifyError).not.toHaveBeenCalled();
  });

  it('reports an Error-instance failure via notifyError', async () => {
    m.updateMock.mockRejectedValueOnce(new Error('kaboom'));
    render(<BugsPage />);

    fireEvent.click(screen.getByRole('button', { name: 'open-bug' }));
    fireEvent.click(screen.getByRole('button', { name: 'mark-resolved' }));

    await waitFor(() => expect(m.notifyError).toHaveBeenCalledWith('kaboom'));
  });

  it('reports a non-Error failure with the fallback message', async () => {
    m.updateMock.mockRejectedValueOnce('weird');
    render(<BugsPage />);

    fireEvent.click(screen.getByRole('button', { name: 'open-bug' }));
    fireEvent.click(screen.getByRole('button', { name: 'mark-resolved' }));

    await waitFor(() => expect(m.notifyError).toHaveBeenCalledWith('Failed to update bug'));
  });

  it('closes the detail dialog', () => {
    render(<BugsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'open-bug' }));
    expect(screen.getByTestId('detail')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'close-dialog' }));
    expect(screen.queryByTestId('detail')).not.toBeInTheDocument();
  });
});
