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

import EnvImportExport from '../../src/pages/environment/EnvImportExport';
import FlagImportExport from '../../src/pages/feature-flags-page/FlagImportExport';
import { makeEnvEntry } from '../mocks';

const pickFile = (label: string, content: string) => {
  const input = screen.getByLabelText(label, { exact: false }) as HTMLInputElement;
  const file = new File([content], 'in.json', { type: 'application/json' });
  fireEvent.change(input, { target: { files: [file] } });
};

beforeEach(() => {
  Object.values(m).forEach((v) => typeof v === 'function' && 'mockReset' in v && v.mockReset());
  m.loading = false;
});

describe('EnvImportExport', () => {
  const renderEnv = (onImported = vi.fn()) => {
    renderWithProviders(
      <EnvImportExport category={'EMAIL' as never} categoryLabel="Email" onImported={onImported} />,
    );
    return onImported;
  };
  const openMenu = () => fireEvent.click(screen.getByTestId('env-export-menu-open'));

  it('exports one category after the secrets warning is accepted', async () => {
    m.confirm.mockResolvedValue(true);
    m.query.mockResolvedValue({ data: { envEntries: [makeEnvEntry()] } });
    renderEnv();
    openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Email only' }));

    await waitFor(() => expect(m.download).toHaveBeenCalledTimes(1));
    expect(m.confirm.mock.calls[0][0].message).toContain('Email');
    expect(m.query.mock.calls[0][0].variables).toEqual({ filter: { category: 'EMAIL' } });
    const [body, filename, mime] = m.download.mock.calls[0];
    expect(JSON.parse(body).entries[0]).toMatchObject({ name: 'SMTP One', category: 'EMAIL' });
    expect(filename).toMatch(/^duncit-env-EMAIL-\d{4}-\d{2}-\d{2}\.json$/);
    expect(mime).toBe('application/json');
    expect(m.notify).toHaveBeenCalledWith('Exported 1 entries', 'success');
  });

  it('exports every category with an empty filter', async () => {
    m.confirm.mockResolvedValue(true);
    m.query.mockResolvedValue({ data: { envEntries: [makeEnvEntry()] } });
    renderEnv();
    openMenu();
    const items = screen.getAllByRole('menuitem');
    fireEvent.click(items[1]);

    await waitFor(() => expect(m.download).toHaveBeenCalled());
    expect(m.query.mock.calls[0][0].variables).toEqual({ filter: {} });
    expect(m.confirm.mock.calls[0][0].message).toContain('every category');
    expect(m.download.mock.calls[0][1]).toContain('duncit-env-all-');
  });

  it('closes the export menu with Escape without exporting', async () => {
    renderEnv();
    openMenu();
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    expect(m.confirm).not.toHaveBeenCalled();
  });

  it('does not query when the export confirmation is declined', async () => {
    m.confirm.mockResolvedValue(false);
    renderEnv();
    openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Email only' }));
    await waitFor(() => expect(m.confirm).toHaveBeenCalled());
    expect(m.query).not.toHaveBeenCalled();
    expect(m.download).not.toHaveBeenCalled();
  });

  it('says there is nothing to export when the server returns no entries', async () => {
    m.confirm.mockResolvedValue(true);
    m.query.mockResolvedValue({ data: undefined });
    renderEnv();
    openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Email only' }));
    await waitFor(() =>
      expect(m.notify).toHaveBeenCalledWith('There is nothing to export yet.', 'info'),
    );
    expect(m.download).not.toHaveBeenCalled();
  });

  it('reports an export failure and re-enables the button', async () => {
    m.confirm.mockResolvedValue(true);
    m.query.mockRejectedValue(new Error('export exploded'));
    renderEnv();
    openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Email only' }));
    await waitFor(() => expect(m.notify).toHaveBeenCalledWith('export exploded', 'error'));
    await waitFor(() => expect(screen.getByTestId('env-export-menu-open')).toBeEnabled());
  });

  it('rejects an unreadable file without asking for confirmation', async () => {
    renderEnv();
    pickFile('JSON file', 'not json');
    await waitFor(() => expect(m.notify).toHaveBeenCalledWith('That file is not valid JSON.', 'error'));
    expect(m.confirm).not.toHaveBeenCalled();
    expect(m.mutate).not.toHaveBeenCalled();
  });

  const validFile = JSON.stringify({
    entries: [{ name: 'SMTP', category: 'EMAIL', config: { host: 'h' } }],
  });

  it('imports after confirmation, summarises the result and notifies the parent', async () => {
    m.confirm.mockResolvedValue(true);
    m.mutate.mockResolvedValue({
      data: { importEnvEntries: { created: ['a'], updated: ['b', 'c'], skipped: ['d'] } },
    });
    const onImported = renderEnv();
    pickFile('JSON file', validFile);

    await waitFor(() => expect(onImported).toHaveBeenCalled());
    expect(m.confirm.mock.calls[0][0]).toMatchObject({ title: 'Import 1 entries', destructive: true });
    expect(m.mutate.mock.calls[0][0].variables.entries).toEqual([
      expect.objectContaining({ name: 'SMTP', config: [{ key: 'host', value: 'h' }] }),
    ]);
    expect(m.notify).toHaveBeenCalledWith('Imported — 1 added, 2 updated, 1 skipped', 'success');
  });

  it('omits the skipped count when nothing was skipped', async () => {
    m.confirm.mockResolvedValue(true);
    m.mutate.mockResolvedValue({ data: undefined });
    renderEnv();
    pickFile('JSON file', validFile);
    await waitFor(() =>
      expect(m.notify).toHaveBeenCalledWith('Imported — 0 added, 0 updated', 'success'),
    );
  });

  it('leaves the server alone when the import confirmation is declined', async () => {
    m.confirm.mockResolvedValue(false);
    const onImported = renderEnv();
    pickFile('JSON file', validFile);
    await waitFor(() => expect(m.confirm).toHaveBeenCalled());
    expect(m.mutate).not.toHaveBeenCalled();
    expect(onImported).not.toHaveBeenCalled();
  });

  it('shows the API error when the import fails', async () => {
    m.confirm.mockResolvedValue(true);
    m.mutate.mockRejectedValue(new Error('import denied'));
    const onImported = renderEnv();
    pickFile('JSON file', validFile);
    await waitFor(() => expect(m.notify).toHaveBeenCalledWith('import denied', 'error'));
    expect(onImported).not.toHaveBeenCalled();
  });

  it('does nothing when the picker is cancelled and shows progress while importing', () => {
    m.loading = true;
    renderEnv();
    const input = screen.getByLabelText('JSON file', { exact: false }) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [] } });
    expect(m.confirm).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Importing…' })).toBeDisabled();
  });

  it('opens the file picker from the Import button', () => {
    renderEnv();
    const input = screen.getByLabelText('JSON file', { exact: false }) as HTMLInputElement;
    const click = vi.spyOn(input, 'click');
    fireEvent.click(screen.getByRole('button', { name: 'Import' }));
    expect(click).toHaveBeenCalled();
  });
});

describe('FlagImportExport', () => {
  const renderFlags = (onImported = vi.fn()) => {
    renderWithProviders(<FlagImportExport onImported={onImported} />);
    return onImported;
  };
  const file = JSON.stringify({
    flags: [
      { key: 'alpha', name: 'Alpha', enabled: true },
      { key: 'beta', name: 'Beta', enabled: false },
    ],
  });

  it('downloads every flag as a dated JSON file', async () => {
    m.query.mockResolvedValue({
      data: { featureFlags: [{ key: 'a', name: 'A', description: null, enabled: true }] },
    });
    renderFlags();
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    await waitFor(() => expect(m.download).toHaveBeenCalled());
    expect(JSON.parse(m.download.mock.calls[0][0]).flags).toEqual([
      { key: 'a', name: 'A', description: '', enabled: true },
    ]);
    expect(m.download.mock.calls[0][1]).toMatch(/^duncit-feature-flags-\d{4}-\d{2}-\d{2}\.json$/);
    expect(m.notify).toHaveBeenCalledWith('Exported 1 flags', 'success');
  });

  it('says so when there are no flags', async () => {
    m.query.mockResolvedValue({ data: { featureFlags: [] } });
    renderFlags();
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    await waitFor(() =>
      expect(m.notify).toHaveBeenCalledWith('There is nothing to export yet.', 'info'),
    );
    expect(m.download).not.toHaveBeenCalled();
  });

  it('treats a missing payload as no flags', async () => {
    m.query.mockResolvedValue({ data: undefined });
    renderFlags();
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    await waitFor(() => expect(m.notify).toHaveBeenCalledWith('There is nothing to export yet.', 'info'));
  });

  it('reports an export failure', async () => {
    m.query.mockRejectedValue(new Error('flags down'));
    renderFlags();
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    await waitFor(() => expect(m.notify).toHaveBeenCalledWith('flags down', 'error'));
  });

  it('rejects an invalid file before asking anything', async () => {
    renderFlags();
    pickFile('JSON file', '{"flags":[]}');
    await waitFor(() =>
      expect(m.notify).toHaveBeenCalledWith('That file has no flags in it.', 'error'),
    );
    expect(m.confirm).not.toHaveBeenCalled();
  });

  it('imports after confirmation and refreshes the table', async () => {
    m.confirm.mockResolvedValue(true);
    m.mutate.mockResolvedValue({
      data: { importFeatureFlags: { created: ['alpha'], updated: [], skipped: ['beta'] } },
    });
    const onImported = renderFlags();
    pickFile('JSON file', file);
    await waitFor(() => expect(onImported).toHaveBeenCalled());
    expect(m.confirm.mock.calls[0][0]).toMatchObject({ title: 'Import 2 flags', destructive: true });
    expect(m.mutate.mock.calls[0][0].variables.flags).toHaveLength(2);
    expect(m.notify).toHaveBeenCalledWith('Imported — 1 added, 0 updated, 1 skipped', 'success');
  });

  it('defaults the counts when the server returns no result', async () => {
    m.confirm.mockResolvedValue(true);
    m.mutate.mockResolvedValue({ data: undefined });
    renderFlags();
    pickFile('JSON file', file);
    await waitFor(() =>
      expect(m.notify).toHaveBeenCalledWith('Imported — 0 added, 0 updated', 'success'),
    );
  });

  it('does not import when declined', async () => {
    m.confirm.mockResolvedValue(false);
    renderFlags();
    pickFile('JSON file', file);
    await waitFor(() => expect(m.confirm).toHaveBeenCalled());
    expect(m.mutate).not.toHaveBeenCalled();
  });

  it('reports an import failure without refreshing', async () => {
    m.confirm.mockResolvedValue(true);
    m.mutate.mockRejectedValue(new Error('flags rejected'));
    const onImported = renderFlags();
    pickFile('JSON file', file);
    await waitFor(() => expect(m.notify).toHaveBeenCalledWith('flags rejected', 'error'));
    expect(onImported).not.toHaveBeenCalled();
  });

  it('ignores a cancelled picker, opens the picker and shows import progress', () => {
    m.loading = true;
    renderFlags();
    const input = screen.getByLabelText('JSON file', { exact: false }) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [] } });
    expect(m.confirm).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Importing…' })).toBeDisabled();
  });

  it('clicking Import opens the file picker', () => {
    renderFlags();
    const input = screen.getByLabelText('JSON file', { exact: false }) as HTMLInputElement;
    const click = vi.spyOn(input, 'click');
    fireEvent.click(screen.getByRole('button', { name: 'Import' }));
    expect(click).toHaveBeenCalled();
  });
});
