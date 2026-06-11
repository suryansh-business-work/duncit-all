import { fireEvent, screen } from '@testing-library/react-native';

import { PodBookingBar } from '@/components/details/PodBookingBar';
import type { PodDetail, PodMembershipState } from '@/hooks/useDetails';
import { renderWithProviders } from '@/utils/test-utils';

const pod = { id: 'p1', pod_amount: 200 } as unknown as PodDetail;
const ms = (over: Partial<NonNullable<PodMembershipState>>) =>
  ({ is_member: false, can_join: true, can_backout: false, ...over }) as PodMembershipState;

describe('PodBookingBar', () => {
  it('offers checkout for a bookable paid pod', () => {
    const onCheckout = jest.fn();
    renderWithProviders(
      <PodBookingBar
        pod={pod}
        isFree={false}
        membershipState={ms({})}
        onCheckout={onCheckout}
        onBackout={jest.fn()}
      />,
    );
    expect(screen.getByText('Book now')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('pod-book'));
    expect(onCheckout).toHaveBeenCalledTimes(1);
  });

  it('labels a free pod CTA as Join', () => {
    renderWithProviders(
      <PodBookingBar
        pod={pod}
        isFree
        membershipState={ms({})}
        onCheckout={jest.fn()}
        onBackout={jest.fn()}
      />,
    );
    expect(screen.getByText('Join')).toBeOnTheScreen();
    expect(screen.getByText('Free')).toBeOnTheScreen();
  });

  it('disables the CTA when the pod is full', () => {
    const onCheckout = jest.fn();
    renderWithProviders(
      <PodBookingBar
        pod={pod}
        isFree={false}
        membershipState={ms({ can_join: false })}
        onCheckout={onCheckout}
        onBackout={jest.fn()}
      />,
    );
    expect(screen.getByText('Pod is full')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('pod-book'));
    expect(onCheckout).not.toHaveBeenCalled();
  });

  it('shows Pod Booked + Backout for a member, and never the pay CTA', () => {
    const onBackout = jest.fn();
    renderWithProviders(
      <PodBookingBar
        pod={pod}
        isFree={false}
        membershipState={ms({ is_member: true, can_join: false, can_backout: true })}
        onCheckout={jest.fn()}
        onBackout={onBackout}
      />,
    );
    expect(screen.getByTestId('pod-booked-label')).toBeOnTheScreen();
    expect(screen.queryByTestId('pod-book')).toBeNull();
    fireEvent.press(screen.getByTestId('pod-backout'));
    expect(onBackout).toHaveBeenCalledTimes(1);
  });

  it('hides Backout when the member can no longer back out', () => {
    renderWithProviders(
      <PodBookingBar
        pod={pod}
        isFree={false}
        membershipState={ms({ is_member: true, can_backout: false })}
        onCheckout={jest.fn()}
        onBackout={jest.fn()}
      />,
    );
    expect(screen.getByTestId('pod-booked-label')).toBeOnTheScreen();
    expect(screen.queryByTestId('pod-backout')).toBeNull();
  });

  it('replaces the CTA with a closed notice for a past-date pod', () => {
    const expiredPod = {
      id: 'p1',
      pod_amount: 200,
      pod_date_time: '2020-01-01T10:00:00Z',
    } as unknown as PodDetail;
    renderWithProviders(
      <PodBookingBar
        pod={expiredPod}
        isFree={false}
        membershipState={ms({})}
        onCheckout={jest.fn()}
        onBackout={jest.fn()}
      />,
    );
    expect(screen.getByTestId('pod-booking-closed')).toBeOnTheScreen();
    expect(screen.queryByTestId('pod-book')).toBeNull();
  });

  it('still shows Pod Booked for a member even after the pod date passes', () => {
    const expiredPod = {
      id: 'p1',
      pod_amount: 200,
      pod_date_time: '2020-01-01T10:00:00Z',
    } as unknown as PodDetail;
    renderWithProviders(
      <PodBookingBar
        pod={expiredPod}
        isFree={false}
        membershipState={ms({ is_member: true, can_backout: false })}
        onCheckout={jest.fn()}
        onBackout={jest.fn()}
      />,
    );
    expect(screen.getByTestId('pod-booked-label')).toBeOnTheScreen();
    expect(screen.queryByTestId('pod-booking-closed')).toBeNull();
  });
});
