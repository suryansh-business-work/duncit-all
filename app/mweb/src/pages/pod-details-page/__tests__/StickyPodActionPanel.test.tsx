import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import StickyPodActionPanel from '../StickyPodActionPanel';

const baseProps = {
  pod: { pod_amount: 100, pod_title: 'Sunset Jam', club_slug: 's', pod_id: 'pod-1' } as {
    pod_amount: number;
    pod_title: string;
    club_slug: string;
    pod_id: string;
    pod_date_time?: string;
    pod_end_date_time?: string;
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
  render(<StickyPodActionPanel {...baseProps} {...overrides} />);

afterEach(() => {
  vi.clearAllMocks();
});

describe('StickyPodActionPanel', () => {
  it('renders the inner PodActionPanel booking CTA and forwards props', () => {
    const onPaidCheckout = vi.fn();
    renderPanel({ onPaidCheckout });
    expect(screen.getByTestId('pod-price')).toHaveTextContent('₹100');
    const cta = screen.getByRole('button', { name: /^book now$/i });
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
    expect(screen.getByTestId('pod-price')).toHaveTextContent(/^free$/i);
    fireEvent.click(screen.getByRole('button', { name: /^join$/i }));
    expect(onJoinFree).toHaveBeenCalledTimes(1);
  });

  describe('a pod that has started but not ended', () => {
    const ongoingPod = {
      ...baseProps.pod,
      pod_date_time: new Date(Date.now() - 3_600_000).toISOString(),
      pod_end_date_time: new Date(Date.now() + 3_600_000).toISOString(),
    };

    it('asks "already ongoing" before a free join, and joins only on Yes', () => {
      const onJoinFree = vi.fn();
      renderPanel({ isFree: true, onJoinFree, pod: ongoingPod });
      fireEvent.click(screen.getByRole('button', { name: /^join$/i }));
      expect(onJoinFree).not.toHaveBeenCalled();
      expect(screen.getByTestId('ongoing-join-dialog-title')).toHaveTextContent('This pod is already ongoing');
      expect(screen.getByText('This pod has already started. Do you still want to join?')).toBeInTheDocument();
      fireEvent.click(screen.getByTestId('ongoing-join-dialog-confirm'));
      expect(onJoinFree).toHaveBeenCalledTimes(1);
    });

    it('asks before a paid checkout too, and Cancel books nothing', () => {
      const onPaidCheckout = vi.fn();
      renderPanel({ onPaidCheckout, pod: ongoingPod });
      fireEvent.click(screen.getByRole('button', { name: /^book now$/i }));
      expect(screen.getByTestId('ongoing-join-dialog')).toBeInTheDocument();
      fireEvent.click(screen.getByTestId('ongoing-join-dialog-cancel'));
      expect(onPaidCheckout).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole('button', { name: /^book now$/i }));
      fireEvent.click(screen.getByTestId('ongoing-join-dialog-confirm'));
      expect(onPaidCheckout).toHaveBeenCalledTimes(1);
    });

    it('does not ask for an upcoming pod', () => {
      const onJoinFree = vi.fn();
      renderPanel({
        isFree: true,
        onJoinFree,
        pod: { ...baseProps.pod, pod_date_time: new Date(Date.now() + 3_600_000).toISOString() },
      });
      fireEvent.click(screen.getByRole('button', { name: /^join$/i }));
      expect(onJoinFree).toHaveBeenCalledTimes(1);
      expect(screen.queryByTestId('ongoing-join-dialog')).not.toBeInTheDocument();
    });
  });
});
