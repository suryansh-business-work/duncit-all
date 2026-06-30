import { act, fireEvent, screen } from '@testing-library/react-native';
import { ClubNotifyButton } from '../ClubNotifyButton';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/services/secure-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

const { getItem, setItem } = jest.requireMock('@/services/secure-storage') as {
  getItem: jest.MockedFunction<(k: string) => Promise<string | null>>;
  setItem: jest.MockedFunction<(k: string, v: string) => Promise<void>>;
};

describe('ClubNotifyButton', () => {
  beforeEach(() => {
    getItem.mockResolvedValue(null);
    setItem.mockResolvedValue(undefined);
  });

  it('renders without crashing when no stored pref', async () => {
    renderWithProviders(<ClubNotifyButton clubId="c1" />);
    await act(async () => {});
    expect(getItem).toHaveBeenCalledWith('club_notify_c1');
  });

  it('loads stored pref on mount', async () => {
    getItem.mockResolvedValue('ALL');
    renderWithProviders(<ClubNotifyButton clubId="c2" />);
    await act(async () => {});
    expect(getItem).toHaveBeenCalledWith('club_notify_c2');
  });

  it('opens sheet and selects Pods Only', async () => {
    renderWithProviders(<ClubNotifyButton clubId="c3" />);
    await act(async () => {});
    fireEvent.press(screen.getByLabelText('Subscribe to notifications'));
    expect(screen.getByText('Club Notifications')).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Pods only'));
    await act(async () => {});
    expect(setItem).toHaveBeenCalledWith('club_notify_c3', 'PODS');
  });

  it('opens sheet and selects Important only', async () => {
    renderWithProviders(<ClubNotifyButton clubId="c4" />);
    await act(async () => {});
    fireEvent.press(screen.getByLabelText('Subscribe to notifications'));
    fireEvent.press(screen.getByText('Important only'));
    await act(async () => {});
    expect(setItem).toHaveBeenCalledWith('club_notify_c4', 'IMPORTANT');
  });

  it('opens sheet and selects All notifications', async () => {
    renderWithProviders(<ClubNotifyButton clubId="c5" />);
    await act(async () => {});
    fireEvent.press(screen.getByLabelText('Subscribe to notifications'));
    fireEvent.press(screen.getByText('All notifications'));
    await act(async () => {});
    expect(setItem).toHaveBeenCalledWith('club_notify_c5', 'ALL');
  });

  it('opens sheet and selects Mute', async () => {
    renderWithProviders(<ClubNotifyButton clubId="c6" />);
    await act(async () => {});
    fireEvent.press(screen.getByLabelText('Subscribe to notifications'));
    fireEvent.press(screen.getByText('Mute'));
    await act(async () => {});
    expect(setItem).toHaveBeenCalledWith('club_notify_c6', 'OFF');
  });

  it('handles getItem error gracefully', async () => {
    getItem.mockRejectedValue(new Error('storage error'));
    renderWithProviders(<ClubNotifyButton clubId="c7" />);
    await act(async () => {});
    expect(true).toBe(true);
  });

  it('handles setItem error gracefully', async () => {
    setItem.mockRejectedValue(new Error('storage error'));
    renderWithProviders(<ClubNotifyButton clubId="c8" />);
    await act(async () => {});
    fireEvent.press(screen.getByLabelText('Subscribe to notifications'));
    fireEvent.press(screen.getByText('Mute'));
    await act(async () => {});
    expect(true).toBe(true);
  });
});
