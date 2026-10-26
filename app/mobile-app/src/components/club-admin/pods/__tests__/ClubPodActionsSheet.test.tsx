import { fireEvent, screen } from '@testing-library/react-native';

import type { ClubAdminPodRow } from '@/hooks/useClubAdminPods';
import { renderWithProviders } from '@/utils/test-utils';
import { ClubPodActionsSheet } from '../ClubPodActionsSheet';

jest.mock('@/hooks/useTranslation', () => {
  const t = (key: string) => key;
  return { useTranslation: () => ({ t }) };
});

const podOf = (patch: Record<string, unknown> = {}) =>
  ({
    id: 'p1',
    pod_title: 'Sunday Smash',
    is_active: true,
    is_deleted: false,
    completed_at: null,
    venue_approval_status: null,
    ...patch,
  }) as unknown as ClubAdminPodRow;

const handlers = () => ({
  onClose: jest.fn(),
  onDetails: jest.fn(),
  onAttendance: jest.fn(),
  onEdit: jest.fn(),
  onActivity: jest.fn(),
  onRequestChange: jest.fn(),
  onDelete: jest.fn(),
});

const mount = (pod: ClubAdminPodRow | null) => {
  const h = handlers();
  renderWithProviders(<ClubPodActionsSheet pod={pod} {...h} />);
  return h;
};

describe('ClubPodActionsSheet', () => {
  it('stays closed without a pod', () => {
    mount(null);
    expect(screen.queryByTestId('club-pod-action-details')).toBeNull();
  });

  it('shows the pod title and its status', () => {
    mount(podOf());
    expect(screen.getByText('Sunday Smash')).toBeOnTheScreen();
    expect(screen.getByText('clubAdmin.podStatus.active')).toBeOnTheScreen();
  });

  it('offers every action for a running pod and reports each press', () => {
    const h = mount(podOf());
    fireEvent.press(screen.getByTestId('club-pod-action-details'));
    fireEvent.press(screen.getByTestId('club-pod-action-attendance'));
    fireEvent.press(screen.getByTestId('club-pod-action-edit'));
    fireEvent.press(screen.getByTestId('club-pod-action-activity'));
    fireEvent.press(screen.getByTestId('club-pod-action-request-change'));
    fireEvent.press(screen.getByTestId('club-pod-action-delete'));
    expect(h.onDetails).toHaveBeenCalledTimes(1);
    expect(h.onAttendance).toHaveBeenCalledTimes(1);
    expect(h.onEdit).toHaveBeenCalledTimes(1);
    expect(h.onActivity).toHaveBeenCalledTimes(1);
    expect(h.onRequestChange).toHaveBeenCalledTimes(1);
    expect(h.onDelete).toHaveBeenCalledTimes(1);
    expect(screen.getByText('changeRequest.menuClubAdmin')).toBeOnTheScreen();
  });

  it('keeps attendance for a completed pod', () => {
    mount(podOf({ completed_at: '2026-10-01T10:00:00Z' }));
    expect(screen.getByTestId('club-pod-action-attendance')).toBeOnTheScreen();
  });

  it.each([
    ['a draft', { is_active: false }],
    ['a pod awaiting its venue', { venue_approval_status: 'PENDING' }],
    ['a venue-rejected pod', { venue_approval_status: 'DECLINED' }],
  ])('offers no attendance for %s, but everything else', (_label, patch) => {
    mount(podOf(patch));
    expect(screen.queryByTestId('club-pod-action-attendance')).toBeNull();
    expect(screen.getByTestId('club-pod-action-request-change')).toBeOnTheScreen();
    expect(screen.getByTestId('club-pod-action-delete')).toBeOnTheScreen();
  });

  it('offers a cancelled pod only details, edit and activity', () => {
    mount(podOf({ is_deleted: true }));
    expect(screen.getByTestId('club-pod-action-details')).toBeOnTheScreen();
    expect(screen.getByTestId('club-pod-action-edit')).toBeOnTheScreen();
    expect(screen.getByTestId('club-pod-action-activity')).toBeOnTheScreen();
    expect(screen.queryByTestId('club-pod-action-attendance')).toBeNull();
    expect(screen.queryByTestId('club-pod-action-request-change')).toBeNull();
    expect(screen.queryByTestId('club-pod-action-delete')).toBeNull();
  });
});
