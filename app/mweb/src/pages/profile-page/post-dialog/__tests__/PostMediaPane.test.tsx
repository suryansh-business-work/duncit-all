import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import PostMediaPane from '../PostMediaPane';

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const setup = (onDoubleTapLike = vi.fn()) => {
  render(
    <PostMediaPane imageUrl="http://x/a.jpg" caption="hi" onDoubleTapLike={onDoubleTapLike} />,
  );
  return onDoubleTapLike;
};

describe('PostMediaPane double-tap to like', () => {
  it('renders the image and ignores a single tap', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1000);
    const onDoubleTapLike = setup();
    expect(screen.getByAltText('hi')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('post-media'));
    expect(onDoubleTapLike).not.toHaveBeenCalled();
  });

  it('ignores two taps that are too far apart', () => {
    const now = vi.spyOn(Date, 'now');
    const onDoubleTapLike = setup();
    now.mockReturnValue(1000);
    fireEvent.click(screen.getByTestId('post-media'));
    now.mockReturnValue(5000);
    fireEvent.click(screen.getByTestId('post-media'));
    expect(onDoubleTapLike).not.toHaveBeenCalled();
  });

  it('likes once and shows the heart burst on a double tap', () => {
    const now = vi.spyOn(Date, 'now');
    const onDoubleTapLike = setup();
    now.mockReturnValue(1000);
    fireEvent.click(screen.getByTestId('post-media'));
    now.mockReturnValue(1100);
    fireEvent.click(screen.getByTestId('post-media'));
    expect(onDoubleTapLike).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('post-like-burst')).toBeInTheDocument();
    vi.runOnlyPendingTimers();
  });
});
