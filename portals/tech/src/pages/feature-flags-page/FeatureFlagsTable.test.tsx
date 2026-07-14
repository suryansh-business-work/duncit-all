import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FeatureFlagsTable from './FeatureFlagsTable';
import type { FeatureFlagRow } from './queries';

const flag = (over: Partial<FeatureFlagRow>): FeatureFlagRow => ({
  id: '1', key: 'flag', name: 'Flag', description: '', enabled: false,
  is_system: false, updated_at: '2026-01-01T00:00:00.000Z', ...over,
});

const fetchFor = (rows: FeatureFlagRow[]) => vi.fn(async () => ({ rows, total: rows.length }));

const handlers = () => ({ onToggle: vi.fn(), onEdit: vi.fn(), onRemove: vi.fn() });

beforeEach(() => {
  window.localStorage.clear();
});

describe('FeatureFlagsTable', () => {
  it('shows the empty state when there are no flags', async () => {
    render(<FeatureFlagsTable fetchRows={fetchFor([])} refetchRef={{ current: null }} {...handlers()} />);
    expect(await screen.findByText(/No feature flags yet/i)).toBeInTheDocument();
  });

  it('renders system/custom rows, the em-dash for missing descriptions, and wires actions', async () => {
    const onToggle = vi.fn(), onEdit = vi.fn(), onRemove = vi.fn();
    const flags = [
      flag({ id: '1', key: 'sys_flag', name: 'System Flag', description: 'has desc', enabled: true, is_system: true }),
      flag({ id: '2', key: 'cust_flag', name: 'Custom Flag', description: '', enabled: false, is_system: false }),
    ];
    render(
      <FeatureFlagsTable
        fetchRows={fetchFor(flags)}
        refetchRef={{ current: null }}
        toolbarActions={<button type="button">New Flag</button>}
        onToggle={onToggle}
        onEdit={onEdit}
        onRemove={onRemove}
      />
    );

    expect(await screen.findByText('sys_flag')).toBeInTheDocument();
    expect(screen.getByText('System')).toBeInTheDocument();
    expect(screen.getByText('Custom')).toBeInTheDocument();
    expect(screen.getByText('has desc')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument(); // empty description
    expect(screen.getByRole('button', { name: 'New Flag' })).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('checkbox')[0]); // toggle first row
    fireEvent.click(screen.getAllByTestId('EditIcon')[0].closest('button')!);
    // Delete is disabled for the system row, enabled for the custom row
    // (rows are sorted key asc: cust_flag first, sys_flag second).
    const deleteButtons = screen.getAllByTestId('DeleteIcon').map((i) => i.closest('button')!);
    expect(deleteButtons[1]).toBeDisabled();
    fireEvent.click(deleteButtons[0]);

    expect(onToggle).toHaveBeenCalled();
    expect(onEdit).toHaveBeenCalled();
    expect(onRemove).toHaveBeenCalled();
  });
});
