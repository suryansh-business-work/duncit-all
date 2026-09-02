import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import RefreshIndicator from './RefreshIndicator';

describe('RefreshIndicator', () => {
  it('shows a labelled progress bar while a refresh is in flight', () => {
    render(<RefreshIndicator active />);

    const bar = screen.getByRole('progressbar');
    expect(bar).toBeTruthy();
    // The board refreshes itself every 60 seconds; a reader watching for a
    // service to come back needs to know the page is still trying.
    expect(bar.getAttribute('aria-label')).toBeTruthy();
  });

  it('sits above the app bar rather than sliding under it', () => {
    render(<RefreshIndicator active />);

    // The bar is fixed to the top of the viewport, which is exactly where the
    // header already is — the zIndex is what keeps it visible rather than
    // hidden behind the chrome.
    const style = getComputedStyle(screen.getByRole('progressbar'));
    expect(style.position).toBe('fixed');
    expect(Number(style.zIndex)).toBeGreaterThan(0);
  });

  it('renders nothing at all when no fetch is running', () => {
    render(<RefreshIndicator active={false} />);

    // unmountOnExit: an idle board carries no progress bar in the tree, so a
    // screen reader is not told about a refresh that is not happening.
    expect(screen.queryByRole('progressbar')).toBeNull();
  });
});
