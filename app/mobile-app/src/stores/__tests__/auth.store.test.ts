import { clearAuthToken, getAuthToken } from '@/services/auth-token';
import { useAuthStore } from '@/stores/auth.store';

jest.mock('@/services/auth-token');
const mockGet = jest.mocked(getAuthToken);
const mockClear = jest.mocked(clearAuthToken);

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({ ready: false, token: null, surveyCompleted: true });
});

describe('auth.store', () => {
  it('bootstraps from the persisted token', async () => {
    mockGet.mockResolvedValue('tok');
    await useAuthStore.getState().bootstrap();
    expect(useAuthStore.getState()).toMatchObject({
      token: 'tok',
      ready: true,
      surveyCompleted: true,
    });
  });

  it('authenticates with the survey flag and completes the survey', () => {
    useAuthStore.getState().authenticate('jwt', false);
    expect(useAuthStore.getState()).toMatchObject({ token: 'jwt', surveyCompleted: false });
    useAuthStore.getState().completeSurvey();
    expect(useAuthStore.getState().surveyCompleted).toBe(true);
  });

  it('signs out and clears the token', async () => {
    mockClear.mockResolvedValue();
    useAuthStore.setState({ token: 'jwt' });
    await useAuthStore.getState().signOut();
    expect(mockClear).toHaveBeenCalled();
    expect(useAuthStore.getState().token).toBeNull();
  });
});
