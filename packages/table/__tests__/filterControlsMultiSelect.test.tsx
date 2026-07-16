import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// The real MUI multiple <Select> only ever hands its onChange an array; the string
// branch exists for native-autofill parity. Stub Select so we can hand the control a
// comma-joined string and cover MultiSelectControl's `value.split(',')` path.
vi.mock('@mui/material/Select', () => ({
  __esModule: true,
  default: ({ onChange }: { onChange: (e: { target: { value: unknown } }) => void }) => (
    <button type="button" data-testid="fire-string" onClick={() => onChange({ target: { value: 'A,I' } })}>
      fire
    </button>
  ),
}));

// eslint-disable-next-line import/first -- must import after the Select mock is registered
import { FilterControl } from '../src/toolbar/filterControls';
import { emptyDraft } from '../src/toolbar/filterState';
import type { DuncitColumn } from '../src/types';

type Row = Record<string, unknown>;

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

describe('MultiSelectControl string value handling', () => {
  it('splits a comma-joined string value into an array', () => {
    const onChange = vi.fn();
    render(<FilterControl<Row> column={column} draft={emptyDraft()} onChange={onChange} />);
    fireEvent.click(screen.getByTestId('fire-string'));
    expect(onChange).toHaveBeenCalledWith({ selected: ['A', 'I'] });
  });
});
