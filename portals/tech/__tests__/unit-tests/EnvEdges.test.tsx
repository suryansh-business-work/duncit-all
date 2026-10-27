import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { makeEnvCategoryDef, makeEnvEntry, makeEnvFieldDef } from '../mocks/env-entry.mock';
import ConfigField from '../../src/pages/environment/env-entry/ConfigField';
import EnvEntriesTable from '../../src/pages/environment/EnvEntriesTable';
import EnvEntryForm from '../../src/pages/environment/env-entry/env-entry.form';
import { parseEnvImport } from '../../src/pages/environment/env-io';

describe('EnvEntriesTable / history action', () => {
  const fetchRows = async () => ({ rows: [makeEnvEntry({ id: 'a', name: 'Default A' })], total: 1 });
  const handlers = { onEdit: vi.fn(), onDelete: vi.fn(), onSetDefault: vi.fn(), onTest: vi.fn() };

  it('offers a history button only when the page can show a history', async () => {
    const { unmount } = render(<EnvEntriesTable fetchRows={fetchRows} refetchRef={{ current: null }} {...handlers} />);
    await screen.findByText('Default A');
    expect(screen.queryByTestId('env-entry-history')).not.toBeInTheDocument();
    unmount();

    const onHistory = vi.fn();
    render(<EnvEntriesTable fetchRows={fetchRows} refetchRef={{ current: null }} {...handlers} onHistory={onHistory} />);
    fireEvent.click(await screen.findByTestId('env-entry-history'));
    expect(onHistory).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }));
  });
});

describe('EnvEntryForm / provider API link', () => {
  it('links to the provider API documentation when the category has one, and not otherwise', () => {
    const { unmount } = render(
      <EnvEntryForm
        open
        def={makeEnvCategoryDef({ apiDocsUrl: 'https://api.example.test/docs' })}
        initial={null}
        onSubmit={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByRole('link', { name: /API documentation/ })).toHaveAttribute('href', 'https://api.example.test/docs');
    unmount();

    render(<EnvEntryForm open def={makeEnvCategoryDef()} initial={null} onSubmit={vi.fn()} onClose={vi.fn()} />);
    expect(screen.queryByRole('link', { name: /API documentation/ })).not.toBeInTheDocument();
  });
});

describe('ConfigField / a boolean with no hint', () => {
  it('draws the switch alone, with nothing for it to be described by', () => {
    const field = makeEnvFieldDef({ name: 'sandbox', label: 'Sandbox mode', bool: true });
    render(<ConfigField field={field} value="true" helperText="" onChange={vi.fn()} onBlur={vi.fn()} onToggleBool={vi.fn()} />);

    const toggle = screen.getByRole('switch', { name: 'Sandbox mode' });
    expect(toggle).not.toHaveAttribute('aria-describedby');
    expect(document.getElementById('config-sandbox-hint')).toBeNull();
  });
});

describe('env import / description', () => {
  it('keeps a description that is text', () => {
    const result = parseEnvImport(JSON.stringify({ entries: [{ name: 'n', category: 'EMAIL', description: 'Primary mailer' }] }));
    if (!('entries' in result)) throw new Error('expected entries');
    expect(result.entries[0].description).toBe('Primary mailer');
  });
});
