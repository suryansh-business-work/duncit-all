import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import PodActionPanel from '../PodActionPanel';

const baseProps = {
  pod: { pod_amount: 100, pod_title: 'Sunset Jam', club_slug: 's', pod_id: 'pod-1' },
  isFree: false,
  isHost: false,
  priceFormat: (n: number) => `₹${n}`,
  membershipState: null,
  joining: false,
  backingOut: false,
  restoringSpot: false,
  selectedProductTotal: 0,
  onJoinFree: vi.fn(),
  onBackout: vi.fn(),
  onKeepSpot: vi.fn(),
  onPaidCheckout: vi.fn(),
  onCopyReferral: vi.fn(),
  onGoToDashboard: vi.fn(),
};

describe('PodActionPanel', () => {
  it('offers Book & Pay to a non-host viewer', () => {
    render(<PodActionPanel {...baseProps} />);
    expect(screen.getByRole('button', { name: /book & pay/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /go to dashboard/i })).not.toBeInTheDocument();
  });

  it('replaces the booking CTA with Go to Dashboard for the pod host', () => {
    const onGoToDashboard = vi.fn();
    render(<PodActionPanel {...baseProps} isHost onGoToDashboard={onGoToDashboard} />);
    expect(screen.queryByRole('button', { name: /book & pay/i })).not.toBeInTheDocument();
    const cta = screen.getByRole('button', { name: /go to dashboard/i });
    fireEvent.click(cta);
    expect(onGoToDashboard).toHaveBeenCalledTimes(1);
  });

  it('keeps Go to Dashboard for the host even when the pod date has passed', () => {
    render(
      <PodActionPanel
        {...baseProps}
        isHost
        pod={{ ...baseProps.pod, pod_date_time: '2020-01-01T10:00:00Z' }}
      />,
    );
    expect(screen.getByRole('button', { name: /go to dashboard/i })).toBeInTheDocument();
    expect(screen.queryByText(/booking is closed/i)).not.toBeInTheDocument();
  });
});
