import { renderHook } from '@testing-library/react-native';

import { useDetailNav } from '@/hooks/useDetailNav';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, navigate: mockNavigate }),
}));

describe('useDetailNav', () => {
  afterEach(() => mockNavigate.mockClear());

  it('navigates to PodDetails with the pod id and title', () => {
    const { result } = renderHook(() => useDetailNav());

    result.current.openPod('pod-1', 'Sunrise Run');

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('PodDetails', {
      podId: 'pod-1',
      title: 'Sunrise Run',
    });
  });

  it('navigates to ClubDetails with the club id and title', () => {
    const { result } = renderHook(() => useDetailNav());

    result.current.openClub('club-9', 'Runners');

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('ClubDetails', {
      clubId: 'club-9',
      title: 'Runners',
    });
  });
});
