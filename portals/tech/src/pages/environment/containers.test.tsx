import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { EnvEntry, EnvCategoryDef } from './queries';
import type { EnvEntryFormValues } from './env-entry';

// ---- Apollo -------------------------------------------------------------
const a = vi.hoisted(() => ({
  queryData: undefined as unknown,
  run: vi.fn(),
  mutLoading: false,
  clientQuery: vi.fn(),
}));
vi.mock('@apollo/client', async (io) => {
  const actual = await io<typeof import('@apollo/client')>();
  return {
    ...actual,
    useQuery: () => ({ data: a.queryData }),
    useMutation: () => [a.run, { loading: a.mutLoading }] as const,
    useApolloClient: () => ({ query: a.clientQuery }),
  };
});

// ---- Hoisted mock state (referenced inside vi.mock factories) -----------
const m = vi.hoisted(() => ({
  notify: vi.fn(),
  confirmMock: vi.fn(),
  refetchSpy: vi.fn(),
  assignRefetch: true,
  sample: {
    id: 'ent1', name: 'SMTP One', category: 'EMAIL', description: 'd',
    is_default: false, is_active: true, assigned_portals: ['crm'],
    config: [{ key: 'host', value: 'smtp' }], secrets: [],
    last_used_at: null, last_tested_at: null, last_test_ok: null,
    created_at: null, updated_at: null,
  } as EnvEntry,
}));
const { notify, confirmMock, refetchSpy, sample } = m;
const st = m;

vi.mock('@duncit/dialogs', () => ({ notify: m.notify, useConfirm: () => m.confirmMock }));
vi.mock('@duncit/utils', () => ({ parseApiError: (e: unknown) => (e instanceof Error ? e.message : 'err') }));
vi.mock('@duncit/table', () => ({
  useApolloTableFetch: () => vi.fn(),
  tableQueryToGql: (q: unknown) => q,
}));

vi.mock('./EnvEntriesTable', () => ({
  default: (p: {
    refetchRef: { current: (() => void) | null };
    toolbarActions?: React.ReactNode;
    onEdit: (e: EnvEntry) => void;
    onDelete: (e: EnvEntry) => void;
    onSetDefault: (e: EnvEntry) => void;
    onTest: (e: EnvEntry) => void;
  }) => {
    if (m.assignRefetch) p.refetchRef.current = m.refetchSpy;
    return (
      <div data-testid="env-table">
        {p.toolbarActions}
        <button type="button" onClick={() => p.onEdit(m.sample)}>tbl-edit</button>
        <button type="button" onClick={() => p.onDelete(m.sample)}>tbl-delete</button>
        <button type="button" onClick={() => p.onSetDefault(m.sample)}>tbl-default</button>
        <button type="button" onClick={() => p.onTest(m.sample)}>tbl-test</button>
      </div>
    );
  },
}));

vi.mock('./env-entry', async (io) => {
  const actual = await io<typeof import('./env-entry')>();
  return {
    ...actual,
    EnvEntryForm: (p: {
      open: boolean;
      onClose: () => void;
      onSubmit: (v: EnvEntryFormValues) => void;
      onTest: (e: EnvEntry) => void;
    }) =>
      p.open ? (
        <div data-testid="env-form">
          <button
            type="button"
            onClick={() => p.onSubmit({ name: 'New Name', description: 'desc', is_default: false, is_active: true, config: { host: 'h' } })}
          >
            form-submit
          </button>
          <button type="button" onClick={p.onClose}>form-close</button>
          <button type="button" onClick={() => p.onTest(sample)}>form-test</button>
        </div>
      ) : null,
  };
});

vi.mock('./test-panels', () => ({
  default: (p: { entry: EnvEntry | null; onClose: () => void }) =>
    p.entry ? (
      <div data-testid="test-drawer">
        <span>testing:{p.entry.name}</span>
        <button type="button" onClick={p.onClose}>drawer-close</button>
      </div>
    ) : null,
}));

// PortalMappingTab children
vi.mock('./portal-mapping/PortalMappingTable', () => ({
  default: (p: {
    fetchRows: (q: unknown) => Promise<{ rows: unknown[]; total: number }>;
    refetchRef: { current: (() => void) | null };
    onInfo: (r: unknown) => void;
    onAssign: (p: unknown) => void;
  }) => {
    if (m.assignRefetch) p.refetchRef.current = m.refetchSpy;
    return (
      <div data-testid="mapping-table">
        <button type="button" onClick={async () => { (globalThis as { __rows?: unknown }).__rows = await p.fetchRows({ page: 0 }); }}>
          map-fetch
        </button>
        <button type="button" onClick={() => p.onInfo({ portal: { key: 'crm', name: 'CRM' }, entries: [] })}>map-info</button>
        <button type="button" onClick={() => p.onAssign({ key: 'crm', name: 'CRM' })}>map-assign</button>
      </div>
    );
  },
}));
vi.mock('./portal-mapping/PortalInfoDialog', () => ({
  default: (p: { row: unknown; onClose: () => void }) =>
    p.row ? <button type="button" onClick={p.onClose}>info-close</button> : null,
}));
vi.mock('./PortalEnvDrawer', () => ({
  default: (p: { portal: unknown; onClose: () => void; onSaved: () => void }) =>
    p.portal ? (
      <div>
        <button type="button" onClick={p.onSaved}>drawer-saved</button>
        <button type="button" onClick={p.onClose}>penv-close</button>
      </div>
    ) : null,
}));

import EnvironmentPage from './index';
import EnvVariablesTab from './EnvVariablesTab';
import PortalMappingTab from './PortalMappingTab';

const catDef: EnvCategoryDef = { category: 'EMAIL', label: 'Email', docUrl: null, fields: [{ name: 'host', label: 'Host', secret: false, number: false, bool: false }] };

beforeEach(() => {
  notify.mockReset();
  confirmMock.mockReset();
  refetchSpy.mockReset();
  a.run.mockReset();
  a.run.mockResolvedValue({ data: {} });
  a.queryData = undefined;
  a.mutLoading = false;
  a.clientQuery.mockReset();
  st.assignRefetch = true;
});

describe('EnvironmentPage (tabs)', () => {
  it('switches between Variables and Portal Mapping', () => {
    render(<EnvironmentPage />);
    expect(screen.getByTestId('env-table')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Portal Mapping' }));
    expect(screen.getByTestId('mapping-table')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Variables' }));
    expect(screen.getByTestId('env-table')).toBeInTheDocument();
  });
});

describe('EnvVariablesTab', () => {
  it('creates an entry (fallback category def) and refetches', async () => {
    render(<EnvVariablesTab />);
    fireEvent.click(screen.getByRole('button', { name: /Add Email/i }));
    fireEvent.click(screen.getByRole('button', { name: 'form-submit' }));
    await waitFor(() => expect(notify).toHaveBeenCalledWith('New Name created', 'success'));
    expect(refetchSpy).toHaveBeenCalled();
  });

  it('updates an entry using the server category definition and busy flag', async () => {
    a.queryData = { envCategories: [catDef] };
    a.mutLoading = true; // exercises the busy OR expression truthy side
    render(<EnvVariablesTab />);
    fireEvent.click(screen.getByRole('button', { name: 'tbl-edit' }));
    fireEvent.click(screen.getByRole('button', { name: 'form-submit' }));
    await waitFor(() => expect(notify).toHaveBeenCalledWith('New Name updated', 'success'));
  });

  it('notifies on a submit error', async () => {
    a.run.mockRejectedValue(new Error('create boom'));
    render(<EnvVariablesTab />);
    fireEvent.click(screen.getByRole('button', { name: /Add Email/i }));
    fireEvent.click(screen.getByRole('button', { name: 'form-submit' }));
    await waitFor(() => expect(notify).toHaveBeenCalledWith('create boom', 'error'));
  });

  it('deletes after confirm and refetches', async () => {
    confirmMock.mockResolvedValue(true);
    render(<EnvVariablesTab />);
    fireEvent.click(screen.getByRole('button', { name: 'tbl-delete' }));
    await waitFor(() => expect(notify).toHaveBeenCalledWith('SMTP One deleted', 'success'));
  });

  it('skips delete when the confirm is declined', async () => {
    confirmMock.mockResolvedValue(false);
    render(<EnvVariablesTab />);
    fireEvent.click(screen.getByRole('button', { name: 'tbl-delete' }));
    await waitFor(() => expect(confirmMock).toHaveBeenCalled());
    expect(notify).not.toHaveBeenCalled();
  });

  it('notifies on a delete error', async () => {
    confirmMock.mockResolvedValue(true);
    a.run.mockRejectedValue(new Error('del boom'));
    render(<EnvVariablesTab />);
    fireEvent.click(screen.getByRole('button', { name: 'tbl-delete' }));
    await waitFor(() => expect(notify).toHaveBeenCalledWith('del boom', 'error'));
  });

  it('sets a default (null refetchRef branch) and notifies', async () => {
    st.assignRefetch = false; // refetchRef.current stays null -> optional-chain short circuit
    render(<EnvVariablesTab />);
    fireEvent.click(screen.getByRole('button', { name: 'tbl-default' }));
    await waitFor(() => expect(notify).toHaveBeenCalledWith('SMTP One is now the default', 'success'));
  });

  it('sets a default (assigned refetchRef branch) and notifies', async () => {
    render(<EnvVariablesTab />); // assignRefetch stays true -> refetchRef.current invoked
    fireEvent.click(screen.getByRole('button', { name: 'tbl-default' }));
    await waitFor(() => expect(notify).toHaveBeenCalledWith('SMTP One is now the default', 'success'));
    expect(refetchSpy).toHaveBeenCalled();
  });

  it('notifies on a set-default error', async () => {
    a.run.mockRejectedValue(new Error('def boom'));
    render(<EnvVariablesTab />);
    fireEvent.click(screen.getByRole('button', { name: 'tbl-default' }));
    await waitFor(() => expect(notify).toHaveBeenCalledWith('def boom', 'error'));
  });

  it('switches the active category tab', () => {
    render(<EnvVariablesTab />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs.length).toBeGreaterThan(1);
    fireEvent.click(tabs[1]); // exercises the Tabs onChange -> setCategory
    expect(screen.getByTestId('env-table')).toBeInTheDocument();
  });

  it('opens the test drawer from the table and from the form, then closes it', () => {
    render(<EnvVariablesTab />);
    fireEvent.click(screen.getByRole('button', { name: 'tbl-test' }));
    expect(screen.getByText('testing:SMTP One')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'drawer-close' }));
    expect(screen.queryByTestId('test-drawer')).not.toBeInTheDocument();
    // form-test path: opens form via edit, then jumps to the test drawer
    fireEvent.click(screen.getByRole('button', { name: 'tbl-edit' }));
    fireEvent.click(screen.getByRole('button', { name: 'form-test' }));
    expect(screen.getByText('testing:SMTP One')).toBeInTheDocument();
  });

  it('closes the form via its close button', () => {
    render(<EnvVariablesTab />);
    fireEvent.click(screen.getByRole('button', { name: 'tbl-edit' }));
    expect(screen.getByTestId('env-form')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'form-close' }));
    expect(screen.queryByTestId('env-form')).not.toBeInTheDocument();
  });
});

describe('PortalMappingTab', () => {
  it('joins portals with their assigned entries and refetches on save', async () => {
    a.clientQuery
      .mockResolvedValueOnce({ data: { portalModesTable: { rows: [{ key: 'crm', name: 'CRM' }], total: 1 } } })
      .mockResolvedValueOnce({ data: { envEntries: [{ ...sample, assigned_portals: ['crm'] }, { ...sample, id: 'x2', assigned_portals: ['ads'] }] } });
    render(<PortalMappingTab />);
    fireEvent.click(screen.getByRole('button', { name: 'map-fetch' }));
    await waitFor(() => {
      const res = (globalThis as { __rows?: { rows: { entries: unknown[] }[]; total: number } }).__rows;
      expect(res?.total).toBe(1);
      expect(res?.rows[0].entries).toHaveLength(1);
    });

    fireEvent.click(screen.getByRole('button', { name: 'map-info' }));
    fireEvent.click(screen.getByRole('button', { name: 'info-close' }));

    fireEvent.click(screen.getByRole('button', { name: 'map-assign' }));
    fireEvent.click(screen.getByRole('button', { name: 'drawer-saved' })); // handleSaved -> refetch
    expect(refetchSpy).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'penv-close' }));
  });
});
