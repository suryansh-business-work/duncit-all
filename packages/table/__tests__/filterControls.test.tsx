import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FilterControl } from '../src/toolbar/filterControls';
import { emptyDraft, type FilterDraft } from '../src/toolbar/filterState';
import type { DuncitColumn } from '../src/types';

// Deterministic stand-in for the MUI X DatePicker: two buttons that fire the
// picker's onChange with a real Date and with null so both branches are exercised
// without wrestling the real picker's text parsing under jsdom.
vi.mock('@mui/x-date-pickers/DatePicker', () => ({
  DatePicker: ({ label, onChange }: { label: string; onChange: (v: Date | null) => void }) => (
    <div>
      <button type="button" onClick={() => onChange(new Date('2026-05-01T00:00:00.000Z'))}>
        {`set ${label}`}
      </button>
      <button type="button" onClick={() => onChange(null)}>{`clear ${label}`}</button>
    </div>
  ),
}));

type Row = Record<string, unknown>;

function draft(overrides: Partial<FilterDraft> = {}): FilterDraft {
  return { ...emptyDraft(), ...overrides };
}

function renderControl(column: DuncitColumn<Row>, d: FilterDraft, onChange = vi.fn()) {
  const utils = render(<FilterControl<Row> column={column} draft={d} onChange={onChange} />);
  return { ...utils, onChange };
}

function openSelect(name: string | RegExp): ReturnType<typeof within> {
  fireEvent.mouseDown(screen.getByRole('combobox', { name }));
  return within(screen.getByRole('listbox'));
}

describe('FilterControl', () => {
  it('renders nothing for a non-filterable column', () => {
    const { container } = renderControl({ field: 'plain', headerName: 'Plain' }, draft());
    expect(container).toBeEmptyDOMElement();
  });

  it('text control emits trimmed-free text patches', () => {
    const { onChange } = renderControl(
      { field: 'name', headerName: 'Name', filter: { type: 'text' } },
      draft(),
    );
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'hello' } });
    expect(onChange).toHaveBeenCalledWith({ text: 'hello' });
  });

  it('multi-select renders selected chips (with a raw-value fallback) and emits arrays', () => {
    const column: DuncitColumn<Row> = {
      field: 'status',
      headerName: 'Status',
      filter: {
        type: 'select',
        multiple: true,
        options: [
          { value: 'A', label: 'Active' },
          { value: 'I', label: 'Inactive' },
        ],
      },
    };
    const { onChange } = renderControl(column, draft({ selected: ['A', 'ZZZ'] }));
    // Known value renders its label; unknown value falls back to the raw value.
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('ZZZ')).toBeInTheDocument();

    const listbox = openSelect('Status');
    fireEvent.click(listbox.getByRole('option', { name: 'Inactive' }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ selected: expect.arrayContaining(['I']) }),
    );
  });

  const singleColumn: DuncitColumn<Row> = {
    field: 'kind',
    headerName: 'Kind',
    filter: { type: 'select', options: [{ value: 'x', label: 'X' }] },
  };

  it('single-select emits [value] when a real option is picked (empty -> value)', () => {
    const { onChange } = renderControl(singleColumn, draft({ selected: [] }));
    fireEvent.click(openSelect('Kind').getByRole('option', { name: 'X' }));
    expect(onChange).toHaveBeenLastCalledWith({ selected: ['x'] });
  });

  it('single-select emits [] when reset to Any (value -> empty)', () => {
    const { onChange } = renderControl(singleColumn, draft({ selected: ['x'] }));
    fireEvent.click(openSelect('Kind').getByRole('option', { name: 'Any' }));
    expect(onChange).toHaveBeenLastCalledWith({ selected: [] });
  });

  it('number control emits min and max patches', () => {
    const { onChange } = renderControl(
      { field: 'age', headerName: 'Age', filter: { type: 'number' } },
      draft(),
    );
    fireEvent.change(screen.getByLabelText('Age min'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Age max'), { target: { value: '9' } });
    expect(onChange).toHaveBeenCalledWith({ min: '1' });
    expect(onChange).toHaveBeenCalledWith({ max: '9' });
  });

  it('date control emits from (Date) and to (null) patches', () => {
    const { onChange } = renderControl(
      { field: 'created', headerName: 'Created', filter: { type: 'date' } },
      draft(),
    );
    fireEvent.click(screen.getByText('set Created from'));
    fireEvent.click(screen.getByText('clear Created to'));
    expect(onChange).toHaveBeenCalledWith({ from: new Date('2026-05-01T00:00:00.000Z') });
    expect(onChange).toHaveBeenCalledWith({ to: null });
  });

  it('boolean control emits the tri-state selection', () => {
    const { onChange } = renderControl(
      { field: 'active', headerName: 'Active', filter: { type: 'boolean' } },
      draft(),
    );
    fireEvent.click(openSelect('Active').getByRole('option', { name: 'Yes' }));
    expect(onChange).toHaveBeenCalledWith({ bool: 'true' });
  });
});
