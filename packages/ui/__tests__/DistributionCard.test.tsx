import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DistributionCard } from '../src/DistributionCard';

describe('DistributionCard', () => {
  it('shows a no-data message for empty buckets', () => {
    render(<DistributionCard title="By level" buckets={[]} />);
    expect(screen.getByText('No data in this range.')).toBeInTheDocument();
  });

  it('says what the caller asked for when the range is empty', () => {
    render(<DistributionCard title="Error codes" buckets={[]} emptyText="No errors in this range." />);
    expect(screen.getByText('No errors in this range.')).toBeInTheDocument();
    expect(screen.queryByText('No data in this range.')).not.toBeInTheDocument();
  });

  it('renders a bar per bucket', () => {
    render(
      <DistributionCard
        title="By source"
        buckets={[
          { key: 'mweb', count: 80 },
          { key: 'server', count: 20 },
        ]}
      />,
    );
    expect(screen.getByText('mweb')).toBeInTheDocument();
    expect(screen.getByText('80')).toBeInTheDocument();
    expect(screen.getByText('server')).toBeInTheDocument();
  });

  it('guards the max divisor with 1 when every bucket is zero', () => {
    render(<DistributionCard title="By env" buckets={[{ key: 'production', count: 0 }]} />);
    expect(screen.getByText('production')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});
