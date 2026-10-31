import { act, renderHook } from '@testing-library/react-native';

import { useOccasionClock } from '../useOccasionClock';

type FrameInfo = { timeSincePreviousFrame: number | null };

// The shipped Reanimated mock has no frame callbacks, so this one records the
// registered callback and its on/off switch.
const mockFrame = { setActive: jest.fn(), isActive: false, callbackId: 1 };
const mockCallbacks: ((info: FrameInfo) => void)[] = [];
jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual('react-native-reanimated/mock'),
  useFrameCallback: (callback: (info: FrameInfo) => void) => {
    mockCallbacks.push(callback);
    return mockFrame;
  },
}));

const tick = (ms: number | null) => {
  const latest = mockCallbacks.at(-1);
  if (!latest) throw new Error('no frame callback registered');
  act(() => latest({ timeSincePreviousFrame: ms }));
};

beforeEach(() => {
  mockFrame.setActive.mockClear();
  mockCallbacks.length = 0;
});

describe('useOccasionClock', () => {
  it('starts at zero and only runs while asked to', () => {
    const { result, rerender } = renderHook(
      ({ running }: { running: boolean }) => useOccasionClock(running),
      {
        initialProps: { running: false },
      },
    );
    expect(result.current.value).toBe(0);
    expect(mockFrame.setActive).toHaveBeenLastCalledWith(false);

    rerender({ running: true });
    expect(mockFrame.setActive).toHaveBeenLastCalledWith(true);

    rerender({ running: false });
    expect(mockFrame.setActive).toHaveBeenLastCalledWith(false);
  });

  it('counts seconds frame by frame, never leaping after a stall', () => {
    const { result } = renderHook(() => useOccasionClock(true));
    tick(null);
    expect(result.current.value).toBe(0);
    tick(16);
    tick(16);
    expect(result.current.value).toBeCloseTo(0.032, 9);
    tick(3000);
    expect(result.current.value).toBeCloseTo(0.082, 9);
  });
});
