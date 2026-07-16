import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import OrderTrackingTimeline from '../../src/pages/orders/OrderTrackingTimeline';

vi.mock('@duncit/app-settings', () => ({
  useDateFormat: () => ({ formatDateTime: (v: unknown) => (v ? 'DT' : '') }),
}));

describe('OrderTrackingTimeline', () => {
  it('shows an empty message with no events', () => {
    render(<OrderTrackingTimeline events={[]} />);
    expect(screen.getByText(/No tracking updates yet/i)).toBeInTheDocument();
  });

  it('handles a null events prop', () => {
    render(<OrderTrackingTimeline events={null as any} />);
    expect(screen.getByText(/No tracking updates yet/i)).toBeInTheDocument();
  });

  it('renders each event with an optional note and a location · date line', () => {
    render(
      <OrderTrackingTimeline
        events={[
          { status: 'SHIPPED', note: 'Left hub', location: 'Pune', at: '2026-01-01T00:00:00Z' },
          { status: 'PENDING', at: null },
        ]}
      />,
    );
    expect(screen.getByText('SHIPPED')).toBeInTheDocument();
    expect(screen.getByText('Left hub')).toBeInTheDocument();
    // location + formatted date joined by a middot.
    expect(screen.getByText('Pune · DT')).toBeInTheDocument();
    expect(screen.getByText('PENDING')).toBeInTheDocument();
  });
});
