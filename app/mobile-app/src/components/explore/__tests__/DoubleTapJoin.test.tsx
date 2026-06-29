import { Text } from 'react-native';
import { act, fireEvent, screen } from '@testing-library/react-native';

import { DoubleTapJoin } from '@/components/explore/DoubleTapJoin';
import { renderWithProviders } from '@/utils/test-utils';

describe('DoubleTapJoin', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  const renderTap = (onJoin: () => void) =>
    renderWithProviders(
      <DoubleTapJoin onJoin={onJoin} testID="reel-doubletap">
        <Text testID="child">media</Text>
      </DoubleTapJoin>,
    );

  it('renders children and ignores a single tap', () => {
    const onJoin = jest.fn();
    jest.spyOn(Date, 'now').mockReturnValue(1000);
    renderTap(onJoin);

    expect(screen.getByTestId('child')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('reel-doubletap'));
    expect(onJoin).not.toHaveBeenCalled();
    expect(screen.queryByTestId('reel-join-burst')).toBeNull();
  });

  it('does nothing when the two taps are too far apart', () => {
    const onJoin = jest.fn();
    const nowSpy = jest.spyOn(Date, 'now');
    renderTap(onJoin);

    nowSpy.mockReturnValue(1000);
    fireEvent.press(screen.getByTestId('reel-doubletap'));
    nowSpy.mockReturnValue(5000); // > DOUBLE_TAP_MS later
    fireEvent.press(screen.getByTestId('reel-doubletap'));
    expect(onJoin).not.toHaveBeenCalled();
  });

  it('joins once on a double tap and shows then hides the burst', () => {
    const onJoin = jest.fn();
    const nowSpy = jest.spyOn(Date, 'now');
    renderTap(onJoin);

    nowSpy.mockReturnValue(1000);
    fireEvent.press(screen.getByTestId('reel-doubletap'));
    nowSpy.mockReturnValue(1100); // within DOUBLE_TAP_MS
    fireEvent.press(screen.getByTestId('reel-doubletap'));

    expect(onJoin).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('reel-join-burst')).toBeOnTheScreen();

    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(screen.queryByTestId('reel-join-burst')).toBeNull();
  });
});
