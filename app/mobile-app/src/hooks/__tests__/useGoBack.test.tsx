import { renderHook } from '@testing-library/react-native';

import { useGoBack } from '@/hooks/useGoBack';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
let mockCanGoBack = true;
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    canGoBack: () => mockCanGoBack,
    goBack: mockGoBack,
    navigate: mockNavigate,
  }),
}));

beforeEach(() => jest.clearAllMocks());

describe('useGoBack', () => {
  it('pops the stack when there is history', () => {
    mockCanGoBack = true;
    const { result } = renderHook(() => useGoBack());
    result.current();
    expect(mockGoBack).toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('falls back to the Home tab on a deep-linked web load', () => {
    mockCanGoBack = false;
    const { result } = renderHook(() => useGoBack());
    result.current();
    expect(mockGoBack).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('Home', { screen: 'HomeTab' });
  });
});
