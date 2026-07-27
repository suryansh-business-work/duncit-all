import { describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import { createTheme } from '@mui/material/styles';
import ActivityJourneyChart from '../ActivityJourneyChart';
import { renderWithProviders } from './testkit';

/** jsdom reports computed colours as `rgb(r, g, b)`; MUI's palette is hex. */
const hexToRgb = (hex: string) => {
  const value = Number.parseInt(hex.slice(1), 16);
  return `rgb(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255})`;
};

/**
 * chart.js paints to a <canvas>, which jsdom has no 2d context for. Swap the
 * <Line> for a probe that publishes the exact data the component computed, so
 * the hourly bucketing is asserted on real numbers rather than on pixels.
 */
vi.mock('react-chartjs-2', () => ({
  Line: (props: Readonly<{ data: { labels: string[]; datasets: { data: number[] }[] } }>) => (
    <div
      data-testid="line-chart"
      data-labels={JSON.stringify(props.data.labels)}
      data-values={JSON.stringify(props.data.datasets[0].data)}
    />
  ),
}));

interface Event {
  id: string;
  event_type: string;
  path: string;
  title: string;
  target_text?: string;
  target_label?: string;
  occurred_at: string;
}

let seq = 0;
// Local (zone-less) timestamps: `new Date(v).getHours()` reads local time, so a
// zone-less literal keeps the expected bucket the same on every machine.
const makeEvent = (over: Partial<Event> = {}): Event => {
  seq += 1;
  return {
    id: `e${seq}`,
    event_type: 'PAGE_VIEW',
    path: '/shop',
    title: 'Shop',
    occurred_at: '2025-03-04T09:15:00',
    ...over,
  };
};

const chartValues = () =>
  JSON.parse(screen.getByTestId('line-chart').getAttribute('data-values') ?? '[]') as number[];
const chartLabels = () =>
  JSON.parse(screen.getByTestId('line-chart').getAttribute('data-labels') ?? '[]') as string[];

/** The "Top pages" panel — the only place page names appear with a tally. */
const topPagesPanel = () => screen.getByText('Top pages').parentElement as HTMLElement;

describe('ActivityJourneyChart — hourly line', () => {
  it('buckets events into the hour they happened and labels all 24 hours', () => {
    renderWithProviders(
      <ActivityJourneyChart
        events={[
          makeEvent({ occurred_at: '2025-03-04T09:15:00' }),
          makeEvent({ occurred_at: '2025-03-04T09:45:00' }),
          makeEvent({ occurred_at: '2025-03-04T14:05:00' }),
          makeEvent({ occurred_at: '2025-03-04T23:59:00' }),
        ]}
      />,
    );

    const values = chartValues();
    expect(values).toHaveLength(24);
    expect(values[9]).toBe(2);
    expect(values[14]).toBe(1);
    expect(values[23]).toBe(1);
    expect(values.reduce((sum, n) => sum + n, 0)).toBe(4);

    const labels = chartLabels();
    expect(labels[0]).toBe('00:00');
    expect(labels[9]).toBe('09:00');
    expect(labels[23]).toBe('23:00');
  });

  it('drops an unparseable timestamp from the line but still counts its page', () => {
    renderWithProviders(
      <ActivityJourneyChart
        events={[
          makeEvent({ occurred_at: '2025-03-04T09:15:00', title: 'Shop' }),
          makeEvent({ occurred_at: 'not-a-timestamp', title: 'Broken' }),
        ]}
      />,
    );

    expect(chartValues().reduce((sum, n) => sum + n, 0)).toBe(1);
    expect(within(topPagesPanel()).getByText('Broken')).toBeInTheDocument();
  });

  it('renders a flat 24-hour line and no pages or steps for an empty day', () => {
    renderWithProviders(<ActivityJourneyChart events={[]} />);

    expect(chartValues()).toEqual(Array.from({ length: 24 }, () => 0));
    expect(within(topPagesPanel()).queryByText('Shop')).toBeNull();
    expect(screen.queryByText('PAGE_VIEW')).toBeNull();
  });
});

describe('ActivityJourneyChart — top pages', () => {
  it('ranks pages by visit count and shows only the top five', () => {
    const repeat = (title: string, times: number) =>
      Array.from({ length: times }, () => makeEvent({ title, event_type: 'CLICK' }));
    renderWithProviders(
      <ActivityJourneyChart
        events={[
          ...repeat('Shop', 6),
          ...repeat('Cart', 5),
          ...repeat('Profile', 4),
          ...repeat('Pods', 3),
          ...repeat('Chat', 2),
          ...repeat('Help', 1),
        ]}
      />,
    );

    const panel = topPagesPanel();
    const names = within(panel)
      .getAllByText(/^(Shop|Cart|Profile|Pods|Chat|Help)$/)
      .map((node) => node.textContent);
    expect(names).toEqual(['Shop', 'Cart', 'Profile', 'Pods', 'Chat']);
    expect(within(panel).queryByText('Help')).toBeNull();
    expect(within(panel).getByText('6')).toBeInTheDocument();
  });

  it('groups pages by title, falling back to the path and then to "Untitled page"', () => {
    renderWithProviders(
      <ActivityJourneyChart
        events={[
          makeEvent({ title: '', path: '/checkout' }),
          makeEvent({ title: '', path: '' }),
        ]}
      />,
    );

    const panel = topPagesPanel();
    expect(within(panel).getByText('/checkout')).toBeInTheDocument();
    expect(within(panel).getByText('Untitled page')).toBeInTheDocument();
  });
});

describe('ActivityJourneyChart — journey steps', () => {
  it('collapses repeat views of the same page but always keeps a click', () => {
    renderWithProviders(
      <ActivityJourneyChart
        events={[
          makeEvent({ title: 'Shop', target_label: 'Landed on shop' }),
          makeEvent({ title: 'Shop', target_label: 'Scrolled the shop' }),
          makeEvent({ title: 'Shop', event_type: 'CLICK', target_label: 'Add to cart' }),
          makeEvent({ title: 'Cart', target_label: 'Cart opened' }),
        ]}
      />,
    );

    expect(screen.getByText('Landed on shop')).toBeInTheDocument();
    // Second consecutive PAGE_VIEW on the same page is not a journey step.
    expect(screen.queryByText('Scrolled the shop')).toBeNull();
    expect(screen.getByText('Add to cart')).toBeInTheDocument();
    expect(screen.getByText('Cart opened')).toBeInTheDocument();
    expect(screen.getAllByText(/^(PAGE_VIEW|CLICK)$/)).toHaveLength(3);
  });

  it('caps the journey at twelve steps', () => {
    const events = Array.from({ length: 20 }, (_, index) => makeEvent({ title: `Page ${index}` }));
    renderWithProviders(<ActivityJourneyChart events={events} />);

    expect(screen.getAllByText('PAGE_VIEW')).toHaveLength(12);
    // Step 12 (the last kept one) still renders; step 13 onwards is dropped.
    expect(screen.getAllByText('Page 11').length).toBeGreaterThan(0);
    expect(screen.queryByText('Page 12')).toBeNull();
  });

  it('labels a step with target_label, then target_text, then the page name', () => {
    renderWithProviders(
      <ActivityJourneyChart
        events={[
          makeEvent({ title: 'Shop', target_label: 'Buy now', target_text: 'BUY NOW' }),
          makeEvent({ title: 'Cart', target_text: 'Checkout button' }),
          makeEvent({ title: 'Profile' }),
        ]}
      />,
    );

    expect(screen.getByText('Buy now')).toBeInTheDocument();
    expect(screen.queryByText('BUY NOW')).toBeNull();
    expect(screen.getByText('Checkout button')).toBeInTheDocument();
    // No target at all: the step falls back to the page name, so it appears in
    // both the card title and the caption.
    expect(screen.getAllByText('Profile')).toHaveLength(3);
  });

  it('gives each action type its own chip colour', () => {
    const theme = createTheme();
    renderWithProviders(
      <ActivityJourneyChart
        events={[
          makeEvent({ title: 'A', event_type: 'CLICK' }),
          makeEvent({ title: 'B', event_type: 'TOUCH' }),
          makeEvent({ title: 'C', event_type: 'PAGE_VIEW' }),
          makeEvent({ title: 'D', event_type: 'SCROLL' }),
        ]}
      />,
    );

    const chipBg = (label: string) => {
      const chip = screen.getByText(label).parentElement as HTMLElement;
      return globalThis.getComputedStyle(chip).backgroundColor;
    };
    expect(chipBg('CLICK')).toBe(hexToRgb(theme.palette.success.main));
    expect(chipBg('TOUCH')).toBe(hexToRgb(theme.palette.warning.main));
    expect(chipBg('PAGE_VIEW')).toBe(hexToRgb(theme.palette.info.main));
    // The unmapped action falls through to the neutral default chip.
    expect(new Set([chipBg('CLICK'), chipBg('TOUCH'), chipBg('PAGE_VIEW'), chipBg('SCROLL')]).size).toBe(4);
  });
});
