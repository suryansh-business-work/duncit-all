import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FeatureFlagsTable from './FeatureFlagsTable';

describe('FeatureFlagsTable', () => {
  it('shows a spinner while loading', () => {
    const { container } = render(<FeatureFlagsTable loading flags={[]} onToggle={vi.fn()} onEdit={vi.fn()} onRemove={vi.fn()} />);
    expect(container.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();
  });

  it('renders system/custom rows, the em-dash for missing descriptions, and wires actions', () => {
    const onToggle = vi.fn(), onEdit = vi.fn(), onRemove = vi.fn();
    const flags = [
      { id: '1', key: 'sys_flag', name: 'System Flag', description: 'has desc', enabled: true, is_system: true },
      { id: '2', key: 'cust_flag', name: 'Custom Flag', description: '', enabled: false, is_system: false },
    ];
    render(<FeatureFlagsTable loading={false} flags={flags} onToggle={onToggle} onEdit={onEdit} onRemove={onRemove} />);

    expect(screen.getByText('System')).toBeInTheDocument();
    expect(screen.getByText('Custom')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument(); // empty description

    fireEvent.click(screen.getAllByRole('checkbox')[0]); // toggle row 1
    fireEvent.click(screen.getAllByTestId('EditIcon')[0].closest('button')!);
    // Delete is disabled for the system row, enabled for the custom row.
    const deleteButtons = screen.getAllByTestId('DeleteIcon').map((i) => i.closest('button')!);
    expect(deleteButtons[0]).toBeDisabled();
    fireEvent.click(deleteButtons[1]);

    expect(onToggle).toHaveBeenCalled();
    expect(onEdit).toHaveBeenCalled();
    expect(onRemove).toHaveBeenCalled();
  });
});
