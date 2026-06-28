import { act, fireEvent, screen } from '@testing-library/react-native';

import { PostMedia } from '@/components/profile/post-viewer/PostMedia';
import { renderWithProviders } from '@/utils/test-utils';

describe('PostMedia', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('renders the image and ignores a single tap', () => {
    const onDoubleTapLike = jest.fn();
    jest.spyOn(Date, 'now').mockReturnValue(1000);
    renderWithProviders(<PostMedia imageUrl="http://x/a.jpg" onDoubleTapLike={onDoubleTapLike} />);

    expect(screen.getByTestId('post-viewer-image')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('post-media'));
    expect(onDoubleTapLike).not.toHaveBeenCalled();
    expect(screen.queryByTestId('post-like-burst')).toBeNull();
  });

  it('does not double-tap when the two taps are too far apart', () => {
    const onDoubleTapLike = jest.fn();
    const nowSpy = jest.spyOn(Date, 'now');
    renderWithProviders(<PostMedia imageUrl="http://x/a.jpg" onDoubleTapLike={onDoubleTapLike} />);

    nowSpy.mockReturnValue(1000);
    fireEvent.press(screen.getByTestId('post-media'));
    nowSpy.mockReturnValue(5000); // > DOUBLE_TAP_MS later
    fireEvent.press(screen.getByTestId('post-media'));
    expect(onDoubleTapLike).not.toHaveBeenCalled();
  });

  it('likes once on a double tap and shows then hides the heart burst', () => {
    const onDoubleTapLike = jest.fn();
    const nowSpy = jest.spyOn(Date, 'now');
    renderWithProviders(<PostMedia imageUrl="http://x/a.jpg" onDoubleTapLike={onDoubleTapLike} />);

    nowSpy.mockReturnValue(1000);
    fireEvent.press(screen.getByTestId('post-media'));
    nowSpy.mockReturnValue(1100); // within DOUBLE_TAP_MS
    fireEvent.press(screen.getByTestId('post-media'));

    expect(onDoubleTapLike).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('post-like-burst')).toBeOnTheScreen();

    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(screen.queryByTestId('post-like-burst')).toBeNull();
  });
});
