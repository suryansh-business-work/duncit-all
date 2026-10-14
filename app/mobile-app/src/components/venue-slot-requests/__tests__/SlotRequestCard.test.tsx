import { fireEvent, screen } from '@testing-library/react-native';

import { SlotRequestCard } from '@/components/venue-slot-requests/SlotRequestCard';
import type { SlotRequestRow } from '@/hooks/useVenueSlotRequests';
import { renderWithProviders } from '@/utils/test-utils';

const request = (over: Partial<SlotRequestRow> = {}): SlotRequestRow => ({
  slot_id: 'slot-1',
  venue_id: 'venue-1',
  venue_name: 'Indiranagar Courts',
  start_at: '2026-09-02T10:00:00.000Z',
  end_at: '2026-09-02T12:00:00.000Z',
  whole_day: false,
  price: 1200,
  requested_at: '2026-08-25T09:00:00.000Z',
  pod_id: 'pod-1',
  pod_title: 'Sunday Badminton',
  pod_description: 'Doubles at Court 2.',
  host_name: 'Meera N',
  host_email: 'meera@duncit.com',
  host_phone: '9000000001',
  pod_is_free: false,
  ...over,
});

const mount = (row: SlotRequestRow) => {
  const spies = { onApprove: jest.fn(), onDecline: jest.fn() };
  renderWithProviders(<SlotRequestCard request={row} busy={false} {...spies} />);
  return spies;
};

describe('SlotRequestCard', () => {
  it('quotes a paid pod’s slot price, with no free-pod notice', () => {
    mount(request());
    expect(screen.getByText('Slot price')).toBeOnTheScreen();
    expect(screen.getByText(/1,200/)).toBeOnTheScreen();
    expect(screen.queryByTestId('slot-request-free-pod-notice')).toBeNull();
  });

  it('tells the owner to settle a free pod with the host, and quotes no price', () => {
    const spies = mount(request({ pod_is_free: true, price: 0 }));
    const notice = screen.getByTestId('slot-request-free-pod-notice');
    expect(notice.props.role).toBe('status');
    expect(screen.getByText('This pod is free')).toBeOnTheScreen();
    expect(
      screen.getByText(/Please do not confirm the slot until the host has called you/),
    ).toBeOnTheScreen();
    expect(screen.queryByText('Slot price')).toBeNull();
    expect(screen.queryByText(/₹/)).toBeNull();
    // The host's contact stays on the card, and the decision stays open.
    expect(screen.getByText('meera@duncit.com · 9000000001')).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Approve'));
    expect(spies.onApprove).toHaveBeenCalledWith(expect.objectContaining({ slot_id: 'slot-1' }));
  });
});
