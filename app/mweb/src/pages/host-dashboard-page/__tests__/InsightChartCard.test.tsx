import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import InsightChartCard from '../InsightChartCard';

describe('InsightChartCard', () => {
  it('renders title, action and children when not empty, without drawing the subtitle', () => {
    render(
      <InsightChartCard
        title="Earnings over time"
        subtitle="Last 30 days"
        empty={false}
        action={<button type="button">Filter</button>}
      >
        <div>chart body</div>
      </InsightChartCard>,
    );
    expect(screen.getByText('Earnings over time')).toBeInTheDocument();
    // The subtitle prop is still accepted but intentionally not rendered.
    expect(screen.queryByText('Last 30 days')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Filter' })).toBeInTheDocument();
    expect(screen.getByText('chart body')).toBeInTheDocument();
    expect(screen.queryByText('No data available')).not.toBeInTheDocument();
  });

  it('shows the empty state and hides children when empty', () => {
    render(
      <InsightChartCard title="Pods" empty>
        <div>hidden chart</div>
      </InsightChartCard>,
    );
    expect(screen.getByText('Pods')).toBeInTheDocument();
    expect(screen.getByTestId('insight-card-empty')).toBeInTheDocument();
    expect(screen.getByText('No data available')).toBeInTheDocument();
    expect(screen.queryByText('hidden chart')).not.toBeInTheDocument();
  });

  it('omits the subtitle when not provided', () => {
    render(
      <InsightChartCard title="Only title" empty={false}>
        <span>content</span>
      </InsightChartCard>,
    );
    expect(screen.getByText('Only title')).toBeInTheDocument();
    expect(screen.getByText('content')).toBeInTheDocument();
    expect(screen.queryByText('Last 30 days')).not.toBeInTheDocument();
  });
});
