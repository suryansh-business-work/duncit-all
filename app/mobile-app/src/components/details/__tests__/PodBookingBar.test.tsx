import { fireEvent, screen } from '@testing-library/react-native';

import { PodBookingBar } from '@/components/details/PodBookingBar';
import type { PodDetail, PodMembershipState } from '@/hooks/useDetails';
import { renderWithProviders } from '@/utils/test-utils';

const pod = { id: 'p1', pod_amount: 200 } as unknown as PodDetail;
const ms = (over: Partial<NonNullable<PodMembershipState>>) =>
  ({
    is_member: false,
    can_join: true,
    can_backout: false,
    backout_in_process: false,
    can_cancel_backout: false,
    ...over,
  }) as PodMembershipState;

const renderBar = (props: Partial<Parameters<typeof PodBookingBar>[0]> = {}) =>
  renderWithProviders(
    <PodBookingBar
      pod={pod}
      isFree={false}
      isHost={false}
      membershipState={ms({})}
      onCheckout={jest.fn()}
      onBackout={jest.fn()}
      onKeepSpot={jest.fn()}
      onGoToDashboard={jest.fn()}
      {...props}
    />,
  );

describe('PodBookingBar', () => {
  it('offers checkout for a bookable paid pod', () => {
    const onCheckout = jest.fn();
    renderBar({ onCheckout });
    expect(screen.getByText('Book now')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('pod-book'));
    expect(onCheckout).toHaveBeenCalledTimes(1);
  });

  it('labels a free pod CTA as Join', () => {
    renderBar({ isFree: true });
    expect(screen.getByText('Join')).toBeOnTheScreen();
    expect(screen.getByText('Free')).toBeOnTheScreen();
  });

  it('disables the CTA when the pod is full', () => {
    const onCheckout = jest.fn();
    renderBar({ onCheckout, membershipState: ms({ can_join: false }) });
    expect(screen.getByText('Pod is full')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('pod-book'));
    expect(onCheckout).not.toHaveBeenCalled();
  });

  it('shows Pod Booked + Backout for a member, and never the pay CTA', () => {
    const onBackout = jest.fn();
    renderBar({
      onBackout,
      membershipState: ms({ is_member: true, can_join: false, can_backout: true }),
    });
    expect(screen.getByTestId('pod-booked-label')).toBeOnTheScreen();
    expect(screen.queryByTestId('pod-book')).toBeNull();
    fireEvent.press(screen.getByTestId('pod-backout'));
    expect(onBackout).toHaveBeenCalledTimes(1);
  });

  it('hides Backout and explains the exhausted attempt limit', () => {
    renderBar({ membershipState: ms({ is_member: true, can_backout: false }) });
    expect(screen.getByTestId('pod-booked-label')).toBeOnTheScreen();
    expect(screen.queryByTestId('pod-backout')).toBeNull();
    expect(screen.getByTestId('pod-backout-maxed')).toBeOnTheScreen();
  });

  it('offers Keep My Spot while a backout is in process', () => {
    const onKeepSpot = jest.fn();
    renderBar({
      onKeepSpot,
      membershipState: ms({ backout_in_process: true, can_cancel_backout: true, can_join: false }),
    });
    expect(screen.getByTestId('pod-backout-in-process')).toBeOnTheScreen();
    expect(screen.queryByTestId('pod-book')).toBeNull();
    expect(screen.queryByTestId('pod-booked-label')).toBeNull();
    fireEvent.press(screen.getByTestId('pod-keep-spot'));
    expect(onKeepSpot).toHaveBeenCalledTimes(1);
  });

  it('locks the backout once a replacement is confirmed', () => {
    renderBar({
      membershipState: ms({ backout_in_process: true, can_cancel_backout: false, can_join: false }),
    });
    expect(screen.getByTestId('pod-backout-locked')).toBeOnTheScreen();
    expect(screen.queryByTestId('pod-keep-spot')).toBeNull();
  });

  it('keeps the in-process bar even after the pod date passes', () => {
    const expiredPod = {
      id: 'p1',
      pod_amount: 200,
      pod_date_time: '2020-01-01T10:00:00Z',
    } as unknown as PodDetail;
    renderBar({
      pod: expiredPod,
      membershipState: ms({ backout_in_process: true, can_cancel_backout: true, can_join: false }),
    });
    expect(screen.getByTestId('pod-backout-in-process')).toBeOnTheScreen();
    expect(screen.queryByTestId('pod-booking-closed')).toBeNull();
  });

  it('replaces the CTA with a closed notice for a past-date pod', () => {
    const expiredPod = {
      id: 'p1',
      pod_amount: 200,
      pod_date_time: '2020-01-01T10:00:00Z',
    } as unknown as PodDetail;
    renderBar({ pod: expiredPod });
    expect(screen.getByTestId('pod-booking-closed')).toBeOnTheScreen();
    expect(screen.queryByTestId('pod-book')).toBeNull();
  });

  it('still shows Pod Booked for a member even after the pod date passes', () => {
    const expiredPod = {
      id: 'p1',
      pod_amount: 200,
      pod_date_time: '2020-01-01T10:00:00Z',
    } as unknown as PodDetail;
    renderBar({
      pod: expiredPod,
      membershipState: ms({ is_member: true, can_backout: false }),
    });
    expect(screen.getByTestId('pod-booked-label')).toBeOnTheScreen();
    expect(screen.queryByTestId('pod-booking-closed')).toBeNull();
  });

  it('swaps the booking CTA for Go to Dashboard when the viewer hosts this pod', () => {
    const onGoToDashboard = jest.fn();
    const onCheckout = jest.fn();
    renderBar({ isHost: true, onGoToDashboard, onCheckout });
    expect(screen.getByText('Go to Dashboard')).toBeOnTheScreen();
    expect(screen.queryByTestId('pod-book')).toBeNull();
    fireEvent.press(screen.getByTestId('pod-go-dashboard'));
    expect(onGoToDashboard).toHaveBeenCalledTimes(1);
    expect(onCheckout).not.toHaveBeenCalled();
  });

  it('keeps Go to Dashboard for the host even on a past-date or in-process pod', () => {
    const expiredPod = {
      id: 'p1',
      pod_amount: 200,
      pod_date_time: '2020-01-01T10:00:00Z',
    } as unknown as PodDetail;
    renderBar({
      pod: expiredPod,
      isHost: true,
      membershipState: ms({ is_member: true, backout_in_process: true, can_cancel_backout: true }),
    });
    expect(screen.getByTestId('pod-go-dashboard')).toBeOnTheScreen();
    expect(screen.queryByTestId('pod-booking-closed')).toBeNull();
    expect(screen.queryByTestId('pod-backout-in-process')).toBeNull();
    expect(screen.queryByTestId('pod-booked-label')).toBeNull();
  });
});
