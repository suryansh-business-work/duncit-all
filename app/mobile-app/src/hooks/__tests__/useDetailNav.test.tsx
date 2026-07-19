import { renderHook } from '@testing-library/react-native';

import { useDetailNav } from '@/hooks/useDetailNav';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, navigate: mockNavigate }),
}));

describe('useDetailNav', () => {
  afterEach(() => mockNavigate.mockClear());

  it('navigates to PodDetails with the slug pair (mWeb URL grammar)', () => {
    const { result } = renderHook(() => useDetailNav());

    result.current.openPod('cricket-hub', 'weekend-match');

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('PodDetails', {
      clubSlug: 'cricket-hub',
      podSlug: 'weekend-match',
    });
  });

  it('skips pod navigation when either slug is missing (never /club/undefined)', () => {
    const { result } = renderHook(() => useDetailNav());

    result.current.openPod(undefined, 'weekend-match');
    result.current.openPod('cricket-hub', null);

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('navigates to ClubDetails with the club slug', () => {
    const { result } = renderHook(() => useDetailNav());

    result.current.openClub('runners-club');

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('ClubDetails', { clubSlug: 'runners-club' });
  });

  it('skips club navigation without a slug', () => {
    const { result } = renderHook(() => useDetailNav());

    result.current.openClub(undefined);

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
