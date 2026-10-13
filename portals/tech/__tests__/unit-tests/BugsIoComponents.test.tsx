import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import type { BugRow } from '../../src/pages/bugs-page/queries';

const m = vi.hoisted(() => ({
  query: vi.fn(),
  importMut: vi.fn(),
  deleteMut: vi.fn(),
  importing: false,
  confirm: vi.fn(),
  notify: vi.fn(),
  download: vi.fn(),
  copyToClipboard: vi.fn(),
  apiKey: 'pk_test' as string | undefined,
  keyLoading: false,
}));

vi.mock('@apollo/client/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@apollo/client/react')>();
  return {
    ...actual,
    useApolloClient: () => ({ query: m.query }),
    useQuery: () => ({
      data: m.apiKey === undefined ? undefined : { telemetrySettings: { public_api_key: m.apiKey } },
      loading: m.keyLoading,
    }),
    useMutation: (doc: { definitions: Array<{ name?: { value: string } }> }) => {
      const name = doc.definitions[0]?.name?.value;
      return name === 'ImportBugs'
        ? [m.importMut, { loading: m.importing }]
        : [m.deleteMut, { loading: false }];
    },
  };
});
vi.mock('@duncit/dialogs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@duncit/dialogs')>();
  return { ...actual, notify: m.notify, useConfirm: () => m.confirm };
});
vi.mock('@duncit/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@duncit/utils')>();
  return {
    ...actual,
    downloadTextFile: m.download,
    copyToClipboard: m.copyToClipboard,
    parseApiError: (e: unknown) => (e instanceof Error ? e.message : 'unknown'),
  };
});

import BugImportExport from '../../src/pages/bugs-page/BugImportExport';
import BugsTable from '../../src/pages/bugs-page/BugsTable';
import CopyGetApiButton from '../../src/components/CopyGetApiButton';
import { useDeleteSingleBug } from '../../src/pages/bugs-page/useDeleteSingleBug';

const bug = (over: Partial<BugRow> = {}): BugRow =>
  ({
    id: 'b1',
    title: 'Boom',
    error_name: 'TypeError',
    message: 'x',
    page: '/home',
    source: 'mweb:home',
    app: 'mweb',
    platform: 'web',
    occurrence_count: 4,
    first_seen_at: '2026-01-01T00:00:00.000Z',
    last_seen_at: '2026-01-02T00:00:00.000Z',
    env_counts: { localhost: 0, staging: 0, production: 0 },
    status: 'OPEN',
    fingerprint: 'fp1',
    ...over,
  }) as BugRow;

beforeEach(() => {
  vi.clearAllMocks();
  m.importing = false;
  m.apiKey = 'pk_test';
  m.keyLoading = false;
  m.copyToClipboard.mockResolvedValue(true);
});

const pick = (container: HTMLElement, content: string) => {
  const input = container.querySelector('input[type="file"]') as HTMLInputElement;
  const file = new File([content], 'bugs.json', { type: 'application/json' });
  fireEvent.change(input, { target: { files: [file] } });
};

describe('BugImportExport', () => {
  it('exports every bug fetched from the server as a dated JSON file', async () => {
    m.query.mockResolvedValue({ data: { bugsExport: [bug()] } });
    render(<BugImportExport onImported={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    await waitFor(() => expect(m.download).toHaveBeenCalledTimes(1));
    const [body, filename, mime] = m.download.mock.calls[0];
    expect(JSON.parse(body).bugs[0].fingerprint).toBe('fp1');
    expect(filename).toMatch(/^duncit-bugs-\d{4}-\d{2}-\d{2}\.json$/);
    expect(mime).toBe('application/json');
    expect(m.notify).toHaveBeenCalledWith('Exported 1 bugs', 'success');
  });

  it('tells the operator when there is nothing to export and downloads nothing', async () => {
    m.query.mockResolvedValue({ data: { bugsExport: [] } });
    render(<BugImportExport onImported={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    await waitFor(() => expect(m.notify).toHaveBeenCalledWith('There are no bugs to export yet.', 'info'));
    expect(m.download).not.toHaveBeenCalled();
  });

  it('treats a missing export payload as an empty list', async () => {
    m.query.mockResolvedValue({ data: undefined });
    render(<BugImportExport onImported={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    await waitFor(() => expect(m.notify).toHaveBeenCalledWith('There are no bugs to export yet.', 'info'));
  });

  it('surfaces an export failure and re-enables the button', async () => {
    m.query.mockRejectedValue(new Error('network down'));
    render(<BugImportExport onImported={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    await waitFor(() => expect(m.notify).toHaveBeenCalledWith('network down', 'error'));
    expect(screen.getByRole('button', { name: 'Export' })).toBeEnabled();
  });

  it('rejects a file that is not a bugs export without asking to confirm', async () => {
    const { container } = render(<BugImportExport onImported={vi.fn()} />);
    pick(container, 'not json');
    await waitFor(() => expect(m.notify).toHaveBeenCalledWith('That file is not valid JSON.', 'error'));
    expect(m.confirm).not.toHaveBeenCalled();
    expect(m.importMut).not.toHaveBeenCalled();
  });

  it('imports after confirmation and reports created/updated counts', async () => {
    m.confirm.mockResolvedValue(true);
    m.importMut.mockResolvedValue({ data: { importBugs: { created: 2, updated: 1 } } });
    const onImported = vi.fn();
    const { container } = render(<BugImportExport onImported={onImported} />);
    pick(
      container,
      JSON.stringify({ bugs: [{ fingerprint: 'fp1', title: 'Boom', page: '/p', source: 'mweb:x' }] }),
    );
    await waitFor(() => expect(onImported).toHaveBeenCalled());
    expect(m.confirm).toHaveBeenCalledWith(expect.objectContaining({ title: 'Import 1 bugs', destructive: true }));
    expect(m.importMut.mock.calls[0][0].variables.bugs).toHaveLength(1);
    expect(m.notify).toHaveBeenCalledWith('Imported — 2 added, 1 overwritten', 'success');
  });

  it('reports zero counts when the server returns no result body', async () => {
    m.confirm.mockResolvedValue(true);
    m.importMut.mockResolvedValue({ data: undefined });
    const onImported = vi.fn();
    const { container } = render(<BugImportExport onImported={onImported} />);
    pick(container, JSON.stringify({ bugs: [{ fingerprint: 'fp', title: 't', page: 'p', source: 's' }] }));
    await waitFor(() => expect(onImported).toHaveBeenCalled());
    expect(m.notify).toHaveBeenCalledWith('Imported — 0 added, 0 overwritten', 'success');
  });

  it('writes nothing when the operator declines the overwrite', async () => {
    m.confirm.mockResolvedValue(false);
    const { container } = render(<BugImportExport onImported={vi.fn()} />);
    pick(container, JSON.stringify({ bugs: [{ fingerprint: 'fp', title: 't', page: 'p', source: 's' }] }));
    await waitFor(() => expect(m.confirm).toHaveBeenCalled());
    expect(m.importMut).not.toHaveBeenCalled();
  });

  it('surfaces a failed import and does not report success', async () => {
    m.confirm.mockResolvedValue(true);
    m.importMut.mockRejectedValue(new Error('server said no'));
    const onImported = vi.fn();
    const { container } = render(<BugImportExport onImported={onImported} />);
    pick(container, JSON.stringify({ bugs: [{ fingerprint: 'fp', title: 't', page: 'p', source: 's' }] }));
    await waitFor(() => expect(m.notify).toHaveBeenCalledWith('server said no', 'error'));
    expect(onImported).not.toHaveBeenCalled();
  });

  it('ignores a change event with no file and shows the busy label while importing', () => {
    m.importing = true;
    const { container } = render(<BugImportExport onImported={vi.fn()} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [] } });
    expect(m.confirm).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Importing…' })).toBeDisabled();
  });

  it('opens the hidden file picker from the Import button', () => {
    const { container } = render(<BugImportExport onImported={vi.fn()} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const click = vi.spyOn(input, 'click');
    fireEvent.click(screen.getByRole('button', { name: 'Import' }));
    expect(click).toHaveBeenCalled();
  });
});

describe('CopyGetApiButton', () => {
  it('copies the feed URL with the key and pinned filters', async () => {
    render(<CopyGetApiButton path="/telemetry/bugs.json" params={{ status: 'OPEN' }} label="Copy API" />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy API' }));
    await waitFor(() => expect(m.copyToClipboard).toHaveBeenCalled());
    const url = new URL(m.copyToClipboard.mock.calls[0][0]);
    expect(url.pathname).toBe('/telemetry/bugs.json');
    expect(url.searchParams.get('key')).toBe('pk_test');
    expect(url.searchParams.get('status')).toBe('OPEN');
    expect(m.notify).toHaveBeenCalledWith(expect.stringContaining('copied'), 'success');
  });

  it('reports a clipboard failure', async () => {
    m.copyToClipboard.mockResolvedValue(false);
    render(<CopyGetApiButton path="/x.json" label="Copy API" />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy API' }));
    await waitFor(() => expect(m.notify).toHaveBeenCalledWith('Could not copy the URL', 'error'));
    expect(new URL(m.copyToClipboard.mock.calls[0][0]).searchParams.get('key')).toBe('pk_test');
  });

  it('stays disabled until the key has loaded', () => {
    m.apiKey = undefined;
    render(<CopyGetApiButton path="/x.json" label="Copy API" />);
    expect(screen.getByRole('button', { name: 'Copy API' })).toBeDisabled();
  });
});

describe('BugsTable cells', () => {
  const renderTable = (rows: BugRow[], over: Record<string, unknown> = {}) => {
    const props = {
      fetchRows: vi.fn(async () => ({ rows, total: rows.length })),
      refetchRef: { current: null },
      onOpen: vi.fn(),
      onDelete: vi.fn(),
      selection: { onChange: vi.fn(), clearRef: { current: null } },
      onQueryChange: vi.fn(),
      ...over,
    };
    render(<BugsTable {...props} />);
    return props;
  };

  it('routes the bin button to onDelete and Triage to onOpen', async () => {
    const row = bug();
    const props = renderTable([row]);
    await screen.findByText('Boom');
    const buttons = screen.getAllByRole('button');
    const bin = buttons.find((b) => b.querySelector('[data-testid="DeleteOutlinedIcon"]'));
    expect(bin).toBeDefined();
    fireEvent.click(bin as HTMLElement);
    expect(props.onDelete).toHaveBeenCalledWith(row);
    fireEvent.click(screen.getByRole('button', { name: 'Triage' }));
    expect(props.onOpen).toHaveBeenCalledWith(row);
  });

  it('summarises only the environments the bug hit', async () => {
    renderTable([bug({ env_counts: { localhost: 1, staging: 2, production: 3 } })]);
    expect(await screen.findByText('P 3 · S 2 · L 1')).toBeInTheDocument();
  });
});

describe('useDeleteSingleBug', () => {
  it('names the bug in the confirmation, deletes it and reports the server count', async () => {
    m.confirm.mockResolvedValue(true);
    m.deleteMut.mockResolvedValue({ data: { deleteBugs: 1 } });
    const onDeleted = vi.fn();
    const { result } = renderHook(() => useDeleteSingleBug(onDeleted));
    await result.current(bug({ occurrence_count: 7 }));
    expect(m.confirm).toHaveBeenCalledWith(
      expect.objectContaining({ destructive: true, message: expect.stringContaining('"Boom" and its 7') }),
    );
    expect(m.deleteMut).toHaveBeenCalledWith({ variables: { ids: ['b1'] } });
    expect(m.notify).toHaveBeenCalledWith(expect.any(String), 'success');
    expect(onDeleted).toHaveBeenCalled();
  });

  it('does nothing when the operator cancels', async () => {
    m.confirm.mockResolvedValue(false);
    const onDeleted = vi.fn();
    const { result } = renderHook(() => useDeleteSingleBug(onDeleted));
    await result.current(bug());
    expect(m.deleteMut).not.toHaveBeenCalled();
    expect(onDeleted).not.toHaveBeenCalled();
  });

  it('reports a server failure and does not signal a deletion', async () => {
    m.confirm.mockResolvedValue(true);
    m.deleteMut.mockRejectedValue(new Error('forbidden'));
    const onDeleted = vi.fn();
    const { result } = renderHook(() => useDeleteSingleBug(onDeleted));
    await result.current(bug());
    expect(m.notify).toHaveBeenCalledWith('forbidden', 'error');
    expect(onDeleted).not.toHaveBeenCalled();
  });

  it('falls back to a zero count when the server returns no body', async () => {
    m.confirm.mockResolvedValue(true);
    m.deleteMut.mockResolvedValue({ data: undefined });
    const onDeleted = vi.fn();
    const { result } = renderHook(() => useDeleteSingleBug(onDeleted));
    await result.current(bug());
    expect(onDeleted).toHaveBeenCalled();
  });
});
