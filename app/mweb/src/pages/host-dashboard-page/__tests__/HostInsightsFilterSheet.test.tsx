import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import HostInsightsFilterSheet from '../HostInsightsFilterSheet';
import { DEFAULT_HOST_CHART_RANGE, hostRangeOptions } from '../insights';

// ResponsiveDialog uses useMediaQuery -> matchMedia (not implemented in jsdom).
beforeAll(() => {
  if (!window.matchMedia) {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  }
});

describe('HostInsightsFilterSheet', () => {
  it('does not render content when closed', () => {
    render(
      <HostInsightsFilterSheet
        open={false}
        initial="PAST_6_MONTHS"
        hasPods={false}
        onApply={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.queryByText('Filter pods by month')).not.toBeInTheDocument();
  });

  it('renders all range chips when open without the "All" option when hasPods is false', () => {
    render(
      <HostInsightsFilterSheet
        open
        initial="PAST_6_MONTHS"
        hasPods={false}
        onApply={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('Filter pods by month')).toBeInTheDocument();
    // hasPods=false => no "All" chip
    expect(screen.queryByText('All')).not.toBeInTheDocument();
    for (const [, label] of hostRangeOptions(false)) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('shows the "All" chip when hasPods is true', () => {
    render(
      <HostInsightsFilterSheet
        open
        initial="ALL"
        hasPods
        onApply={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('All')).toBeInTheDocument();
  });

  it('selecting a chip then Apply commits the drafted range', () => {
    const onApply = vi.fn();
    render(
      <HostInsightsFilterSheet
        open
        initial="PAST_6_MONTHS"
        hasPods={false}
        onApply={onApply}
        onClose={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText('Past 3 Months'));
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(onApply).toHaveBeenCalledWith('PAST_3_MONTHS');
  });

  it('Apply without changes commits the initial range', () => {
    const onApply = vi.fn();
    render(
      <HostInsightsFilterSheet
        open
        initial="PAST_3_MONTHS"
        hasPods={false}
        onApply={onApply}
        onClose={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(onApply).toHaveBeenCalledWith('PAST_3_MONTHS');
  });

  it('Reset restores the default range then Apply commits it', () => {
    const onApply = vi.fn();
    render(
      <HostInsightsFilterSheet
        open
        initial="LAST_YEAR"
        hasPods={false}
        onApply={onApply}
        onClose={vi.fn()}
      />,
    );
    // Move away from default first.
    fireEvent.click(screen.getByText('Past 3 Months'));
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(onApply).toHaveBeenCalledWith(DEFAULT_HOST_CHART_RANGE);
  });

  it('the Close icon triggers onClose', () => {
    const onClose = vi.fn();
    render(
      <HostInsightsFilterSheet
        open
        initial="PAST_6_MONTHS"
        hasPods={false}
        onApply={vi.fn()}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('re-syncs the draft to a new initial prop while open', () => {
    const onApply = vi.fn();
    const { rerender } = render(
      <HostInsightsFilterSheet
        open
        initial="PAST_6_MONTHS"
        hasPods={false}
        onApply={onApply}
        onClose={vi.fn()}
      />,
    );
    rerender(
      <HostInsightsFilterSheet
        open
        initial="CURRENT_YEAR"
        hasPods={false}
        onApply={onApply}
        onClose={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(onApply).toHaveBeenLastCalledWith('CURRENT_YEAR');
  });
});
