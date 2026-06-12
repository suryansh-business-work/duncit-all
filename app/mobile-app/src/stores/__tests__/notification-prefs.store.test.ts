import { getItem, setItem } from '@/services/secure-storage';
import { useNotificationPrefsStore } from '@/stores/notification-prefs.store';

jest.mock('@/services/secure-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));
const mockGet = getItem as jest.Mock;
const mockSet = setItem as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  useNotificationPrefsStore.setState({ enabled: true });
  mockSet.mockResolvedValue(undefined);
});

describe('notification-prefs store', () => {
  it('defaults to enabled and hydrates a stored "off"', async () => {
    expect(useNotificationPrefsStore.getState().enabled).toBe(true);
    mockGet.mockResolvedValue('off');
    await useNotificationPrefsStore.getState().hydrate();
    expect(useNotificationPrefsStore.getState().enabled).toBe(false);
  });

  it('keeps the default when nothing is stored and hydrates "on"', async () => {
    mockGet.mockResolvedValue(null);
    await useNotificationPrefsStore.getState().hydrate();
    expect(useNotificationPrefsStore.getState().enabled).toBe(true);
    mockGet.mockResolvedValue('on');
    useNotificationPrefsStore.setState({ enabled: false });
    await useNotificationPrefsStore.getState().hydrate();
    expect(useNotificationPrefsStore.getState().enabled).toBe(true);
  });

  it('persists toggles and survives a storage failure', () => {
    useNotificationPrefsStore.getState().setEnabled(false);
    expect(useNotificationPrefsStore.getState().enabled).toBe(false);
    expect(mockSet).toHaveBeenCalledWith('duncit_notifications_enabled', 'off');
    mockSet.mockRejectedValue(new Error('disk'));
    useNotificationPrefsStore.getState().setEnabled(true);
    expect(useNotificationPrefsStore.getState().enabled).toBe(true);
  });
});
