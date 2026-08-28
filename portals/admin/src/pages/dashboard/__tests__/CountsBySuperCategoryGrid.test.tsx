import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import CountsBySuperCategoryGrid from '../CountsBySuperCategoryGrid';

// react-chartjs-2's Doughnut throws under jsdom (chart.js's resize/layout code
// reads canvas internals jsdom does not implement). Stub only the rendering
// primitive so the REAL data transformation in CountsBySuperCategoryGrid (the
// labels/values/backgroundColor built from `counts`) still runs and can be
// asserted on, without ever touching chart.js's canvas path.
vi.mock('react-chartjs-2', () => ({
  Doughnut: (props: { data: unknown; options: unknown }) => (
    <div data-testid="chart">
      <pre data-testid="chart-props">{JSON.stringify({ data: props.data, options: props.options })}</pre>
    </div>
  ),
}));

interface ChartProps {
  data: { labels: string[]; datasets: [{ data: number[]; backgroundColor: string[] }] };
  options: {
    cutout: string;
    responsive: boolean;
    maintainAspectRatio: boolean;
    plugins: { legend: { display: boolean } };
  };
}

const chartProps = (): ChartProps => JSON.parse(screen.getByTestId('chart-props').textContent ?? '{}');

describe('CountsBySuperCategoryGrid', () => {
  it('shows the empty-state message and an empty chart when there are no categories', () => {
    render(<CountsBySuperCategoryGrid counts={[]} />);
    expect(screen.getByText('No super categories yet.')).toBeInTheDocument();
    const { data } = chartProps();
    expect(data.labels).toEqual([]);
    expect(data.datasets[0].data).toEqual([]);
  });

  it('labels each slice by its category name and maps its count into the chart data and the tiles', () => {
    render(
      <CountsBySuperCategoryGrid
        counts={[
          { super_category_slug: 'fitness', super_category_name: 'Fitness', count: 12 },
          { super_category_slug: 'food', super_category_name: 'Food & Drink', count: 7 },
        ]}
      />,
    );
    expect(screen.queryByText('No super categories yet.')).not.toBeInTheDocument();
    const { data } = chartProps();
    expect(data.labels).toEqual(['Fitness', 'Food & Drink']);
    expect(data.datasets[0].data).toEqual([12, 7]);
    expect(screen.getByText('Fitness')).toBeInTheDocument();
    expect(screen.getByText('Food & Drink')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('falls back to the slug for both the chart label and the tile when a category has no name', () => {
    render(
      <CountsBySuperCategoryGrid
        counts={[{ super_category_slug: 'fitness', super_category_name: null, count: 3 }]}
      />,
    );
    const { data } = chartProps();
    expect(data.labels).toEqual(['fitness']);
    expect(screen.getAllByText('fitness').length).toBeGreaterThan(0);
  });

  it('falls back to "Uncategorised" when a category has neither a name nor a slug', () => {
    render(
      <CountsBySuperCategoryGrid counts={[{ super_category_slug: null, super_category_name: null, count: 5 }]} />,
    );
    const { data } = chartProps();
    expect(data.labels).toEqual(['Uncategorised']);
    expect(screen.getAllByText('Uncategorised').length).toBeGreaterThan(0);
  });

  it('cycles the 6-colour palette once the category count exceeds it', () => {
    const counts = Array.from({ length: 7 }, (_, i) => ({
      super_category_slug: `cat-${i}`,
      super_category_name: `Cat ${i}`,
      count: i + 1,
    }));
    render(<CountsBySuperCategoryGrid counts={counts} />);
    const { data } = chartProps();
    expect(data.datasets[0].backgroundColor).toHaveLength(7);
    // The 7th slice (index 6) wraps back to the palette's first colour.
    expect(data.datasets[0].backgroundColor[6]).toBe(data.datasets[0].backgroundColor[0]);
  });

  it('sets the static doughnut chart options', () => {
    render(<CountsBySuperCategoryGrid counts={[{ super_category_slug: 'x', super_category_name: 'X', count: 1 }]} />);
    const { options } = chartProps();
    expect(options.cutout).toBe('68%');
    expect(options.responsive).toBe(true);
    expect(options.maintainAspectRatio).toBe(false);
    expect(options.plugins.legend.display).toBe(false);
  });

  it('renders without error when a custom fallback color is supplied', () => {
    render(
      <CountsBySuperCategoryGrid
        counts={[{ super_category_slug: 'x', super_category_name: 'X', count: 1 }]}
        color="#000000"
      />,
    );
    expect(screen.getByText('X')).toBeInTheDocument();
  });
});
