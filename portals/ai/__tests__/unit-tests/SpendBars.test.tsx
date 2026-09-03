import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import SpendBars from '../../src/pages/openai-dashboard/SpendBars';
import type { SpendBarRow } from '../../src/pages/openai-dashboard/SpendBars';
import { renderWithProviders } from '../testkit';

/**
 * Horizontal bars scaled by COST, not by call count.
 *
 * A cheap task called ten thousand times and an expensive one called twice look
 * identical on a call-count bar, and the question this page answers is where
 * the money goes — so the width being the money is the thing worth pinning.
 */
const bar = (over: Partial<SpendBarRow> = {}): SpendBarRow => ({
  id: 'gpt-4o-mini',
  label: 'gpt-4o-mini',
  cost_usd: 4,
  calls: 12_400,
  tokens: 515_000,
  ...over,
});

describe('SpendBars', () => {
  it('says so when there is nothing to chart', () => {
    renderWithProviders(<SpendBars rows={[]} emptyText="No OpenAI calls in this range." />);

    expect(screen.getByText('No OpenAI calls in this range.')).toBeInTheDocument();
  });

  it('labels each row with its name and its spend', () => {
    renderWithProviders(<SpendBars rows={[bar()]} emptyText="none" />);

    expect(screen.getByText('gpt-4o-mini')).toBeInTheDocument();
    expect(screen.getByText('$4.00')).toBeInTheDocument();
  });

  it('reads the call and token counts as magnitudes, grouped', () => {
    const { container } = renderWithProviders(
      <SpendBars rows={[bar()]} emptyText="none" />,
    );

    // Grouped, because these are read as magnitudes rather than exact figures.
    expect(container.textContent).toContain('12,400 calls');
    expect(container.textContent).toContain('515,000 tokens');
  });

  it('scales the widest bar to the biggest spender, not to the busiest', () => {
    const { container } = renderWithProviders(
      <SpendBars
        rows={[
          bar({ id: 'cheap', label: 'cheap-but-busy', cost_usd: 1, calls: 90_000 }),
          bar({ id: 'dear', label: 'dear-but-rare', cost_usd: 4, calls: 2 }),
        ]}
        emptyText="none"
      />,
    );

    const widths = [...container.querySelectorAll('div')]
      .map((el) => globalThis.getComputedStyle(el as HTMLElement).width)
      .filter(Boolean);

    // The rare, expensive model owns the full bar; the busy cheap one is a
    // quarter of it. On a call-count chart these would be the other way round.
    expect(widths).toContain('100%');
    expect(widths).toContain('25%');
  });

  it('does not divide by zero when nothing has cost anything yet', () => {
    const { container } = renderWithProviders(
      <SpendBars rows={[bar({ cost_usd: 0, calls: 0, tokens: 0 })]} emptyText="none" />,
    );

    // A range where every call was free still has to render — the reduce falls
    // back to 1 rather than producing NaN%.
    const widths = [...container.querySelectorAll('div')]
      .map((el) => globalThis.getComputedStyle(el as HTMLElement).width)
      .filter(Boolean);
    expect(widths.every((w) => !w.includes('NaN'))).toBe(true);
    expect(screen.getByText('$0')).toBeInTheDocument();
  });
});
