import { fireEvent, screen } from '@testing-library/react-native';

import { HostPodsSection } from '@/components/host-manage/HostPodsSection';
import { useHostPods } from '@/hooks/useHostPods';
import { renderWithProviders } from '@/utils/test-utils';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, navigate: mockNavigate }),
}));
jest.mock('@/hooks/useHostPods', () => ({ useHostPods: jest.fn() }));
// The dialogs are unit-tested on their own; here we assert wiring.
interface MockEditProps {
  pod: unknown;
  onClose: () => void;
  onSaved: () => void;
}
interface MockDeleteProps {
  podId: string | null;
  onClose: () => void;
  onDeleted: () => void;
}
jest.mock('@/components/host-manage/PodEditDialog', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View: V } = require('react-native');
  return {
    PodEditDialog: ({ pod, onClose, onSaved }: Readonly<MockEditProps>) =>
      pod ? (
        <>
          <V testID="mock-edit-dialog" />
          <V testID="mock-edit-close" onTouchEnd={onClose} />
          <V testID="mock-edit-saved" onTouchEnd={onSaved} />
        </>
      ) : null,
  };
});
jest.mock('@/components/host-manage/PodDeleteDialog', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View: V } = require('react-native');
  return {
    PodDeleteDialog: ({ podId, onClose, onDeleted }: Readonly<MockDeleteProps>) =>
      podId ? (
        <>
          <V testID="mock-delete-dialog" />
          <V testID="mock-delete-close" onTouchEnd={onClose} />
          <V testID="mock-delete-deleted" onTouchEnd={onDeleted} />
        </>
      ) : null,
  };
});
interface MockCompleteProps {
  pod: unknown;
  onClose: () => void;
  onCompleted: () => void;
}
jest.mock('@/components/host-manage/PodCompleteDialog', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View: V } = require('react-native');
  return {
    PodCompleteDialog: ({ pod, onClose, onCompleted }: Readonly<MockCompleteProps>) =>
      pod ? (
        <>
          <V testID="mock-complete-dialog" />
          <V testID="mock-complete-close" onTouchEnd={onClose} />
          <V testID="mock-complete-completed" onTouchEnd={onCompleted} />
        </>
      ) : null,
  };
});

const mockedUse = useHostPods as jest.Mock;

// All three resolve to "Upcoming" (future / unparseable / missing date), so the
// default Upcoming filter keeps every row visible.
const pods = [
  {
    id: 'p1',
    pod_id: 'pod-1',
    club_slug: 'hikers',
    pod_title: 'Hike',
    pod_date_time: '2030-01-01T10:00:00Z',
    pod_end_date_time: null,
    pod_mode: 'PHYSICAL',
    zone_name: 'HSR',
    pod_type: 'NATIVE_FREE',
  },
  {
    id: 'p2',
    pod_id: 'pod-2',
    club_slug: 'jammers',
    pod_title: 'Jam',
    pod_date_time: 'bad-date',
    pod_end_date_time: null,
    pod_mode: 'VIRTUAL',
    zone_name: null,
    pod_type: 'NATIVE_PAID',
  },
  {
    id: 'p3',
    pod_id: 'pod-3',
    club_slug: 'runners',
    pod_title: 'Run',
    pod_date_time: null,
    pod_end_date_time: null,
    pod_mode: 'PHYSICAL',
    zone_name: null,
    pod_type: 'NATIVE_PAID',
  },
];

const api = (over: Record<string, unknown> = {}) => ({
  pods,
  isLoading: false,
  refetch: jest.fn().mockResolvedValue(undefined),
  ...over,
});

beforeEach(() => jest.clearAllMocks());

describe('HostPodsSection', () => {
  it('shows the loading and empty states', () => {
    mockedUse.mockReturnValue(api({ pods: [], isLoading: true }));
    renderWithProviders(<HostPodsSection />);
    expect(screen.getByTestId('host-pods-loading')).toBeOnTheScreen();
    mockedUse.mockReturnValue(api({ pods: [] }));
    renderWithProviders(<HostPodsSection />);
    expect(screen.getByTestId('host-pods-empty')).toBeOnTheScreen();
  });

  it('opens a pod from its row', () => {
    mockedUse.mockReturnValue(api());
    renderWithProviders(<HostPodsSection />);
    fireEvent.press(screen.getByTestId('host-pod-open-p1'));
    expect(mockNavigate).toHaveBeenCalledWith('PodDetails', {
      clubSlug: 'hikers',
      podSlug: 'pod-1',
    });
  });

  it('edits a pod, then closes or refetches on save', () => {
    const hookApi = api();
    mockedUse.mockReturnValue(hookApi);
    renderWithProviders(<HostPodsSection />);
    fireEvent.press(screen.getByTestId('host-pod-edit-p1'));
    expect(screen.getByTestId('mock-edit-dialog')).toBeOnTheScreen();
    fireEvent(screen.getByTestId('mock-edit-saved'), 'touchEnd');
    expect(hookApi.refetch).toHaveBeenCalled();
    expect(screen.queryByTestId('mock-edit-dialog')).toBeNull();
    // Reopen and dismiss without saving.
    fireEvent.press(screen.getByTestId('host-pod-edit-p2'));
    fireEvent(screen.getByTestId('mock-edit-close'), 'touchEnd');
    expect(screen.queryByTestId('mock-edit-dialog')).toBeNull();
  });

  it('deletes a pod, then closes or refetches on delete', () => {
    const hookApi = api();
    mockedUse.mockReturnValue(hookApi);
    renderWithProviders(<HostPodsSection />);
    fireEvent.press(screen.getByTestId('host-pod-delete-p1'));
    expect(screen.getByTestId('mock-delete-dialog')).toBeOnTheScreen();
    fireEvent(screen.getByTestId('mock-delete-deleted'), 'touchEnd');
    expect(hookApi.refetch).toHaveBeenCalled();
    expect(screen.queryByTestId('mock-delete-dialog')).toBeNull();
    fireEvent.press(screen.getByTestId('host-pod-delete-p3'));
    fireEvent(screen.getByTestId('mock-delete-close'), 'touchEnd');
    expect(screen.queryByTestId('mock-delete-dialog')).toBeNull();
  });

  it('completes a pod, then closes or refetches on submit', () => {
    const hookApi = api();
    mockedUse.mockReturnValue(hookApi);
    renderWithProviders(<HostPodsSection />);
    fireEvent.press(screen.getByTestId('host-pod-complete-p1'));
    expect(screen.getByTestId('mock-complete-dialog')).toBeOnTheScreen();
    fireEvent(screen.getByTestId('mock-complete-completed'), 'touchEnd');
    expect(hookApi.refetch).toHaveBeenCalled();
    expect(screen.queryByTestId('mock-complete-dialog')).toBeNull();
    fireEvent.press(screen.getByTestId('host-pod-complete-p2'));
    fireEvent(screen.getByTestId('mock-complete-close'), 'touchEnd');
    expect(screen.queryByTestId('mock-complete-dialog')).toBeNull();
  });

  it('stages type/time/price choices and resets them before applying the default', () => {
    mockedUse.mockReturnValue(api());
    renderWithProviders(<HostPodsSection />);
    fireEvent.press(screen.getByTestId('host-pods-filter-open'));
    expect(screen.getByTestId('host-pods-filter-sheet')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('host-filter-type-VIRTUAL'));
    fireEvent.press(screen.getByTestId('host-filter-time-PAST'));
    fireEvent.press(screen.getByTestId('host-filter-price-FREE'));
    fireEvent.press(screen.getByTestId('host-filter-reset'));
    fireEvent.press(screen.getByTestId('host-filter-apply'));
    // Default (Upcoming) keeps every upcoming pod visible.
    expect(screen.getByTestId('host-pod-open-p1')).toBeOnTheScreen();
  });

  it('applies a Past filter to an all-upcoming list → filtered-empty + active pill', () => {
    mockedUse.mockReturnValue(api());
    renderWithProviders(<HostPodsSection />);
    fireEvent.press(screen.getByTestId('host-pods-filter-open'));
    fireEvent.press(screen.getByTestId('host-filter-time-PAST'));
    fireEvent.press(screen.getByTestId('host-filter-apply'));
    expect(screen.getByTestId('host-pods-filtered-empty')).toBeOnTheScreen();
    expect(screen.getByText('Filter (1)')).toBeOnTheScreen();
    expect(screen.queryByTestId('host-pod-open-p1')).toBeNull();
  });

  it('closes the filter sheet without applying the staged change', () => {
    mockedUse.mockReturnValue(api());
    renderWithProviders(<HostPodsSection />);
    fireEvent.press(screen.getByTestId('host-pods-filter-open'));
    fireEvent.press(screen.getByTestId('host-filter-time-PAST'));
    fireEvent.press(screen.getByTestId('host-filter-close'));
    // Discarded — the default Upcoming view is unchanged.
    expect(screen.getByTestId('host-pod-open-p1')).toBeOnTheScreen();
  });

  it('keeps the section visible when a refetch fails', () => {
    const hookApi = api({ refetch: jest.fn().mockRejectedValue(new Error('down')) });
    mockedUse.mockReturnValue(hookApi);
    renderWithProviders(<HostPodsSection />);
    fireEvent.press(screen.getByTestId('host-pod-edit-p1'));
    fireEvent(screen.getByTestId('mock-edit-saved'), 'touchEnd');
    fireEvent.press(screen.getByTestId('host-pod-delete-p2'));
    fireEvent(screen.getByTestId('mock-delete-deleted'), 'touchEnd');
    fireEvent.press(screen.getByTestId('host-pod-complete-p3'));
    fireEvent(screen.getByTestId('mock-complete-completed'), 'touchEnd');
    expect(screen.getByTestId('host-pods-section')).toBeOnTheScreen();
  });
});
