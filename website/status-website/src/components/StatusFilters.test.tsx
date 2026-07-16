import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import StatusFilters, { type FilterState } from './StatusFilters';

const value: FilterState = { query: '', status: 'all', group: 'all' };

describe('StatusFilters', () => {
  it('emits a new query as the user types', () => {
    const onChange = vi.fn();
    render(<StatusFilters value={value} groupTitles={['Consoles']} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Search services'), { target: { value: 'api' } });
    expect(onChange).toHaveBeenCalledWith({ ...value, query: 'api' });
  });

  it('emits the chosen group from the dropdown', () => {
    const onChange = vi.fn();
    render(<StatusFilters value={value} groupTitles={['Consoles']} onChange={onChange} />);
    fireEvent.mouseDown(screen.getByRole('combobox'));
    const listbox = within(screen.getByRole('listbox'));
    fireEvent.click(listbox.getByText('Consoles'));
    expect(onChange).toHaveBeenCalledWith({ ...value, group: 'Consoles' });
  });

  it('emits a status when a different toggle is selected', () => {
    const onChange = vi.fn();
    render(<StatusFilters value={value} groupTitles={[]} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Issues' }));
    expect(onChange).toHaveBeenCalledWith({ ...value, status: 'issues' });
  });

  it('ignores a click that would deselect the active toggle', () => {
    const onChange = vi.fn();
    render(<StatusFilters value={value} groupTitles={[]} onChange={onChange} />);
    // "All" is already selected; re-clicking it yields a null value that is ignored.
    fireEvent.click(screen.getByRole('button', { name: 'All' }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
