import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import {
  buildTemplateSchema,
  MAX_TIE_BREAKERS,
  MAX_TOOL_INSTANCES,
  TEMPLATE_NAME_MAX,
  TemplateForm,
  TOTAL_KEY,
  type TemplateFormValues,
} from '../../src/components/template-form';
import { makePreset, makeTool } from '../mocks';

vi.mock('@duncit/category', () => ({
  AdminCategorySelect: ({
    value,
    onChange,
    disabled,
  }: {
    value: { super_id: string; category_id: string; sub_id: string };
    onChange: (v: Record<string, string>) => void;
    disabled?: boolean;
  }) => (
    <div>
      <span data-testid="scope">{`${value.super_id}|${value.category_id}|${value.sub_id}`}</span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange({ super_id: 's1', super_name: '', category_id: 'c1', category_name: '', sub_id: 'u1', sub_name: '' })}
      >
        pick-scope
      </button>
    </div>
  ),
}));

const pointsField = JSON.stringify([{ key: 'points', kind: 'number', default: 10, min: 1, max: 100 }]);
const counter = makeTool({
  id: 'tool-1',
  tool_type: 'SCORE_COUNTER',
  name: 'Score Counter',
  produces_score: true,
  config_schema_json: pointsField,
  default_config_json: '{"points":15}',
});
const timer = makeTool({
  id: 'tool-2',
  tool_type: 'STOPWATCH',
  name: 'Stopwatch',
  produces_score: false,
  config_schema_json: '[]',
});
const retired = makeTool({ id: 'tool-3', name: 'Retired', status: 'INACTIVE' });
const soon = makeTool({ id: 'tool-4', name: 'Soon', engine_ready: false });
const tools = [counter, timer, retired, soon];
const presets = [
  makePreset({ id: 'pre-1', tool_id: 'tool-1', name: 'Marathon', config_json: '{"points":50}' }),
  makePreset({ id: 'pre-2', tool_id: 'tool-1', name: 'Hidden', is_active: false }),
  makePreset({ id: 'pre-3', tool_id: 'tool-2', name: 'Other tool' }),
];

const instance = (over: Partial<TemplateFormValues['tool_instances'][number]> = {}) => ({
  instance_id: 'i1',
  tool_id: 'tool-1',
  tool_type: 'SCORE_COUNTER',
  preset_id: '',
  label: 'Counter',
  config: { points: 10 },
  ...over,
});

const baseValues = (over: Partial<TemplateFormValues> = {}): TemplateFormValues => ({
  name: 'Sprint template',
  description: '',
  super_id: '',
  category_id: '',
  sub_id: '',
  participant_mode: 'INDIVIDUAL',
  tool_instances: [instance()],
  winner_rules: { rank_by: TOTAL_KEY, direction: 'DESC', tie_breakers: [], podium_size: 3 },
  ...over,
});

/** Tool instances render in collapsed accordions; open them all so their fields are reachable. */
const expandAll = () => {
  document.querySelectorAll('.MuiAccordionSummary-root[aria-expanded="false"]').forEach((el) => fireEvent.click(el));
};

const renderForm = (values = baseValues(), extra: { saving?: boolean; tools?: typeof tools } = {}) => {
  const onSubmit = vi.fn();
  const onCancel = vi.fn();
  render(
    <TemplateForm values={values} tools={extra.tools ?? tools} presets={presets} saving={extra.saving ?? false} onSubmit={onSubmit} onCancel={onCancel} />,
  );
  expandAll();
  return { onSubmit, onCancel };
};

const chooseOption = (combobox: HTMLElement, name: string) => {
  fireEvent.mouseDown(combobox);
  fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name }));
};

/** Makes the form dirty (Save is disabled while pristine) with a harmless edit. */
const touch = () => fireEvent.change(screen.getByLabelText(/Challenge name/), { target: { value: 'Edited template' } });

describe('buildTemplateSchema', () => {
  const schema = buildTemplateSchema(
    (k) => k,
    (id) => (id === 'tool-1' ? [{ key: 'points', kind: 'number', default: 10, min: 1, max: 100 }] : []),
    (id) => id === 'tool-1',
  );

  it('accepts a complete template', () => {
    expect(schema.safeParse(baseValues()).success).toBe(true);
  });

  it('bounds the name, instance count and podium size', () => {
    expect(schema.safeParse(baseValues({ name: ' ' })).error?.issues[0].message).toBe('challenge.templates.errors.name');
    expect(schema.safeParse(baseValues({ name: 'x'.repeat(TEMPLATE_NAME_MAX + 1) })).success).toBe(false);
    const many = Array.from({ length: MAX_TOOL_INSTANCES + 1 }, (_, i) => instance({ instance_id: `i${i}` }));
    expect(schema.safeParse(baseValues({ tool_instances: many })).error?.issues[0].message).toBe(
      'challenge.templates.errors.tooMany',
    );
    const rules = baseValues().winner_rules;
    expect(schema.safeParse(baseValues({ winner_rules: { ...rules, podium_size: 0 } })).success).toBe(false);
    expect(schema.safeParse(baseValues({ winner_rules: { ...rules, podium_size: 11 } })).success).toBe(false);
    expect(schema.safeParse(baseValues({ winner_rules: { ...rules, podium_size: 10 } })).success).toBe(true);
  });

  it('caps tie-breakers', () => {
    const rules = baseValues().winner_rules;
    const breakers = Array.from({ length: MAX_TIE_BREAKERS + 1 }, () => ({ rank_by: TOTAL_KEY, direction: 'ASC' as const }));
    expect(schema.safeParse(baseValues({ winner_rules: { ...rules, tie_breakers: breakers } })).success).toBe(false);
  });

  it('requires an instance label', () => {
    const result = schema.safeParse(baseValues({ tool_instances: [instance({ label: '  ' })] }));
    expect(result.error?.issues[0]).toMatchObject({
      path: ['tool_instances', 0, 'label'],
      message: 'challenge.templates.errors.label',
    });
  });

  it('flags the instance whose settings the tool would refuse', () => {
    const result = schema.safeParse(baseValues({ tool_instances: [instance(), instance({ instance_id: 'i2', config: { points: 0 } })] }));
    expect(result.error?.issues[0]).toMatchObject({ path: ['tool_instances', 1, 'config'], message: 'challenge.tools.errors.config' });
  });

  it('only lets the primary key and tie-breakers rank by TOTAL or a scoring instance', () => {
    const rules = baseValues().winner_rules;
    expect(schema.safeParse(baseValues({ winner_rules: { ...rules, rank_by: 'i1' } })).success).toBe(true);
    const missing = schema.safeParse(baseValues({ winner_rules: { ...rules, rank_by: 'ghost' } }));
    expect(missing.error?.issues[0]).toMatchObject({ path: ['winner_rules', 'rank_by'], message: 'challenge.templates.errors.rankBy' });
    const tie = schema.safeParse(
      baseValues({ winner_rules: { ...rules, tie_breakers: [{ rank_by: 'ghost', direction: 'ASC' }] } }),
    );
    expect(tie.error?.issues[0].message).toBe('challenge.templates.errors.rankBy');
    // A non-scoring tool instance is not a valid rank key.
    const timerOnly = schema.safeParse(
      baseValues({
        tool_instances: [instance({ instance_id: 't1', tool_id: 'tool-2', tool_type: 'STOPWATCH', config: {} })],
        winner_rules: { ...rules, rank_by: 't1' },
      }),
    );
    expect(timerOnly.error?.issues[0].message).toBe('challenge.templates.errors.rankBy');
  });
});

describe('TemplateForm', () => {
  it('shows the template, its tool instance and the scope', () => {
    renderForm(baseValues({ name: 'Sprint template', super_id: 'sup', category_id: 'cat', sub_id: 'sub' }));
    expect(screen.getByLabelText(/Challenge name/)).toHaveValue('Sprint template');
    expect(screen.getByTestId('scope')).toHaveTextContent('sup|cat|sub');
    expect(screen.getByText('Score Counter')).toBeInTheDocument();
    expect(screen.getByLabelText('Label shown to players')).toHaveValue('Counter');
    expect(screen.getByRole('spinbutton', { name: /points/i })).toHaveValue(10);
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('falls back to the tool type for an instance whose tool no longer exists', () => {
    renderForm(baseValues({ tool_instances: [instance({ tool_id: 'gone', tool_type: 'LEGACY_TOOL' })] }));
    expect(screen.getByText('LEGACY_TOOL')).toBeInTheDocument();
  });

  it('updates the scope from the category picker', () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: 'pick-scope' }));
    expect(screen.getByTestId('scope')).toHaveTextContent('s1|c1|u1');
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('offers only active, engine-ready tools to add and seeds the new instance from its defaults', () => {
    renderForm();
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Add a tool' }));
    expect(within(screen.getByRole('listbox')).getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Score Counter',
      'Stopwatch',
    ]);
    fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: 'Score Counter' }));
    expandAll();
    const labels = screen.getAllByLabelText('Label shown to players');
    expect(labels).toHaveLength(2);
    expect(labels[1]).toHaveValue('Score Counter');
    expect(screen.getAllByRole('spinbutton', { name: /points/i })[1]).toHaveValue(15);
  });

  it('removes an instance', () => {
    renderForm(baseValues({ tool_instances: [instance(), instance({ instance_id: 'i2', label: 'Second' })] }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Remove tool' })[0]);
    expect(screen.getAllByLabelText('Label shown to players')).toHaveLength(1);
    expect(screen.getByLabelText('Label shown to players')).toHaveValue('Second');
  });

  it('stops adding at the instance limit', () => {
    const many = Array.from({ length: MAX_TOOL_INSTANCES }, (_, i) => instance({ instance_id: `i${i}`, label: `L${i}` }));
    renderForm(baseValues({ tool_instances: many }));
    expect(screen.getByRole('combobox', { name: 'Add a tool' })).toHaveAttribute('aria-disabled', 'true');
  });

  it('offers only that tool’s active presets and applies the preset config', () => {
    renderForm();
    const preset = screen.getByRole('combobox', { name: 'Preset' });
    fireEvent.mouseDown(preset);
    expect(within(screen.getByRole('listbox')).getAllByRole('option').map((o) => o.textContent)).toEqual([
      'No preset (tool defaults)',
      'Marathon',
    ]);
    fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: 'Marathon' }));
    expect(screen.getByRole('spinbutton', { name: /points/i })).toHaveValue(50);
    chooseOption(screen.getByRole('combobox', { name: 'Preset' }), 'No preset (tool defaults)');
    expect(screen.getByRole('spinbutton', { name: /points/i })).toHaveValue(15);
  });

  it('switches participant mode to teams', async () => {
    const { onSubmit } = renderForm();
    chooseOption(screen.getByRole('combobox', { name: 'Who competes' }), 'Teams');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ participant_mode: 'TEAM' });
  });

  it('submits the edited template', async () => {
    const { onSubmit } = renderForm();
    touch();
    fireEvent.change(screen.getByRole('spinbutton', { name: /points/i }), { target: { value: '33' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      name: 'Edited template',
      tool_instances: [{ instance_id: 'i1', tool_id: 'tool-1', label: 'Counter', config: { points: 33 } }],
    });
  });

  it('blocks a nameless template and shows the message', async () => {
    const { onSubmit } = renderForm();
    fireEvent.change(screen.getByLabelText(/Challenge name/), { target: { value: '  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Enter a name of up to 120 characters.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('blocks a blank tool label', async () => {
    const { onSubmit } = renderForm();
    fireEvent.change(screen.getByLabelText('Label shown to players'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Give this tool a label.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows the field message for an out-of-range setting and does not submit', async () => {
    const { onSubmit } = renderForm();
    fireEvent.change(screen.getByRole('spinbutton', { name: /points/i }), { target: { value: '500' } });
    expect(await screen.findByText(/100/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.getByRole('spinbutton', { name: /points/i })).toBeInvalid());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('lists TOTAL plus scoring instances as rank keys, labelled by the instance label or tool name', () => {
    renderForm(
      baseValues({
        tool_instances: [
          instance({ instance_id: 'a', label: 'Round one' }),
          instance({ instance_id: 'b', label: '' }),
          instance({ instance_id: 'c', tool_id: 'tool-2', tool_type: 'STOPWATCH', label: 'Timer', config: {} }),
        ],
      }),
    );
    fireEvent.mouseDown(screen.getAllByRole('combobox', { name: 'Rank by' })[0]);
    expect(within(screen.getByRole('listbox')).getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Total score',
      'Round one',
      'Score Counter',
    ]);
  });

  it('names a rank key by its instance id when both the label and the tool name are empty', () => {
    const nameless = makeTool({ id: 'tool-5', name: '', produces_score: true, config_schema_json: '[]' });
    renderForm(
      baseValues({ tool_instances: [instance({ instance_id: 'inst-77', tool_id: 'tool-5', label: '', config: {} })] }),
      { tools: [nameless] },
    );
    fireEvent.mouseDown(screen.getAllByRole('combobox', { name: 'Rank by' })[0]);
    expect(within(screen.getByRole('listbox')).getAllByRole('option').map((o) => o.textContent)).toEqual(['Total score', 'inst-77']);
  });

  it('shows the rank-by error when the ranked tool is removed', async () => {
    const { onSubmit } = renderForm(baseValues({ winner_rules: { rank_by: 'i1', direction: 'DESC', tie_breakers: [], podium_size: 3 } }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove tool' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Rank by the total or by a scoring tool that is still in this template.');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('adds and removes tie-breakers up to the limit and sets the podium and order', async () => {
    const { onSubmit } = renderForm();
    const add = screen.getByRole('button', { name: 'Add tie-breaker' });
    for (let i = 0; i < MAX_TIE_BREAKERS; i += 1) fireEvent.click(add);
    expect(add).toBeDisabled();
    expect(screen.getAllByRole('button', { name: 'Remove tie-breaker' })).toHaveLength(MAX_TIE_BREAKERS);
    fireEvent.click(screen.getAllByRole('button', { name: 'Remove tie-breaker' })[0]);
    expect(screen.getAllByRole('button', { name: 'Remove tie-breaker' })).toHaveLength(MAX_TIE_BREAKERS - 1);
    expect(add).toBeEnabled();
    chooseOption(screen.getAllByRole('combobox', { name: 'Order' })[0], 'Lowest wins');
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Podium places' }), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0].winner_rules).toMatchObject({
      direction: 'ASC',
      podium_size: 5,
      tie_breakers: [
        { rank_by: TOTAL_KEY, direction: 'DESC' },
        { rank_by: TOTAL_KEY, direction: 'DESC' },
      ],
    });
  });

  it('disables every control while saving and cancels from the footer', () => {
    const { onCancel } = renderForm(baseValues(), { saving: true });
    expect(screen.getByLabelText(/Challenge name/)).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Remove tool' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Add tie-breaker' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'pick-scope' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('calls onCancel', () => {
    const { onCancel } = renderForm();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
