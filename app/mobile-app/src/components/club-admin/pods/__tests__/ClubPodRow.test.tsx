import { fireEvent, screen } from '@testing-library/react-native';
import { formatMoney } from '@duncit/utils';

import type { ClubAdminPodRow } from '@/hooks/useClubAdminPods';
import { renderWithProviders } from '@/utils/test-utils';
import { ClubPodRow } from '../ClubPodRow';

jest.mock('@/hooks/useTranslation', () => {
  const t = (key: string) => key;
  return { useTranslation: () => ({ t }) };
});
jest.mock('@/hooks/usePublicFinance', () => ({ usePublicFinance: () => ({ currency: '₹' }) }));

const podOf = (patch: Record<string, unknown> = {}) =>
  ({
    id: 'p1',
    pod_title: 'Sunday Smash',
    is_active: true,
    is_deleted: false,
    completed_at: null,
    venue_approval_status: null,
    place_label: 'Gomti Nagar, Lucknow',
    seats_taken: 6,
    no_of_spots: 10,
    host_names: ['Asha', 'Bo'],
    pod_type: 'PAID',
    pod_amount: 250,
    attendance: { recorded: true, attended_seats: 4, booked_seats: 6 },
    ...patch,
  }) as unknown as ClubAdminPodRow;

const mount = (pod: ClubAdminPodRow) => {
  const onOpen = jest.fn();
  const onActions = jest.fn();
  renderWithProviders(
    <ClubPodRow pod={pod} when="9 Jan, 6 PM" testID="row" onOpen={onOpen} onActions={onActions} />,
  );
  return { onOpen, onActions };
};

describe('ClubPodRow', () => {
  it('shows the title, status, when and place', () => {
    mount(podOf());
    expect(screen.getByText('Sunday Smash')).toBeOnTheScreen();
    expect(screen.getByTestId('row-status')).toHaveTextContent('clubAdmin.podStatus.active');
    expect(screen.getByText('9 Jan, 6 PM')).toBeOnTheScreen();
    expect(screen.getByTestId('row-place')).toHaveTextContent('Gomti Nagar, Lucknow');
  });

  it('hides the place line when the pod has none', () => {
    mount(podOf({ place_label: '' }));
    expect(screen.queryByTestId('row-place')).toBeNull();
  });

  it('shows spots, attended and the ticket price', () => {
    mount(podOf());
    expect(screen.getByTestId('row-spots')).toHaveTextContent('mweb.studioPods.spots6 / 10');
    expect(screen.getByTestId('row-attended')).toHaveTextContent('mweb.studioPods.attended4 / 6');
    expect(screen.getByTestId('row-ticket')).toHaveTextContent(
      `mweb.studioPods.ticket${formatMoney(250, { symbol: '₹' })}`,
    );
  });

  it('does not report a confident zero when attendance was never recorded', () => {
    mount(podOf({ attendance: { recorded: false, attended_seats: 0, booked_seats: 6 } }));
    expect(screen.getByTestId('row-attended')).toHaveTextContent(
      'mweb.studioPods.attendedmweb.studioPods.attendedNone',
    );
  });

  it('reads a free pod as free, not as a zero price', () => {
    mount(podOf({ pod_type: 'FREE', pod_amount: 0 }));
    expect(screen.getByTestId('row-ticket')).toHaveTextContent(
      'mweb.studioPods.ticketmweb.podDetails.free',
    );
  });

  it('lists the hosts, skipping blank names', () => {
    mount(podOf({ host_names: ['Asha', '', 'Bo'] }));
    expect(screen.getByTestId('row-hosts')).toHaveTextContent('mweb.studioPods.hostsAsha, Bo');
  });

  it('says there are no hosts', () => {
    mount(podOf({ host_names: [] }));
    expect(screen.getByTestId('row-hosts')).toHaveTextContent(
      'mweb.studioPods.hostsmweb.studioPods.hostsNone',
    );
  });

  it('reflects the pod status in the chip', () => {
    mount(podOf({ is_deleted: true }));
    expect(screen.getByTestId('row-status')).toHaveTextContent('clubAdmin.podStatus.cancelled');
  });

  it('opens the pod from its body and the actions from the menu button', () => {
    const { onOpen, onActions } = mount(podOf());
    fireEvent.press(screen.getByTestId('row-open'));
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onActions).not.toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('row-actions'));
    expect(onActions).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('row-open').props['aria-label']).toBe('Sunday Smash');
    expect(screen.getByLabelText('mweb.hostManage.podActions')).toBeOnTheScreen();
  });
});
