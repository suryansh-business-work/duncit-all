import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LeadsToolbar from '@/components/LeadsToolbar';

describe('LeadsToolbar', () => {
  const baseProps = {
    title: 'Venue Leads',
    subtitle: 'Track partnership leads.',
    search: '',
    onSearch: vi.fn(),
    onCreate: vi.fn(),
    createLabel: 'New Venue Lead',
  };

  it('renders title, subtitle and the create button', () => {
    render(<LeadsToolbar {...baseProps} />);
    expect(screen.getByText('Venue Leads')).toBeTruthy();
    expect(screen.getByText('Track partnership leads.')).toBeTruthy();
    expect(screen.getByRole('button', { name: /New Venue Lead/i })).toBeTruthy();
  });

  it('calls onSearch when typing in the search box', () => {
    const onSearch = vi.fn();
    render(<LeadsToolbar {...baseProps} onSearch={onSearch} />);
    fireEvent.change(screen.getByPlaceholderText(/Search/i), { target: { value: 'mumbai' } });
    expect(onSearch).toHaveBeenCalledWith('mumbai');
  });

  it('renders chip groups when status / priority / superCategory are supplied', () => {
    const onChange = vi.fn();
    render(
      <LeadsToolbar
        {...baseProps}
        status={{ selected: '', options: [{ label: 'New', value: 'New' }], onChange }}
        priority={{ selected: '', options: [{ label: 'High', value: 'High' }], onChange }}
        superCategory={{ selected: '', options: [{ label: 'Wedding', value: 'w1' }], onChange }}
      />
    );
    expect(screen.getByText(/Super Category/i)).toBeTruthy();
    expect(screen.getByText(/Status/i)).toBeTruthy();
    expect(screen.getByText(/Priority/i)).toBeTruthy();
    expect(screen.getByText('Wedding')).toBeTruthy();
  });

  it('clicking a chip fires the onChange with that value', () => {
    const onChange = vi.fn();
    render(
      <LeadsToolbar
        {...baseProps}
        status={{ selected: '', options: [{ label: 'New', value: 'New' }], onChange }}
      />
    );
    fireEvent.click(screen.getByText('New'));
    expect(onChange).toHaveBeenCalledWith('New');
  });

  it('clicking the "All" chip clears the selection', () => {
    const onChange = vi.fn();
    render(
      <LeadsToolbar
        {...baseProps}
        status={{ selected: 'New', options: [{ label: 'New', value: 'New' }], onChange }}
      />
    );
    fireEvent.click(screen.getByText('All'));
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('hides optional action buttons when handlers are not supplied', () => {
    render(<LeadsToolbar {...baseProps} />);
    expect(screen.queryByText(/Fill with AI/i)).toBeNull();
    expect(screen.queryByText(/^Template$/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /^Import$/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Export$/i })).toBeNull();
  });

  it('shows optional action buttons when handlers are supplied', () => {
    render(
      <LeadsToolbar
        {...baseProps}
        onFillWithAi={() => undefined}
        onImport={() => undefined}
        onExport={() => undefined}
        onDownloadTemplate={() => undefined}
      />
    );
    // Tooltip-wrapped buttons have their accessible name come from the tooltip
    // title, so we assert the visible text labels.
    expect(screen.getByText(/Fill with AI/i)).toBeTruthy();
    expect(screen.getByText(/^Template$/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Import$/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Export$/i })).toBeTruthy();
  });
});
