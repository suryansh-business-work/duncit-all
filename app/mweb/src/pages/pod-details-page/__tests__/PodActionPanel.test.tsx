import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import PodActionPanel from '../PodActionPanel';

const baseProps = {
  pod: { pod_amount: 100, pod_title: 'Sunset Jam', club_slug: 's', pod_id: 'pod-1' } as {
    pod_amount?: number;
    pod_title: string;
    club_slug: string;
    pod_id: string;
    pod_date_time?: string;
  },
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
  render(<PodActionPanel {...baseProps} {...overrides} />);

afterEach(() => {
  vi.clearAllMocks();
  // reset navigator.share between tests
  delete (navigator as any).share;
});

describe('PodActionPanel', () => {
  it('offers Book & Pay for the membership amount only (products are separate)', () => {
    const onPaidCheckout = vi.fn();
    renderPanel({ onPaidCheckout });
    const cta = screen.getByRole('button', { name: /book & pay ₹100/i });
    expect(cta).toBeInTheDocument();
    fireEvent.click(cta);
    expect(onPaidCheckout).toHaveBeenCalledTimes(1);
  });

  it('disables the paid CTA and shows "Pod is full" when can_join is false', () => {
    renderPanel({ membershipState: { can_join: false } });
    const cta = screen.getByRole('button', { name: /pod is full/i });
    expect(cta).toBeDisabled();
  });

  it('replaces the booking CTA with Go to Dashboard for the pod host', () => {
    const onGoToDashboard = vi.fn();
    renderPanel({ isHost: true, onGoToDashboard });
    expect(screen.queryByRole('button', { name: /book & pay/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /go to dashboard/i }));
    expect(onGoToDashboard).toHaveBeenCalledTimes(1);
  });

  it('keeps Go to Dashboard for the host even when the pod date has passed', () => {
    renderPanel({ isHost: true, pod: { ...baseProps.pod, pod_date_time: '2020-01-01T10:00:00Z' } });
    expect(screen.getByRole('button', { name: /go to dashboard/i })).toBeInTheDocument();
    expect(screen.queryByText(/booking is closed/i)).not.toBeInTheDocument();
  });

  it('shows a booking-closed warning once the pod date has passed for a non-member', () => {
    renderPanel({ pod: { ...baseProps.pod, pod_date_time: '2020-01-01T10:00:00Z' } });
    expect(screen.getByText(/booking is closed/i)).toBeInTheDocument();
  });

  it('renders the backout-in-process panel and fires Keep My Spot', () => {
    const onKeepSpot = vi.fn();
    renderPanel({
      membershipState: { backout_in_process: true, can_cancel_backout: true },
      onKeepSpot,
    });
    fireEvent.click(screen.getByRole('button', { name: /keep my spot/i }));
    expect(onKeepSpot).toHaveBeenCalledTimes(1);
  });

  it('shows the non-cancellable backout message when can_cancel_backout is false', () => {
    renderPanel({ membershipState: { backout_in_process: true, can_cancel_backout: false } });
    expect(screen.getByText(/can no longer be cancelled/i)).toBeInTheDocument();
  });

  it('shows Joined + Backout for a member who can back out', () => {
    const onBackout = vi.fn();
    renderPanel({
      membershipState: { is_member: true, can_backout: true, backout_deduction_pct: 15 },
      onBackout,
    });
    expect(screen.getByRole('button', { name: /joined/i })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /^backout$/i }));
    expect(onBackout).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/15% deduction/i)).toBeInTheDocument();
  });

  it('defaults the deduction to 0% when backout_deduction_pct is missing', () => {
    renderPanel({ membershipState: { is_member: true, can_backout: true } });
    expect(screen.getByText(/0% deduction/i)).toBeInTheDocument();
  });

  it('defaults the amount to 0 when pod_amount is missing', () => {
    renderPanel({ pod: { ...baseProps.pod, pod_amount: undefined } });
    expect(screen.getByRole('button', { name: /book & pay ₹0/i })).toBeInTheDocument();
  });

  it('shows the max-attempts alert for a member who can no longer back out', () => {
    renderPanel({ membershipState: { is_member: true, can_backout: false } });
    expect(screen.getByText(/maximum number of Backout attempts/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^backout$/i })).not.toBeInTheDocument();
  });

  it('offers a referral copy button after a BACKED_OUT booking', () => {
    const onCopyReferral = vi.fn();
    renderPanel({
      membershipState: {
        membership: { status: 'BACKED_OUT', referral_token: 'tok-9', refund_status: 'PENDING' },
      },
      onCopyReferral,
    });
    expect(screen.getByText(/PENDING/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /copy referral link/i }));
    expect(onCopyReferral).toHaveBeenCalledWith('tok-9');
    // no Web Share API available -> Share button hidden
    expect(screen.queryByRole('button', { name: /^share$/i })).not.toBeInTheDocument();
  });

  it('renders a Share button that calls navigator.share when supported', () => {
    const share = vi.fn();
    (navigator as any).share = share;
    renderPanel({
      pod: { ...baseProps.pod, pod_date_time: undefined },
      membershipState: {
        membership: { status: 'BACKED_OUT', referral_token: 'tok-1', refund_status: 'PENDING' },
      },
    });
    fireEvent.click(screen.getByRole('button', { name: /^share$/i }));
    expect(share).toHaveBeenCalledTimes(1);
    const arg = share.mock.calls[0][0];
    expect(arg.title).toBe('Sunset Jam');
    expect(arg.url).toContain('ref=tok-1');
  });

  it('offers a free-join CTA when the pod is free', () => {
    const onJoinFree = vi.fn();
    renderPanel({ isFree: true, onJoinFree });
    fireEvent.click(screen.getByRole('button', { name: /join free pod/i }));
    expect(onJoinFree).toHaveBeenCalledTimes(1);
  });

  it('disables the free-join CTA while joining', () => {
    renderPanel({ isFree: true, joining: true });
    expect(screen.getByRole('button', { name: /join free pod/i })).toBeDisabled();
  });

  it('shows "Pod is full" for a free pod that cannot be joined', () => {
    renderPanel({ isFree: true, membershipState: { can_join: false } });
    expect(screen.getByRole('button', { name: /pod is full/i })).toBeDisabled();
  });
});
