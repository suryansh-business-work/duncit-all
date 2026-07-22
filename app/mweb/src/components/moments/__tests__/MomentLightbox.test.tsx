import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import MomentLightbox, { type Moment } from '../MomentLightbox';

const imgMoments: Moment[] = [
  { url: 'https://cdn.test/one.jpg', type: 'IMAGE' },
  { url: 'https://cdn.test/two.jpg', type: 'IMAGE' },
  { url: 'https://cdn.test/three.jpg', type: 'IMAGE' },
];

function renderBox(overrides: Partial<React.ComponentProps<typeof MomentLightbox>> = {}) {
  const onClose = vi.fn();
  const onIndexChange = vi.fn();
  const utils = render(
    <MomentLightbox
      moments={imgMoments}
      index={0}
      onClose={onClose}
      onIndexChange={onIndexChange}
      {...overrides}
    />,
  );
  return { onClose, onIndexChange, ...utils };
}

describe('MomentLightbox', () => {
  beforeEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('returns null when index is null', () => {
    const { container } = render(
      <MomentLightbox moments={imgMoments} index={null} onClose={vi.fn()} onIndexChange={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
    expect(screen.queryByLabelText('Moment preview')).not.toBeInTheDocument();
  });

  it('returns null when moments is empty', () => {
    render(<MomentLightbox moments={[]} index={0} onClose={vi.fn()} onIndexChange={vi.fn()} />);
    expect(screen.queryByLabelText('Moment preview')).not.toBeInTheDocument();
  });

  it('renders an image with alt text and the counter for multiple moments', () => {
    renderBox();
    const img = screen.getByAltText('Moment 1 of 3') as HTMLImageElement;
    expect(img).toBeInTheDocument();
    expect(img.src).toContain('one.jpg');
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
    expect(screen.getByLabelText('Previous moment')).toBeInTheDocument();
    expect(screen.getByLabelText('Next moment')).toBeInTheDocument();
  });

  it('renders a video element when type is VIDEO', () => {
    render(
      <MomentLightbox
        moments={[{ url: 'https://cdn.test/clip.mp4', type: 'VIDEO' }]}
        index={0}
        onClose={vi.fn()}
        onIndexChange={vi.fn()}
      />,
    );
    const dialog = screen.getByLabelText('Moment preview');
    const video = dialog.querySelector('video');
    expect(video).toBeTruthy();
    expect(video?.getAttribute('src')).toContain('clip.mp4');
  });

  it('hides nav controls and counter for a single moment', () => {
    render(
      <MomentLightbox
        moments={[imgMoments[0]]}
        index={0}
        onClose={vi.fn()}
        onIndexChange={vi.fn()}
      />,
    );
    expect(screen.queryByLabelText('Next moment')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Previous moment')).not.toBeInTheDocument();
    expect(screen.queryByText('1 / 1')).not.toBeInTheDocument();
  });

  it('advances to the next moment (with wrap-around) on Next click', () => {
    const { onIndexChange } = renderBox();
    fireEvent.click(screen.getByLabelText('Next moment'));
    expect(onIndexChange).toHaveBeenCalledWith(1);
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
  });

  it('goes to the previous moment (wrapping to last) on Prev click', () => {
    const { onIndexChange } = renderBox();
    fireEvent.click(screen.getByLabelText('Previous moment'));
    expect(onIndexChange).toHaveBeenCalledWith(2);
    expect(screen.getByText('3 / 3')).toBeInTheDocument();
  });

  it('navigates via ArrowRight / ArrowLeft keyboard keys', () => {
    const { onIndexChange } = renderBox();
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(onIndexChange).toHaveBeenLastCalledWith(1);
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(onIndexChange).toHaveBeenLastCalledWith(0);
    // an unrelated key is ignored
    fireEvent.keyDown(window, { key: 'a' });
  });

  it('syncs current when the index prop changes', () => {
    const { rerender } = renderBox();
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
    rerender(
      <MomentLightbox moments={imgMoments} index={2} onClose={vi.fn()} onIndexChange={vi.fn()} />,
    );
    expect(screen.getByText('3 / 3')).toBeInTheDocument();
  });

  it('pushes a history entry and calls onClose + history.back on close', () => {
    const pushSpy = vi.spyOn(globalThis.history, 'pushState');
    const backSpy = vi.spyOn(globalThis.history, 'back').mockImplementation(() => {});
    const { onClose } = renderBox();
    expect(pushSpy).toHaveBeenCalled();
    fireEvent.click(screen.getByLabelText('Close preview'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(backSpy).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape key', () => {
    vi.spyOn(globalThis.history, 'back').mockImplementation(() => {});
    const { onClose } = renderBox();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('closes when the browser back (popstate) fires', () => {
    vi.spyOn(globalThis.history, 'back').mockImplementation(() => {});
    const { onClose } = renderBox();
    fireEvent.popState(window);
    expect(onClose).toHaveBeenCalled();
  });

  it('suppresses onClose on the popstate triggered by our own close()', () => {
    vi.spyOn(globalThis.history, 'back').mockImplementation(() => {});
    const { onClose } = renderBox();
    // close() sets suppressNextPop = true and calls history.back (mocked -> no real pop)
    fireEvent.click(screen.getByLabelText('Close preview'));
    expect(onClose).toHaveBeenCalledTimes(1);
    // the synthetic popstate that would follow history.back is swallowed
    fireEvent.popState(window);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
