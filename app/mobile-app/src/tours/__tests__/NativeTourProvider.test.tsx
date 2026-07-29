import { act, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { NativeTourProvider } from '@/tours/NativeTourProvider';
import { useMe } from '@/hooks/useMe';
import { useToursStore } from '@/stores/tours.store';
import { renderWithProviders } from '@/utils/test-utils';

const mockStart = jest.fn();
let mockCaptured: { steps: unknown[]; onStop?: () => void } = { steps: [] };

// The real overlay only draws once the host measures a layout, which jest never
// does. Standing it in lets us assert the wiring this app owns: which steps are
// handed over, that the tour is started, and that stopping records it.
jest.mock('react-native-spotlight-tour', () => {
  const react = jest.requireActual('react');
  return {
    SpotlightTourProvider: react.forwardRef(
      (props: { steps: unknown[]; onStop?: () => void; children: unknown }, ref: unknown) => {
        mockCaptured = props;
        react.useImperativeHandle(ref, () => ({ start: mockStart, stop: jest.fn() }));
        return props.children;
      },
    ),
    AttachStep: ({ children }: { children: unknown }) => children,
  };
});

jest.mock('@/hooks/useMe', () => ({ useMe: jest.fn() }));
jest.mock('@/services/secure-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

const mockUseMe = useMe as jest.Mock;

const mount = () =>
  renderWithProviders(
    <NativeTourProvider>
      <Text testID="app">app</Text>
    </NativeTourProvider>,
  );

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  mockCaptured = { steps: [] };
  mockUseMe.mockReturnValue({ data: { me: { user_id: 'u1' } } });
  useToursStore.setState({ completed: [], activeTourId: null, mountedAnchors: [] });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('NativeTourProvider', () => {
  it('renders the app and hands over no steps while idle', () => {
    mount();
    expect(screen.getByTestId('app')).toBeOnTheScreen();
    expect(mockCaptured.steps).toHaveLength(0);
  });

  it('does not start a tour whose anchors are not on screen', () => {
    useToursStore.setState({ activeTourId: 'home', mountedAnchors: [] });
    mount();
    act(() => {
      jest.advanceTimersByTime(500);
    });
    // This is the "blank tour": steps with nothing to spotlight.
    expect(mockCaptured.steps).toHaveLength(0);
    expect(mockStart).not.toHaveBeenCalled();
  });

  it('builds only the steps whose anchors are mounted, and starts', () => {
    useToursStore.setState({ activeTourId: 'home', mountedAnchors: ['home-pods', 'home-clubs'] });
    mount();
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(mockCaptured.steps).toHaveLength(2);
    expect(mockStart).toHaveBeenCalled();
  });

  it('records the tour as shown when it stops', async () => {
    useToursStore.setState({ activeTourId: 'home', mountedAnchors: ['home-pods'] });
    mount();
    act(() => {
      jest.advanceTimersByTime(500);
    });
    await act(async () => {
      mockCaptured.onStop?.();
    });
    expect(useToursStore.getState().completed).toEqual(['home']);
    expect(useToursStore.getState().activeTourId).toBeNull();
  });

  it('ignores a stop with no tour running', async () => {
    mount();
    await act(async () => {
      mockCaptured.onStop?.();
    });
    expect(useToursStore.getState().completed).toEqual([]);
  });

  it('falls back to the anon bucket before the viewer resolves', () => {
    mockUseMe.mockReturnValue({ data: undefined });
    useToursStore.setState({ activeTourId: 'home', mountedAnchors: ['home-pods'] });
    expect(() => mount()).not.toThrow();
  });
});
