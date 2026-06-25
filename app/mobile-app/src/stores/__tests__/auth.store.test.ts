import { clearAuthToken, getAuthToken } from '@/services/auth-token';
import { removeExpoPushToken, syncExpoPushToken } from '@/services/push-registration';
import { useAuthStore } from '@/stores/auth.store';

jest.mock('@/services/auth-token');
jest.mock('@/services/push-registration', () => ({
  syncExpoPushToken: jest.fn().mockResolvedValue(undefined),
  removeExpoPushToken: jest.fn().mockResolvedValue(undefined),
}));
const mockGet = jest.mocked(getAuthToken);
const mockClear = jest.mocked(clearAuthToken);
const mockSync = jest.mocked(syncExpoPushToken);
const mockRemove = jest.mocked(removeExpoPushToken);

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({ ready: false, token: null, surveyCompleted: true });
});

describe('auth.store', () => {
  it('bootstraps from the persisted token and registers for push', async () => {
    mockGet.mockResolvedValue('tok');
    await useAuthStore.getState().bootstrap();
    expect(useAuthStore.getState()).toMatchObject({
      token: 'tok',
      ready: true,
      surveyCompleted: true,
    });
    expect(mockSync).toHaveBeenCalled();
  });

  it('bootstraps without a token and skips push registration', async () => {
    mockGet.mockResolvedValue(null);
    await useAuthStore.getState().bootstrap();
    expect(useAuthStore.getState()).toMatchObject({ token: null, ready: true });
    expect(mockSync).not.toHaveBeenCalled();
  });

  it('authenticates with the survey flag, registers for push and completes the survey', () => {
    useAuthStore.getState().authenticate('jwt', false);
    expect(useAuthStore.getState()).toMatchObject({ token: 'jwt', surveyCompleted: false });
    expect(mockSync).toHaveBeenCalled();
    useAuthStore.getState().completeSurvey();
    expect(useAuthStore.getState().surveyCompleted).toBe(true);
  });

  it('signs out, unbinds the push token and clears the token', async () => {
    mockClear.mockResolvedValue();
    useAuthStore.setState({ token: 'jwt' });
    await useAuthStore.getState().signOut();
    expect(mockRemove).toHaveBeenCalled();
    expect(mockClear).toHaveBeenCalled();
    expect(useAuthStore.getState().token).toBeNull();
  });
});
