import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useParams } from 'react-router';
import type { BugRow } from '../../src/pages/bugs-page/queries';

const m = vi.hoisted(() => ({
  fetchRows: vi.fn(),
  deleteOne: vi.fn(),
  refetchSpy: vi.fn(),
  userData: { user: null as { roles?: string[] } | null },
}));

vi.mock('@apollo/client/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@apollo/client/react')>();
  return { ...actual, useApolloClient: () => ({}) };
});
vi.mock('@duncit/table', () => ({ useApolloTableFetch: () => m.fetchRows }));
vi.mock('@duncit/user-context', () => ({ useUserData: () => m.userData }));
vi.mock('../../src/pages/bugs-page/useDeleteSingleBug', () => ({
  useDeleteSingleBug: () => m.deleteOne,
}));
vi.mock('../../src/pages/bugs-page/BugImportExport', () => ({
  default: (p: { onImported: () => void }) => (
    <button type="button" onClick={p.onImported}>
      imported
    </button>
  ),
}));
vi.mock('../../src/components/telemetry-delete', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/components/telemetry-delete')>();
  return {
    ...actual,
    TelemetryDeleteButton: (p: { target: string; canDeleteEverything: boolean }) => (
      <span data-testid="delete-button">
        {p.target}:{String(p.canDeleteEverything)}
      </span>
    ),
    TelemetryBulkBar: (p: { target: string; selectedIds: string[] }) => (
      <span data-testid="bulk-bar">
        {p.target}:{p.selectedIds.join(',')}
      </span>
    ),
  };
});

const bug = { id: 'b1', title: 'Boom' } as BugRow;
const other = { id: 'b2', title: 'Bang' } as BugRow;

vi.mock('../../src/pages/bugs-page/BugsTable', () => ({
  default: (p: {
    fetchRows: unknown;
    refetchRef: { current: (() => void) | null };
    onOpen: (b: BugRow) => void;
    onDelete: (b: BugRow) => void;
    selection: { onChange: (rows: BugRow[]) => void };
    toolbarActions: ReactNode;
  }) => {
    p.refetchRef.current = m.refetchSpy;
    return (
      <div>
        {p.toolbarActions}
        <span data-testid="fetch-wired">{String(p.fetchRows === m.fetchRows)}</span>
        <button type="button" onClick={() => p.onOpen(bug)}>
          open-bug
        </button>
        <button type="button" onClick={() => p.onDelete(bug)}>
          delete-bug
        </button>
        <button type="button" onClick={() => p.selection.onChange([bug, other])}>
          tick-rows
        </button>
      </div>
    );
  },
}));

import BugsPage from '../../src/pages/bugs-page/index';

function BugRoute() {
  const { bugId } = useParams();
  return <p>bug route {bugId}</p>;
}

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/telemetry/bugs']}>
      <Routes>
        <Route path="/telemetry/bugs" element={<BugsPage />} />
        <Route path="/telemetry/bugs/:bugId" element={<BugRoute />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  m.deleteOne.mockReset();
  m.refetchSpy.mockReset();
  m.userData = { user: null };
});

describe('BugsPage', () => {
  it('renders the heading and hands the table the server fetcher', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Bugs' })).toBeInTheDocument();
    expect(screen.getByTestId('fetch-wired')).toHaveTextContent('true');
  });

  it('opens a bug at its own address instead of a dialog', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'open-bug' }));
    expect(screen.getByText('bug route b1')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1, name: 'Bugs' })).not.toBeInTheDocument();
  });

  it('routes the per-row delete to the single-bug delete', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'delete-bug' }));
    expect(m.deleteOne).toHaveBeenCalledWith(bug);
  });

  it('shows the ticked rows in the bulk bar', () => {
    renderPage();
    expect(screen.getByTestId('bulk-bar')).toHaveTextContent(/^BUGS:$/);
    fireEvent.click(screen.getByRole('button', { name: 'tick-rows' }));
    expect(screen.getByTestId('bulk-bar')).toHaveTextContent('BUGS:b1,b2');
  });

  it('reloads the table after an import', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'imported' }));
    expect(m.refetchSpy).toHaveBeenCalledTimes(1);
  });

  it('lets only a super admin delete everything', () => {
    m.userData = { user: { roles: ['SUPER_ADMIN'] } };
    const { unmount } = renderPage();
    expect(screen.getByTestId('delete-button')).toHaveTextContent('BUGS:true');
    unmount();

    m.userData = { user: { roles: ['ADMIN'] } };
    renderPage();
    expect(screen.getByTestId('delete-button')).toHaveTextContent('BUGS:false');
  });

  it('treats a missing user or missing roles as not a super admin', () => {
    const { unmount } = renderPage();
    expect(screen.getByTestId('delete-button')).toHaveTextContent('BUGS:false');
    unmount();

    m.userData = { user: {} };
    renderPage();
    expect(screen.getByTestId('delete-button')).toHaveTextContent('BUGS:false');
  });
});
