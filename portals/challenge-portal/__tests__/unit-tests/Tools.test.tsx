import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import ToolsPage from '../../src/pages/tools/ToolsPage';
import ToolsTable from '../../src/pages/tools/ToolsTable';
import { buildToolSchema, TOOL_DESCRIPTION_MAX, TOOL_NAME_MAX } from '../../src/components/tool-form';
import { categoryPathOptions, useCategoryPaths } from '../../src/lib/categoryPaths';
import { makeTool } from '../mocks';

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

const nodes = [
  { id: 'sup1', name: 'Sports', level: 'SUPER', parent_id: null },
  { id: 'cat1', name: 'Cricket', level: 'CATEGORY', parent_id: 'sup1' },
  { id: 'sub1', name: 'Box cricket', level: 'SUB', parent_id: 'cat1' },
  { id: 'sub2', name: 'Tennis ball', level: 'SUB', parent_id: 'cat1' },
];

const pointsField = JSON.stringify([{ key: 'points', kind: 'number', default: 10, min: 1, max: 100 }]);
const counter = makeTool({
  id: 'tool-1',
  name: 'Score Counter',
  description: 'Counts points.',
  config_schema_json: pointsField,
  default_config_json: '{"points":20}',
  mapped_category_ids: ['sub1'],
});

let toolsRefetch: ReturnType<typeof vi.fn>;

const setData = (tools = [counter]) => {
  toolsRefetch = vi.fn().mockResolvedValue({});
  m.queries = {
    ChallengeTools: { data: { challengeTools: tools }, refetch: toolsRefetch },
    CategoryTreeNodes: { data: { categories: nodes } },
  };
};

beforeEach(() => {
  m.mutations = {
    UpdateChallengeTool: vi.fn().mockResolvedValue({}),
    SetChallengeToolCategories: vi.fn().mockResolvedValue({}),
  };
  m.mutationStates = {};
  setData();
});

describe('categoryPathOptions', () => {
  it('builds sorted breadcrumb labels for every level', () => {
    expect(categoryPathOptions(nodes)).toEqual([
      { id: 'sup1', label: 'Sports', level: 'SUPER' },
      { id: 'cat1', label: 'Sports › Cricket', level: 'CATEGORY' },
      { id: 'sub1', label: 'Sports › Cricket › Box cricket', level: 'SUB' },
      { id: 'sub2', label: 'Sports › Cricket › Tennis ball', level: 'SUB' },
    ]);
  });

  it('shows a node with a missing parent on its own', () => {
    expect(categoryPathOptions([{ id: 'x', name: 'Orphan', level: 'SUB', parent_id: 'missing' }])).toEqual([
      { id: 'x', label: 'Orphan', level: 'SUB' },
    ]);
  });

  it('stops at three levels so a cyclic tree cannot loop forever', () => {
    const cyclic = [
      { id: 'a', name: 'A', level: 'SUPER', parent_id: 'c' },
      { id: 'b', name: 'B', level: 'CATEGORY', parent_id: 'a' },
      { id: 'c', name: 'C', level: 'SUB', parent_id: 'b' },
    ];
    const labels = categoryPathOptions(cyclic).map((o) => o.label);
    expect(labels).toEqual(['A › B › C', 'B › C › A', 'C › A › B']);
  });
});

describe('useCategoryPaths', () => {
  it('exposes options and a label lookup from the tree', () => {
    const { result } = renderHook(() => useCategoryPaths());
    expect(result.current.options).toHaveLength(4);
    expect(result.current.labelOf.get('sub1')).toBe('Sports › Cricket › Box cricket');
    expect(result.current.loading).toBe(false);
  });

  it('is empty while the tree has not loaded', () => {
    m.queries.CategoryTreeNodes = { loading: true };
    const { result } = renderHook(() => useCategoryPaths());
    expect(result.current.options).toEqual([]);
    expect(result.current.labelOf.size).toBe(0);
    expect(result.current.loading).toBe(true);
  });
});

describe('ToolsTable', () => {
  it('opens the editor for a row and shows each tool row', async () => {
    const onEdit = vi.fn();
    render(
      <ToolsTable
        rows={[counter, makeTool({ id: 'tool-2', name: 'Photo Judge', engine_ready: false, status: 'INACTIVE' })]}
        onEdit={onEdit}
      />,
    );
    const rows = await screen.findAllByTestId('table-row');
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText('Score Counter')).toBeInTheDocument();
    expect(within(rows[0]).getByText('Counts points.')).toBeInTheDocument();
    // Status comes from the tool's status, not an is_active flag.
    expect(within(rows[0]).getByTestId('cell-is_active')).toHaveTextContent(/^ActiveActive$/);
    expect(within(rows[1]).getByTestId('cell-is_active')).toHaveTextContent(/^InactiveInactive$/);
    expect(within(rows[0]).getByText('Available')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Coming soon')).toBeInTheDocument();
    expect(within(rows[0]).getByTestId('cell-mapped_category_ids')).toHaveTextContent('1');
    expect(within(rows[1]).getByTestId('cell-mapped_category_ids')).toHaveTextContent('0');
    fireEvent.click(screen.getAllByRole('button', { name: 'Configure tool' })[1]);
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 'tool-2' }));
  });

  it('shows the empty text with no tools', async () => {
    render(<ToolsTable rows={[]} onEdit={vi.fn()} />);
    expect(await screen.findByText('No tools found.')).toBeInTheDocument();
  });
});

describe('buildToolSchema', () => {
  const schema = buildToolSchema((k) => k, [{ key: 'points', kind: 'number', default: 10, min: 1, max: 100 }]);
  const base = { name: 'Counter', description: 'ok', active: true, config: { points: 5 }, category_ids: [] };

  it('accepts a valid tool', () => {
    expect(schema.safeParse(base).success).toBe(true);
  });

  it('bounds the name and description lengths', () => {
    expect(schema.safeParse({ ...base, name: ' ' }).error?.issues[0].message).toBe('challenge.tools.errors.name');
    expect(schema.safeParse({ ...base, name: 'x'.repeat(TOOL_NAME_MAX + 1) }).success).toBe(false);
    expect(schema.safeParse({ ...base, name: 'x'.repeat(TOOL_NAME_MAX) }).success).toBe(true);
    expect(schema.safeParse({ ...base, description: 'x'.repeat(TOOL_DESCRIPTION_MAX + 1) }).error?.issues[0].message).toBe(
      'challenge.tools.errors.description',
    );
    expect(schema.safeParse({ ...base, description: 'x'.repeat(TOOL_DESCRIPTION_MAX) }).success).toBe(true);
  });

  it('flags an out-of-range setting on the config path', () => {
    const result = schema.safeParse({ ...base, config: { points: 0 } });
    expect(result.error?.issues[0]).toMatchObject({ path: ['config'], message: 'challenge.tools.errors.config' });
  });
});

describe('ToolsPage', () => {
  it('shows a progress bar on the first load', () => {
    m.queries.ChallengeTools = { loading: true };
    render(<ToolsPage />);
    expect(screen.getByRole('progressbar', { name: 'Loading tools…' })).toBeInTheDocument();
  });

  it('shows the load error only when there is no data', () => {
    m.queries.ChallengeTools = { error: new Error('down') };
    render(<ToolsPage />);
    expect(screen.getByText('Tools could not be loaded. Refresh to try again.')).toBeInTheDocument();
  });

  it('keeps showing the table when a refresh errors but data is cached', async () => {
    m.queries.ChallengeTools = { data: { challengeTools: [counter] }, error: new Error('stale') };
    render(<ToolsPage />);
    expect(await screen.findByText('Score Counter')).toBeInTheDocument();
    expect(screen.queryByText('Tools could not be loaded. Refresh to try again.')).not.toBeInTheDocument();
  });

  it('configures a tool: updates it, maps new categories, refreshes and closes', async () => {
    render(<ToolsPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Configure tool' }));
    const dialog = await screen.findByRole('dialog', { name: 'Configure Score Counter' });
    expect(within(dialog).getByLabelText(/^Name/)).toHaveValue('Score Counter');
    expect(within(dialog).getByRole('spinbutton')).toHaveValue(20);
    // Existing mapping is shown as a chip; only sub-categories are offered.
    expect(within(dialog).getByText('Sports › Cricket › Box cricket')).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText(/^Name/), { target: { value: '  Score Counter 2  ' } });
    fireEvent.change(within(dialog).getByRole('spinbutton'), { target: { value: '30' } });
    fireEvent.click(within(dialog).getByRole('switch'));
    const categories = within(dialog).getByRole('combobox', { name: /Mapped sub-categories/ });
    fireEvent.mouseDown(categories);
    const options = within(screen.getByRole('listbox')).getAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual(['Sports › Cricket › Box cricket', 'Sports › Cricket › Tennis ball']);
    fireEvent.click(options[1]);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(m.mutations.UpdateChallengeTool).toHaveBeenCalled());
    expect(m.mutations.UpdateChallengeTool).toHaveBeenCalledWith({
      variables: {
        id: 'tool-1',
        input: { name: 'Score Counter 2', description: 'Counts points.', status: 'INACTIVE', default_config_json: '{"points":30}' },
      },
    });
    await waitFor(() =>
      expect(m.mutations.SetChallengeToolCategories).toHaveBeenCalledWith({
        variables: { toolId: 'tool-1', categoryIds: ['sub1', 'sub2'] },
      }),
    );
    await waitFor(() => expect(toolsRefetch).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('skips the category call when the mapping did not change', async () => {
    render(<ToolsPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Configure tool' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/^Name/), { target: { value: 'Renamed' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(m.mutations.UpdateChallengeTool).toHaveBeenCalled());
    await waitFor(() => expect(toolsRefetch).toHaveBeenCalled());
    expect(m.mutations.SetChallengeToolCategories).not.toHaveBeenCalled();
  });

  it('keeps a not-yet-ready tool read-only and sends no default config', async () => {
    setData([makeTool({ id: 'tool-9', name: 'Photo Judge', engine_ready: false, status: 'INACTIVE', config_schema_json: pointsField })]);
    render(<ToolsPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Configure tool' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/This tool is not available yet/)).toBeInTheDocument();
    expect(within(dialog).getByRole('switch')).toBeDisabled();
    expect(within(dialog).getByRole('spinbutton')).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText(/^Name/), { target: { value: 'Photo Judge v2' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(m.mutations.UpdateChallengeTool).toHaveBeenCalled());
    expect(m.mutations.UpdateChallengeTool).toHaveBeenCalledWith({
      variables: {
        id: 'tool-9',
        input: { name: 'Photo Judge v2', description: 'Counts points per participant.', status: 'INACTIVE', default_config_json: null },
      },
    });
  });

  it('renders a tool with no configurable settings without a defaults section', async () => {
    setData([makeTool({ config_schema_json: '[]' })]);
    render(<ToolsPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Configure tool' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).queryByText('Default settings')).not.toBeInTheDocument();
  });

  it('shows the save error from either mutation', async () => {
    m.mutationStates.SetChallengeToolCategories = { error: new Error('Category locked') };
    render(<ToolsPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Configure tool' }));
    expect(await within(await screen.findByRole('dialog')).findByText('Category locked')).toBeInTheDocument();
  });

  it('shows the update error and disables the form while saving', async () => {
    m.mutationStates.UpdateChallengeTool = { error: new Error('Version conflict'), loading: true };
    render(<ToolsPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Configure tool' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Version conflict')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Saving…' })).toBeDisabled();
  });

  it('rejects a blank name without calling the server', async () => {
    render(<ToolsPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Configure tool' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/^Name/), { target: { value: '   ' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(await within(dialog).findByText('Enter a name of up to 80 characters.')).toBeInTheDocument();
    expect(m.mutations.UpdateChallengeTool).not.toHaveBeenCalled();
  });

  it('rejects an over-long description with its message', async () => {
    render(<ToolsPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Configure tool' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/^Description/), { target: { value: 'x'.repeat(TOOL_DESCRIPTION_MAX + 1) } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(await within(dialog).findByText('Keep the description under 500 characters.')).toBeInTheDocument();
    expect(m.mutations.UpdateChallengeTool).not.toHaveBeenCalled();
  });

  it('closes on Cancel and on Escape', async () => {
    render(<ToolsPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Configure tool' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Configure tool' }));
    fireEvent.keyDown(await screen.findByRole('dialog'), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
