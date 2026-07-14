import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LeadsToolbar from '@/components/LeadsToolbar';

describe('LeadsToolbar', () => {
  const baseProps = {
    title: 'Venue Leads',
    subtitle: 'Track partnership leads.',
  };

  it('renders the title and subtitle', () => {
    render(<LeadsToolbar {...baseProps} />);
    expect(screen.getByText('Venue Leads')).toBeTruthy();
    expect(screen.getByText('Track partnership leads.')).toBeTruthy();
  });

  it('hides optional action buttons when handlers are not supplied', () => {
    render(<LeadsToolbar {...baseProps} />);
    expect(screen.queryByText(/Fill with AI/i)).toBeNull();
    expect(screen.queryByText(/^Template$/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /^Import$/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Export$/i })).toBeNull();
    expect(screen.queryByText(/Manage Services/i)).toBeNull();
  });

  it('shows optional action buttons when handlers are supplied', () => {
    render(
      <LeadsToolbar
        {...baseProps}
        onManageServices={() => undefined}
        onFillWithAi={() => undefined}
        onImport={() => undefined}
        onExport={() => undefined}
        onDownloadTemplate={() => undefined}
      />
    );
    // Tooltip-wrapped buttons have their accessible name come from the tooltip
    // title, so we assert the visible text labels.
    expect(screen.getByText(/Manage Services/i)).toBeTruthy();
    expect(screen.getByText(/Fill with AI/i)).toBeTruthy();
    expect(screen.getByText(/^Template$/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Import$/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Export$/i })).toBeTruthy();
  });

  it('fires the matching handler when an action button is clicked', () => {
    const onImport = vi.fn();
    const onExport = vi.fn();
    render(<LeadsToolbar {...baseProps} onImport={onImport} onExport={onExport} />);
    fireEvent.click(screen.getByRole('button', { name: /^Import$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Export$/i }));
    expect(onImport).toHaveBeenCalledTimes(1);
    expect(onExport).toHaveBeenCalledTimes(1);
  });
});
