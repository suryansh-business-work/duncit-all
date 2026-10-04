import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import ColumnMappingStep from '@/components/import/ColumnMappingStep';
import ImportResultView from '@/components/import/ImportResultView';
import type { ImportField } from '@/config/importFields';

const fields: ImportField[] = [
  { field: 'venue_name', label: 'Venue name', required: true },
  { field: 'city', label: 'City', required: true },
  { field: 'remarks', label: 'Remarks' },
];
const headers = ['Name', 'Town', 'Notes'];

const renderMapping = (mapping: Record<string, string>) => {
  const onChange = vi.fn();
  render(<ColumnMappingStep fields={fields} headers={headers} mapping={mapping} onChange={onChange} />);
  return onChange;
};

const fieldSelect = (label: string) => screen.getByRole('combobox', { name: label });
// The required flag rides on the Select's hidden native input next to the combobox.
const nativeInput = (label: string) => fieldSelect(label).parentElement?.querySelector('input');

describe('ColumnMappingStep', () => {
  it('shows one row per field with the current mapping and marks only required fields', () => {
    renderMapping({ venue_name: 'Name' });

    expect(screen.getByText(/Match each lead field to a column from your file/)).toBeInTheDocument();
    expect(screen.getAllByText('required')).toHaveLength(2);
    expect(fieldSelect('Venue name')).toHaveTextContent('Name');
    expect(nativeInput('Venue name')).toHaveValue('Name');
    expect(nativeInput('Venue name')).toHaveAttribute('aria-required', 'true');
    expect(nativeInput('City')).toHaveValue('');
    expect(nativeInput('Remarks')).toHaveValue('');
    expect(nativeInput('Remarks')).not.toHaveAttribute('aria-required');
  });

  it('flags a required field that is still unmapped, but not a mapped or optional one', () => {
    renderMapping({ venue_name: 'Name' });

    expect(fieldSelect('City')).toHaveAttribute('aria-invalid', 'true');
    expect(fieldSelect('Venue name')).not.toHaveAttribute('aria-invalid', 'true');
    expect(fieldSelect('Remarks')).not.toHaveAttribute('aria-invalid', 'true');
  });

  it('offers Ignore plus every detected header and reports the merged mapping on pick', () => {
    const onChange = renderMapping({ venue_name: 'Name' });

    fireEvent.mouseDown(fieldSelect('City'));
    const listbox = within(screen.getByRole('listbox'));
    expect(listbox.getAllByRole('option').map((o) => o.textContent)).toEqual(['— Ignore —', 'Name', 'Town', 'Notes']);
    fireEvent.click(listbox.getByRole('option', { name: 'Town' }));

    expect(onChange).toHaveBeenCalledWith({ venue_name: 'Name', city: 'Town' });
  });

  it('clears a field back to Ignore', () => {
    const onChange = renderMapping({ venue_name: 'Name', remarks: 'Notes' });

    fireEvent.mouseDown(fieldSelect('Remarks'));
    fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: '— Ignore —' }));

    expect(onChange).toHaveBeenCalledWith({ venue_name: 'Name', remarks: '' });
  });
});

describe('ImportResultView', () => {
  it('reports a clean import as success with no failure table', () => {
    render(<ImportResultView result={{ inserted: 5, failed: 0, errors: [] }} />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('MuiAlert-colorSuccess');
    expect(alert).toHaveTextContent('Imported 5 of 5 rows');
    expect(alert).not.toHaveTextContent('failed');
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('warns about failures and lists every failed row with its reason', () => {
    render(
      <ImportResultView
        result={{
          inserted: 3,
          failed: 2,
          errors: [
            { row: 4, message: 'City is required' },
            { row: 4, message: 'Venue name is required' },
          ],
        }}
      />,
    );

    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('MuiAlert-colorWarning');
    expect(alert).toHaveTextContent('Imported 3 of 5 rows · 2 failed');
    const table = screen.getByRole('table');
    expect(within(table).getByRole('columnheader', { name: 'Row' })).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: 'Reason' })).toBeInTheDocument();
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows.map((r) => Array.from(r.querySelectorAll('td')).map((c) => c.textContent))).toEqual([
      ['4', 'City is required'],
      ['4', 'Venue name is required'],
    ]);
  });
});
