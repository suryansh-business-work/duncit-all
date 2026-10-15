import { act, screen } from '@testing-library/react-native';
import { LOADING_TIP_INTERVAL_MS, LOADING_TIP_KEYS } from '@duncit/utils';

import { TipsLoader } from '@/components/TipsLoader';
import { renderWithProviders } from '@/utils/test-utils';

const FIRST_TIP = 'Tap any pod you joined to see its refund status and full timeline.';
const SECOND_TIP = 'Follow a club to catch its new pods and stories first.';

/** One tip's dwell time, inside act so the rotation's state update lands. */
const nextTip = (times = 1) =>
  act(() => {
    jest.advanceTimersByTime(LOADING_TIP_INTERVAL_MS * times);
  });

describe('TipsLoader', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('shows the spinner as the only live loading region, the heading and the first tip', () => {
    renderWithProviders(<TipsLoader testID="loader" />);
    expect(screen.getByTestId('loader')).toBeOnTheScreen();
    expect(screen.getByLabelText('Loading…')).toBeOnTheScreen();
    expect(screen.getByText('Did you know?')).toBeOnTheScreen();
    expect(screen.getByTestId('loader-tip')).toHaveTextContent(FIRST_TIP);
  });

  it('keeps a tip up for the whole interval, then moves to the next', () => {
    renderWithProviders(<TipsLoader testID="loader" />);
    act(() => {
      jest.advanceTimersByTime(LOADING_TIP_INTERVAL_MS - 1);
    });
    expect(screen.getByTestId('loader-tip')).toHaveTextContent(FIRST_TIP);
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(screen.getByTestId('loader-tip')).toHaveTextContent(SECOND_TIP);
  });

  it('wraps back to the first tip after the last one', () => {
    renderWithProviders(<TipsLoader testID="loader" />);
    nextTip(LOADING_TIP_KEYS.length - 1);
    expect(screen.getByTestId('loader-tip')).toHaveTextContent(
      'Tap the location in the header to explore pods in another area.',
    );
    nextTip();
    expect(screen.getByTestId('loader-tip')).toHaveTextContent(FIRST_TIP);
  });

  it('stops its rotation timer when it unmounts', () => {
    const setSpy = jest.spyOn(global, 'setInterval');
    const clearSpy = jest.spyOn(global, 'clearInterval');
    const { unmount } = renderWithProviders(<TipsLoader testID="loader" />);
    const call = setSpy.mock.calls.findIndex(([, delay]) => delay === LOADING_TIP_INTERVAL_MS);
    expect(call).toBeGreaterThanOrEqual(0);
    const timer = setSpy.mock.results[call]?.value;
    expect(clearSpy).not.toHaveBeenCalledWith(timer);

    unmount();
    expect(clearSpy).toHaveBeenCalledWith(timer);
  });
});
