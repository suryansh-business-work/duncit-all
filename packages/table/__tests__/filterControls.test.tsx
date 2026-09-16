import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FilterControl } from '../src/toolbar/filterControls';
import { emptyDraft, type FilterDraft } from '../src/toolbar/filterState';
import type { DuncitColumn } from '../src/types';

// Deterministic stand-in for the MUI X DatePicker: it shows the bounds it was
// given and fires onChange with a real Date or with null, so the date control's
// wiring is asserted without driving the real picker's text parsing under jsdom.
vi.mock('@mui/x-date-pickers/DatePicker', () => ({
  DatePicker: ({
    label,
    minDate,
    maxDate,
    onChange,
  }: {
    label: string;
    minDate?: Date;
    maxDate?: Date;
    onChange: (v: Date | null) => void;
  }) => (
    <div
      data-testid={`picker ${label}`}
      data-min={minDate ? minDate.toISOString() : 'none'}
      data-max={maxDate ? maxDate.toISOString() : 'none'}
    >
      <button type="button" onClick={() => onChange(new Date('2026-09-01T00:00:00.000Z'))}>
        {`set ${label}`}
      </button>
      <button type="button" onClick={() => onChange(null)}>{`clear ${label}`}</button>
    </div>
  ),
}));

type Pod = Record<string, unknown>;

const title: DuncitColumn<Pod> = { field: 'pod_title', headerName: 'Title', type: 'text' };
const amount: DuncitColumn<Pod> = { field: 'pod_amount', headerName: 'Amount', type: 'number' };
const created: DuncitColumn<Pod> = { field: 'created_at', headerName: 'Created', type: 'date' };
const active: DuncitColumn<Pod> = { field: 'is_active', headerName: 'Active', type: 'boolean' };
const status: DuncitColumn<Pod> = {
  field: 'status',
  headerName: 'Status',
  type: 'enum',
  options: [
    { value: 'OPEN', label: 'Open' },
    { value: 'CLOSED', label: 'Closed' },
  ],
};

function renderControl(column: DuncitColumn<Pod>, patch: Partial<FilterDraft> = {}) {
  const onChange = vi.fn();
  const label = column.headerName ?? column.field;
  const draft = { ...emptyDraft(column), ...patch };
  render(<FilterControl<Pod> column={column} label={label} draft={draft} onChange={onChange} />);
  return onChange;
}

function openSelect(name: RegExp) {
  fireEvent.mouseDown(screen.getByRole('combobox', { name }));
  return within(screen.getByRole('listbox'));
}

const optionNames = (listbox: ReturnType<typeof within>) =>
  listbox.getAllByRole('option').map((option: HTMLElement) => option.textContent);

describe('FilterControl for a text column', () => {
  it('offers contains / equals / not equal, and emits the picked condition and the typed value', () => {
    const onChange = renderControl(title);
    fireEvent.change(screen.getByLabelText('Value'), { target: { value: 'Sunday badminton' } });
    expect(onChange).toHaveBeenCalledWith({ value: 'Sunday badminton' });

    const listbox = openSelect(/Condition/);
    expect(optionNames(listbox)).toEqual(['Contains', 'Equals', 'Does not equal']);
    fireEvent.click(listbox.getByRole('option', { name: 'Equals' }));
    expect(onChange).toHaveBeenCalledWith({ op: 'eq' });
  });
});

describe('FilterControl for a number column', () => {
  it('offers the numeric comparisons and a single value box outside a range', () => {
    const onChange = renderControl(amount);
    expect(screen.queryByLabelText('Amount max')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Value'), { target: { value: '500' } });
    expect(onChange).toHaveBeenCalledWith({ value: '500' });

    const listbox = openSelect(/Condition/);
    expect(optionNames(listbox)).toEqual(['Equals', 'Does not equal', 'At least', 'At most', 'Between']);
    fireEvent.click(listbox.getByRole('option', { name: 'Between' }));
    expect(onChange).toHaveBeenCalledWith({ op: 'between' });
  });

  it('asks for a min and a max once the condition is between', () => {
    const onChange = renderControl(amount, { op: 'between' });
    expect(screen.queryByLabelText('Value')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Amount min'), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText('Amount max'), { target: { value: '2500' } });
    expect(onChange).toHaveBeenCalledWith({ value: '100' });
    expect(onChange).toHaveBeenCalledWith({ valueTo: '2500' });
  });
});

describe('FilterControl for a date column', () => {
  it('emits the picked from / to days, with the pickers unbounded while nothing is picked', () => {
    const onChange = renderControl(created);
    expect(screen.getByTestId('picker Created from')).toHaveAttribute('data-max', 'none');
    expect(screen.getByTestId('picker Created to')).toHaveAttribute('data-min', 'none');

    fireEvent.click(screen.getByText('set Created from'));
    fireEvent.click(screen.getByText('clear Created to'));
    expect(onChange).toHaveBeenCalledWith({ from: new Date('2026-09-01T00:00:00.000Z') });
    expect(onChange).toHaveBeenCalledWith({ to: null });
  });

  it('keeps the range the right way round: from cannot pass to, and to cannot precede from', () => {
    const from = new Date('2026-09-01T00:00:00.000Z');
    const to = new Date('2026-09-08T00:00:00.000Z');
    renderControl(created, { from, to });
    expect(screen.getByTestId('picker Created from')).toHaveAttribute('data-max', to.toISOString());
    expect(screen.getByTestId('picker Created to')).toHaveAttribute('data-min', from.toISOString());
  });
});

describe('FilterControl for a boolean column', () => {
  it('offers Any / Yes / No under the column name and emits the choice', () => {
    const onChange = renderControl(active);
    const listbox = openSelect(/Active/);
    expect(optionNames(listbox)).toEqual(['Any', 'Yes', 'No']);
    fireEvent.click(listbox.getByRole('option', { name: 'No' }));
    expect(onChange).toHaveBeenCalledWith({ bool: 'false' });
  });
});

describe('FilterControl for an enum column', () => {
  it('chips the picked options by label (raw value for an unknown one) and adds to the picked list', () => {
    const onChange = renderControl(status, { selected: ['OPEN', 'ARCHIVED'] });
    expect(screen.getByText('Open')).toBeInTheDocument();
    expect(screen.getByText('ARCHIVED')).toBeInTheDocument();

    const listbox = openSelect(/Status/);
    expect(optionNames(listbox)).toEqual(['Open', 'Closed']);
    fireEvent.click(listbox.getByRole('option', { name: 'Closed' }));
    expect(onChange).toHaveBeenCalledWith({ selected: ['OPEN', 'ARCHIVED', 'CLOSED'] });
  });
});
