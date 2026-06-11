import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EnvEntriesTable from './EnvEntriesTable';
import type { EnvEntry } from './queries';

const make = (over: Partial<EnvEntry>): EnvEntry =>
  ({
    id: 'x', name: 'Entry', category: 'EMAIL', description: 'desc',
    is_default: false, is_active: true, assigned_portals: [],
    config: [], secrets: [], last_used_at: null, last_tested_at: null,
    last_test_ok: null, created_at: null, updated_at: null, ...over,
  }) as EnvEntry;

describe('EnvEntriesTable', () => {
  it('renders an empty state', () => {
    render(<EnvEntriesTable entries={[]} onEdit={vi.fn()} onDelete={vi.fn()} onSetDefault={vi.fn()} onTest={vi.fn()} />);
    expect(screen.getByText(/No entries yet/i)).toBeInTheDocument();
  });

  it('renders default/active/tested/assigned variants and wires actions', () => {
    const onEdit = vi.fn(), onDelete = vi.fn(), onSetDefault = vi.fn(), onTest = vi.fn();
    const entries = [
      make({ id: 'a', name: 'Default A', is_default: true, is_active: true, last_test_ok: true, last_tested_at: '2026-01-01T00:00:00Z', assigned_portals: ['crm', 'ads'] }),
      make({ id: 'b', name: 'Off B', is_default: false, is_active: false, last_test_ok: false, last_tested_at: '2026-01-01T00:00:00Z' }),
      make({ id: 'c', name: 'Untested C' }),
    ];
    render(<EnvEntriesTable entries={entries} onEdit={onEdit} onDelete={onDelete} onSetDefault={onSetDefault} onTest={onTest} />);

    expect(screen.getByText('Default')).toBeInTheDocument();
    expect(screen.getByText('Off')).toBeInTheDocument();
    expect(screen.getByText('crm, ads')).toBeInTheDocument();

    fireEvent.click(screen.getAllByTestId('ScienceIcon')[0].closest('button')!);
    fireEvent.click(screen.getAllByTestId('EditIcon')[0].closest('button')!);
    fireEvent.click(screen.getAllByTestId('StarIcon')[0].closest('button')!); // row a is default → filled star
    fireEvent.click(screen.getAllByTestId('DeleteIcon')[0].closest('button')!);
    expect(screen.getAllByTestId('StarBorderIcon').length).toBeGreaterThan(0); // non-default rows
    expect(onTest).toHaveBeenCalled();
    expect(onEdit).toHaveBeenCalled();
    expect(onSetDefault).toHaveBeenCalled();
    expect(onDelete).toHaveBeenCalled();
  });
});
