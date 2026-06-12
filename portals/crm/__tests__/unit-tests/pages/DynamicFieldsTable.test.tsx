import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import DynamicFieldsTable from '@/pages/ManageDynamicFieldsPage/DynamicFieldsTable';
import type { CrmDynamicField } from '@/api/crm.types';

const mk = (id: string, label: string, sort: number, over: Partial<CrmDynamicField> = {}): CrmDynamicField => ({
  id,
  name: label.toLowerCase(),
  label,
  kind: 'text',
  options: [],
  multi: false,
  placeholder: '',
  default_value: '',
  hint: '',
  applies_to_venue: true,
  applies_to_host: true,
  applies_to_ecomm: false,
  required: false,
  sort_order: sort,
  is_active: true,
  ...over,
});

const rows = [mk('a', 'Alpha', 0), mk('b', 'Beta', 1), mk('c', 'Gamma', 2)];

const baseProps = {
  rows,
  busy: false,
  draftOpen: false,
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  onToggleActive: vi.fn(),
  onReorder: vi.fn(),
};

describe('DynamicFieldsTable', () => {
  it('renders a row per field and an empty-state message when no rows', () => {
    render(<DynamicFieldsTable {...baseProps} />);
    expect(screen.getByText('Alpha')).toBeTruthy();
    expect(screen.getByText('Gamma')).toBeTruthy();

    const { container } = render(<DynamicFieldsTable {...baseProps} rows={[]} />);
    expect(container.textContent).toMatch(/No dynamic fields yet/i);
  });

  it('shows a Multi chip only for multi-select fields', () => {
    const list = [mk('s', 'Tags', 0, { kind: 'select', multi: true, options: [{ value: 'x', label: 'X' }] })];
    render(<DynamicFieldsTable {...baseProps} rows={list} />);
    expect(screen.getByText('Multi')).toBeTruthy();
  });

  it('reorders via drag-and-drop and reports the new id order', () => {
    const onReorder = vi.fn();
    render(<DynamicFieldsTable {...baseProps} onReorder={onReorder} />);
    const first = screen.getByTestId('dynamic-field-row-alpha');
    const third = screen.getByTestId('dynamic-field-row-gamma');
    fireEvent.dragStart(first);
    fireEvent.dragOver(third);
    fireEvent.drop(third);
    expect(onReorder).toHaveBeenCalledWith(['b', 'c', 'a']);
  });

  it('fires edit / delete / toggle callbacks', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const onToggleActive = vi.fn();
    render(<DynamicFieldsTable {...baseProps} onEdit={onEdit} onDelete={onDelete} onToggleActive={onToggleActive} />);
    const row = screen.getByTestId('dynamic-field-row-alpha');
    fireEvent.click(within(row).getByRole('button', { name: 'Edit' }));
    fireEvent.click(within(row).getByRole('button', { name: 'Delete' }));
    fireEvent.click(within(row).getByRole('checkbox'));
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }));
    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }));
    expect(onToggleActive).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }));
  });
});
