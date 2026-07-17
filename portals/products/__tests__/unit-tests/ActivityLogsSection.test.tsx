import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ActivityLogsSection from '../../src/pages/inventory-page/inventory-product-page/ActivityLogsSection';

// The section renders the analytics chart; stub chart.js to keep jsdom happy.
vi.mock('chart.js', () => {
  class Chart {
    static register = vi.fn();
    update = vi.fn();
    destroy = vi.fn();
  }
  return {
    Chart,
    BarController: {},
    BarElement: {},
    CategoryScale: {},
    LinearScale: {},
    Tooltip: {},
    Legend: {},
  };
});

const log = (over: Record<string, unknown> = {}) => ({
  id: 'l1',
  user_name: 'Asha',
  action: 'UPDATE',
  changed_fields: ['price'],
  notes: '',
  created_at: '2026-01-01T00:00:00.000Z',
  ...over,
});

describe('ActivityLogsSection', () => {
  it('prompts to save first for a new product', () => {
    render(<ActivityLogsSection logs={[]} movements={[]} analytics={[]} loading={false} isNew />);
    expect(screen.getByText(/Save the product first/i)).toBeInTheDocument();
  });

  it('shows the empty logs message for a saved product with no logs', () => {
    render(
      <ActivityLogsSection logs={[]} movements={[]} analytics={[]} loading={false} isNew={false} />,
    );
    expect(screen.getByText(/No activity logged yet/i)).toBeInTheDocument();
  });

  it('renders changed-fields and note-only logs', () => {
    render(
      <ActivityLogsSection
        logs={[
          log({ id: 'a', changed_fields: ['price', 'sku'] }),
          log({ id: 'b', changed_fields: [], notes: 'Manual fix', user_name: '' }),
        ]}
        movements={[]}
        analytics={[]}
        loading={false}
        isNew={false}
      />,
    );
    expect(screen.getByText(/Changed: price, sku/)).toBeInTheDocument();
    expect(screen.getByText('Manual fix')).toBeInTheDocument();
  });

  it('renders a fallback when a log has neither fields nor notes', () => {
    render(
      <ActivityLogsSection
        logs={[log({ changed_fields: [], notes: '', user_name: '' })]}
        movements={[]}
        analytics={[]}
        loading={false}
        isNew={false}
      />,
    );
    expect(screen.getByText(/No additional detail/i)).toBeInTheDocument();
  });
});
