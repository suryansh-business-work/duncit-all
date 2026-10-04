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
    pod_end_date_time?: string | null;
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
  seats: 1,
  onSeatsChange: vi.fn(),
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
  it('offers Book now priced at the membership amount only (products are separate)', () => {
    const onPaidCheckout = vi.fn();
    renderPanel({ onPaidCheckout });
    expect(screen.getByText('Price')).toBeInTheDocument();
    expect(screen.getByTestId('pod-price')).toHaveTextContent('₹100');
    const cta = screen.getByRole('button', { name: 'Book now' });
    expect(cta).toBeEnabled();
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

  // Joining is closed the moment a pod STARTS, not once it is over — so the
  // warning must not tell somebody the pod "has already taken place" while it
  // is still running. Same panel, different sentence.
  it('says the pod is happening right now while it is still running', () => {
    renderPanel({
      pod: {
        ...baseProps.pod,
        pod_date_time: new Date(Date.now() - 3_600_000).toISOString(),
        pod_end_date_time: new Date(Date.now() + 3_600_000).toISOString(),
      },
    });
    expect(screen.getByText(/happening right now/i)).toBeInTheDocument();
    expect(screen.queryByText(/already taken place/i)).not.toBeInTheDocument();
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

  it('shows the booked state + Backout for a member who can back out', () => {
    const onBackout = vi.fn();
    renderPanel({
      membershipState: { is_member: true, can_backout: true, backout_deduction_pct: 15 },
      onBackout,
    });
    expect(screen.getByText("You're going")).toBeInTheDocument();
    expect(screen.getByTestId('pod-booked-label')).toHaveTextContent('Pod Booked');
    expect(screen.queryByRole('button', { name: 'Book now' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^backout$/i }));
    expect(onBackout).toHaveBeenCalledTimes(1);
    // The deduction is stated by the Backout dialog, not the bar.
    expect(screen.queryByText(/15% deduction/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId('pod-backout-maxed')).not.toBeInTheDocument();
  });

  it('tells a member of a past pod it has already taken place, not that attempts ran out', () => {
    renderPanel({
      pod: { ...baseProps.pod, pod_date_time: '2020-01-01T10:00:00Z' },
      membershipState: { is_member: true, can_backout: false },
    });
    expect(screen.getByTestId('pod-booked-label')).toHaveTextContent('Pod Visited');
    expect(screen.getByTestId('pod-backout-maxed')).toHaveTextContent('This pod has already taken place.');
    expect(screen.queryByText(/maximum number of Backout attempts/i)).not.toBeInTheDocument();
  });

  it('defaults the amount to 0 when pod_amount is missing', () => {
    renderPanel({ pod: { ...baseProps.pod, pod_amount: undefined } });
    expect(screen.getByTestId('pod-price')).toHaveTextContent('₹0');
    expect(screen.getByRole('button', { name: 'Book now' })).toBeEnabled();
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
    // The link rides inside `text` (targets that take `url` drop `text`).
    expect(arg.url).toBeUndefined();
    expect(arg.text).toContain('ref=tok-1');
  });

  it('offers a free-join CTA when the pod is free', () => {
    const onJoinFree = vi.fn();
    renderPanel({ isFree: true, onJoinFree });
    expect(screen.getByTestId('pod-price')).toHaveTextContent('Free');
    fireEvent.click(screen.getByRole('button', { name: 'Join' }));
    expect(onJoinFree).toHaveBeenCalledTimes(1);
  });

  it('disables the free-join CTA while joining', () => {
    renderPanel({ isFree: true, joining: true });
    expect(screen.getByRole('button', { name: 'Join' })).toBeDisabled();
  });

  it('shows "Pod is full" for a free pod that cannot be joined', () => {
    renderPanel({ isFree: true, membershipState: { can_join: false } });
    expect(screen.getByRole('button', { name: /pod is full/i })).toBeDisabled();
  });
});
