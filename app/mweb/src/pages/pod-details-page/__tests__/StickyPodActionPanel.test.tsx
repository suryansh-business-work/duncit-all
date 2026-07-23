import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import StickyPodActionPanel from '../StickyPodActionPanel';

const baseProps = {
  pod: { pod_amount: 100, pod_title: 'Sunset Jam', club_slug: 's', pod_id: 'pod-1' },
  isFree: false,
  isHost: false,
  priceFormat: (n: number) => `₹${n}`,
  membershipState: null as any,
  joining: false,
  backingOut: false,
  restoringSpot: false,
  onJoinFree: vi.fn(),
  onBackout: vi.fn(),
  onKeepSpot: vi.fn(),
  onPaidCheckout: vi.fn(),
  onCopyReferral: vi.fn(),
  onGoToDashboard: vi.fn(),
};

const renderPanel = (overrides: Partial<typeof baseProps> = {}) =>
  render(<StickyPodActionPanel {...baseProps} {...overrides} />);

afterEach(() => {
  vi.clearAllMocks();
});

describe('StickyPodActionPanel', () => {
  it('renders the inner PodActionPanel booking CTA and forwards props', () => {
    const onPaidCheckout = vi.fn();
    renderPanel({ onPaidCheckout });
    const cta = screen.getByRole('button', { name: /book & pay ₹100/i });
    expect(cta).toBeInTheDocument();
    fireEvent.click(cta);
    expect(onPaidCheckout).toHaveBeenCalledTimes(1);
  });

  it('forwards the host branch to the inner panel', () => {
    const onGoToDashboard = vi.fn();
    renderPanel({ isHost: true, onGoToDashboard });
    fireEvent.click(screen.getByRole('button', { name: /go to dashboard/i }));
    expect(onGoToDashboard).toHaveBeenCalledTimes(1);
  });

  it('forwards the free-join branch to the inner panel', () => {
    const onJoinFree = vi.fn();
    renderPanel({ isFree: true, onJoinFree });
    fireEvent.click(screen.getByRole('button', { name: /join free pod/i }));
    expect(onJoinFree).toHaveBeenCalledTimes(1);
  });
});
