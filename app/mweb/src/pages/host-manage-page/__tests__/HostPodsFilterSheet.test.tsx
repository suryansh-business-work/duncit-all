import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import HostPodsFilterSheet from '../HostPodsFilterSheet';
import { DEFAULT_HOST_PODS_FILTERS, type HostPodsFilters } from '../hostPodsFilters';

const initial: HostPodsFilters = { type: 'PHYSICAL', time: 'PAST', price: 'PAID' };

describe('HostPodsFilterSheet', () => {
  it('does not render content when closed', () => {
    render(
      <HostPodsFilterSheet
        open={false}
        initial={initial}
        onApply={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.queryByText('Filter pods')).not.toBeInTheDocument();
  });

  it('renders all three filter groups and their options when open', () => {
    render(
      <HostPodsFilterSheet open initial={initial} onApply={vi.fn()} onClose={vi.fn()} />,
    );
    expect(screen.getByText('Filter pods')).toBeInTheDocument();
    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('Time')).toBeInTheDocument();
    expect(screen.getByText('Price')).toBeInTheDocument();
    // Chip labels present
    expect(screen.getByText('Physical')).toBeInTheDocument();
    expect(screen.getByText('Virtual')).toBeInTheDocument();
    expect(screen.getByText('Upcoming')).toBeInTheDocument();
    expect(screen.getByText('Paid')).toBeInTheDocument();
    expect(screen.getByText('Free')).toBeInTheDocument();
  });

  it('applies the current draft (from initial) unchanged', () => {
    const onApply = vi.fn();
    render(
      <HostPodsFilterSheet open initial={initial} onApply={onApply} onClose={vi.fn()} />,
    );
    fireEvent.click(screen.getByText('Apply'));
    expect(onApply).toHaveBeenCalledWith(initial);
  });

  it('selecting chips updates the draft, then Apply commits the new draft', () => {
    const onApply = vi.fn();
    render(
      <HostPodsFilterSheet open initial={initial} onApply={onApply} onClose={vi.fn()} />,
    );
    fireEvent.click(screen.getByText('Virtual'));
    fireEvent.click(screen.getByText('Ongoing'));
    fireEvent.click(screen.getByText('Free'));
    fireEvent.click(screen.getByText('Apply'));
    expect(onApply).toHaveBeenCalledWith({ type: 'VIRTUAL', time: 'ONGOING', price: 'FREE' });
  });

  it('Reset restores the default filters, and Apply then commits the default', () => {
    const onApply = vi.fn();
    render(
      <HostPodsFilterSheet open initial={initial} onApply={onApply} onClose={vi.fn()} />,
    );
    fireEvent.click(screen.getByText('Reset'));
    fireEvent.click(screen.getByText('Apply'));
    expect(onApply).toHaveBeenCalledWith(DEFAULT_HOST_PODS_FILTERS);
  });

  it('the Close button invokes onClose', () => {
    const onClose = vi.fn();
    render(
      <HostPodsFilterSheet open initial={initial} onApply={vi.fn()} onClose={onClose} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('resyncs the draft to a new initial when reopened', () => {
    const onApply = vi.fn();
    const { rerender } = render(
      <HostPodsFilterSheet open={false} initial={initial} onApply={onApply} onClose={vi.fn()} />,
    );
    const next: HostPodsFilters = { type: 'VIRTUAL', time: 'UPCOMING', price: 'FREE' };
    rerender(
      <HostPodsFilterSheet open initial={next} onApply={onApply} onClose={vi.fn()} />,
    );
    fireEvent.click(screen.getByText('Apply'));
    expect(onApply).toHaveBeenCalledWith(next);
  });
});
