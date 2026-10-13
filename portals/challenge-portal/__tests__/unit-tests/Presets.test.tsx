import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import PresetsPage from '../../src/pages/presets/PresetsPage';
import PresetsTable from '../../src/pages/presets/PresetsTable';
import { buildPresetSchema } from '../../src/components/preset-form';
import { makePreset, makeTool } from '../mocks';

const m = vi.hoisted(() => ({
  queries: {} as Record<string, { data?: unknown; loading?: boolean; error?: Error; refetch?: ReturnType<typeof vi.fn> }>,
  mutations: {} as Record<string, ReturnType<typeof vi.fn>>,
  mutationStates: {} as Record<string, { loading?: boolean; error?: Error }>,
}));

vi.mock('@duncit/table', () => import('./table-mock'));
vi.mock('@apollo/client/react', async (io) => ({
  ...(await io<typeof import('@apollo/client/react')>()),
  useQuery: (doc: { definitions: { name: { value: string } }[] }) => {
    const state = m.queries[doc.definitions[0].name.value] ?? {};
    return { data: undefined, loading: false, error: undefined, refetch: vi.fn().mockResolvedValue({}), ...state };
  },
  useMutation: (doc: { definitions: { name: { value: string } }[] }) => {
    const name = doc.definitions[0].name.value;
    return [m.mutations[name], m.mutationStates[name] ?? {}];
  },
}));

const numberField = JSON.stringify([{ key: 'points', kind: 'number', default: 10, min: 1, max: 100 }]);
const scoreTool = makeTool({ id: 'tool-1', name: 'Score Counter', config_schema_json: numberField, default_config_json: '{"points":25}' });
const comingSoon = makeTool({ id: 'tool-2', name: 'Photo Judge', engine_ready: false });
const inactive = makeTool({ id: 'tool-3', name: 'Retired Tool', status: 'INACTIVE' });

let presetsRefetch: ReturnType<typeof vi.fn>;

const setData = (presets = [makePreset()], tools = [scoreTool, comingSoon, inactive]) => {
  presetsRefetch = vi.fn().mockResolvedValue({});
  m.queries = {
    ChallengeToolPresets: { data: { challengeToolPresets: presets }, refetch: presetsRefetch },
    ChallengeTools: { data: { challengeTools: tools } },
  };
};

beforeEach(() => {
  m.mutations = {
    CreateChallengeToolPreset: vi.fn().mockResolvedValue({}),
    UpdateChallengeToolPreset: vi.fn().mockResolvedValue({}),
    DuplicateChallengeToolPreset: vi.fn().mockResolvedValue({}),
  };
  m.mutationStates = {};
  setData();
});

const pickOption = (combobox: HTMLElement, name: string) => {
  fireEvent.mouseDown(combobox);
  fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name }));
};

describe('PresetsTable', () => {
  const tools = [scoreTool];

  it('resolves the tool name per row, or a dash when the tool is unknown', async () => {
    const onEdit = vi.fn();
    render(
      <PresetsTable
        rows={[makePreset(), makePreset({ id: 'p2', name: 'Orphan', tool_id: 'gone' })]}
        tools={tools}
        onEdit={onEdit}
        onDuplicate={vi.fn()}
        toolbarActions={<button type="button">toolbar-extra</button>}
      />,
    );
    const edits = await screen.findAllByRole('button', { name: 'Edit preset' });
    expect(edits).toHaveLength(2);
    fireEvent.click(edits[0]);
    fireEvent.click(edits[1]);
    expect(onEdit.mock.calls.map(([row]) => row.tool_name)).toEqual(['Score Counter', '—']);
    expect(screen.getByText('toolbar-extra')).toBeInTheDocument();
  });

  it('wires edit and duplicate to the row', async () => {
    const onEdit = vi.fn();
    const onDuplicate = vi.fn();
    const preset = makePreset();
    render(<PresetsTable rows={[preset]} tools={tools} onEdit={onEdit} onDuplicate={onDuplicate} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Edit preset' }));
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 'preset-1', tool_name: 'Score Counter' }));
    fireEvent.click(screen.getByRole('button', { name: 'Duplicate preset' }));
    expect(onDuplicate).toHaveBeenCalledWith(expect.objectContaining({ id: 'preset-1' }));
  });

  it('shows the empty text with no presets', async () => {
    render(<PresetsTable rows={[]} tools={tools} onEdit={vi.fn()} onDuplicate={vi.fn()} />);
    expect(await screen.findByText(/No presets yet/)).toBeInTheDocument();
  });
});

describe('buildPresetSchema', () => {
  const schema = buildPresetSchema(
    (key) => key,
    (toolId) => (toolId === 'tool-1' ? [{ key: 'points', kind: 'number', default: 10, min: 1, max: 100 }] : []),
  );
  const base = { tool_id: 'tool-1', name: 'Quick', active: true, config: { points: 5 } };

  it('accepts a complete preset', () => {
    expect(schema.safeParse(base).success).toBe(true);
  });

  it('requires a tool and a trimmed name of at most 80 characters', () => {
    expect(schema.safeParse({ ...base, tool_id: '' }).error?.issues[0].message).toBe('challenge.presets.errors.tool');
    expect(schema.safeParse({ ...base, name: '   ' }).error?.issues[0].message).toBe('challenge.presets.errors.name');
    expect(schema.safeParse({ ...base, name: 'x'.repeat(81) }).success).toBe(false);
    expect(schema.safeParse({ ...base, name: 'x'.repeat(80) }).success).toBe(true);
  });

  it('rejects a config the tool would refuse, on the config path', () => {
    const result = schema.safeParse({ ...base, config: { points: 500 } });
    expect(result.error?.issues[0]).toMatchObject({ path: ['config'], message: 'challenge.tools.errors.config' });
  });

  it('skips the config check until a tool is chosen', () => {
    const result = schema.safeParse({ ...base, tool_id: '', config: { points: 500 } });
    expect(result.error?.issues.map((i) => i.path[0])).toEqual(['tool_id']);
  });
});

describe('PresetsPage', () => {
  it('shows a progress bar while the first load runs', () => {
    m.queries.ChallengeToolPresets = { loading: true };
    render(<PresetsPage />);
    expect(screen.getByRole('progressbar', { name: 'Loading presets…' })).toBeInTheDocument();
    expect(screen.queryByTestId('duncit-table')).not.toBeInTheDocument();
  });

  it('shows the load error', () => {
    m.queries.ChallengeToolPresets = { error: new Error('down') };
    render(<PresetsPage />);
    expect(screen.getByText('Presets could not be loaded. Refresh to try again.')).toBeInTheDocument();
  });

  it('shows the duplicate error message when duplicating failed', () => {
    m.mutationStates.DuplicateChallengeToolPreset = { error: new Error('Name already taken') };
    render(<PresetsPage />);
    expect(screen.getByText('Name already taken')).toBeInTheDocument();
  });

  it('creates a preset from a runnable tool, starting from the tool defaults', async () => {
    render(<PresetsPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'New preset' }));
    const dialog = await screen.findByRole('dialog', { name: 'New preset' });
    const combobox = within(dialog).getByRole('combobox', { name: /Tool/ });
    fireEvent.mouseDown(combobox);
    // Only active, engine-ready tools are offered for a new preset.
    expect(within(screen.getByRole('listbox')).getAllByRole('option').map((o) => o.textContent)).toEqual(['Score Counter']);
    fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: 'Score Counter' }));
    expect(within(dialog).getByRole('spinbutton')).toHaveValue(25);
    fireEvent.change(within(dialog).getByLabelText(/Preset name/), { target: { value: '  Sprint  ' } });
    fireEvent.change(within(dialog).getByRole('spinbutton'), { target: { value: '40' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(m.mutations.CreateChallengeToolPreset).toHaveBeenCalled());
    expect(m.mutations.CreateChallengeToolPreset).toHaveBeenCalledWith({
      variables: { input: { tool_id: 'tool-1', name: 'Sprint', config_json: '{"points":40}' } },
    });
    await waitFor(() => expect(presetsRefetch).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('does not submit without a name and shows the validation message', async () => {
    render(<PresetsPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'New preset' }));
    const dialog = await screen.findByRole('dialog');
    pickOption(within(dialog).getByRole('combobox', { name: /Tool/ }), 'Score Counter');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(await within(dialog).findByText('Enter a name of up to 80 characters.')).toBeInTheDocument();
    expect(m.mutations.CreateChallengeToolPreset).not.toHaveBeenCalled();
  });

  it('edits an existing preset with its saved config, keeping the tool locked', async () => {
    setData([makePreset({ config_json: '{"points":60}', name: 'Quick round' })]);
    render(<PresetsPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Edit preset' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit preset' });
    expect(within(dialog).getByRole('combobox', { name: /Tool/ })).toHaveAttribute('aria-disabled', 'true');
    expect(within(dialog).getByLabelText(/Preset name/)).toHaveValue('Quick round');
    expect(within(dialog).getByRole('spinbutton')).toHaveValue(60);
    fireEvent.click(within(dialog).getByRole('switch', { name: 'Active' }));
    fireEvent.change(within(dialog).getByLabelText(/Preset name/), { target: { value: 'Renamed' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(m.mutations.UpdateChallengeToolPreset).toHaveBeenCalled());
    expect(m.mutations.UpdateChallengeToolPreset).toHaveBeenCalledWith({
      variables: { id: 'preset-1', input: { name: 'Renamed', config_json: '{"points":60}', is_active: false } },
    });
    expect(m.mutations.CreateChallengeToolPreset).not.toHaveBeenCalled();
  });

  it('edits a preset whose tool is no longer listed, with no settings to show', async () => {
    setData([makePreset({ tool_id: 'gone', config_json: 'not json' })], [scoreTool]);
    render(<PresetsPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Edit preset' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit preset' });
    expect(within(dialog).queryByText('Settings')).not.toBeInTheDocument();
    expect(within(dialog).getByLabelText(/Preset name/)).toHaveValue('Quick round');
  });

  it('shows the save error inside the dialog', async () => {
    m.mutationStates.CreateChallengeToolPreset = { error: new Error('Duplicate preset name') };
    render(<PresetsPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'New preset' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Duplicate preset name')).toBeInTheDocument();
  });

  it('disables the form while saving', async () => {
    m.mutationStates.UpdateChallengeToolPreset = { loading: true };
    render(<PresetsPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Edit preset' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('button', { name: 'Saving…' })).toBeDisabled();
    expect(within(dialog).getByLabelText(/Preset name/)).toBeDisabled();
  });

  it('asks for a tool when only a name was entered', async () => {
    render(<PresetsPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'New preset' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/Preset name/), { target: { value: 'Orphan preset' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(await within(dialog).findByText('Choose the tool this preset configures.')).toBeInTheDocument();
    expect(m.mutations.CreateChallengeToolPreset).not.toHaveBeenCalled();
  });

  it('closes the dialog on Escape', async () => {
    render(<PresetsPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'New preset' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('offers no tools to a new preset while the tool list is still loading', async () => {
    m.queries.ChallengeTools = { loading: true };
    render(<PresetsPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'New preset' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.mouseDown(within(dialog).getByRole('combobox', { name: /Tool/ }));
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });

  it('cancels out of the dialog', async () => {
    render(<PresetsPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'New preset' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('duplicates a preset and refreshes the list', async () => {
    render(<PresetsPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Duplicate preset' }));
    await waitFor(() => expect(m.mutations.DuplicateChallengeToolPreset).toHaveBeenCalledWith({ variables: { id: 'preset-1' } }));
    await waitFor(() => expect(presetsRefetch).toHaveBeenCalled());
  });
});
