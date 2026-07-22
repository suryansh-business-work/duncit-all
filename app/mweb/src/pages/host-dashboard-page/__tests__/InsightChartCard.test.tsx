import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import InsightChartCard from '../InsightChartCard';

describe('InsightChartCard', () => {
  it('renders title, subtitle, action and children when not empty', () => {
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
    expect(screen.getByText('Last 30 days')).toBeInTheDocument();
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
