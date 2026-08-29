import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import MediaLightbox from '../MediaLightbox';
import type { ClubMedia } from '../types';

const items: ClubMedia[] = [
  { url: 'https://cdn.test/1.jpg', type: 'IMAGE' },
  { url: 'https://cdn.test/2.mp4', type: 'VIDEO' },
  { url: 'https://cdn.test/3.jpg', type: 'IMAGE' },
];

afterEach(() => {
  vi.restoreAllMocks();
});

describe('MediaLightbox', () => {
  it('renders nothing when index is null', () => {
    const { container } = render(<MediaLightbox items={items} index={null} onNavigate={vi.fn()} onClose={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when index is out of range', () => {
    const { container } = render(
      <MediaLightbox items={items} index={5} onNavigate={vi.fn()} onClose={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();

    const { container: negative } = render(
      <MediaLightbox items={items} index={-1} onNavigate={vi.fn()} onClose={vi.fn()} />,
    );
    expect(negative).toBeEmptyDOMElement();
  });

  it('renders the image at the active index, with the counter, and no prev/next for a single item', () => {
    render(<MediaLightbox items={[items[0]]} index={0} onNavigate={vi.fn()} onClose={vi.fn()} />);
    const img = document.querySelector('img');
    expect(img).toHaveAttribute('src', 'https://cdn.test/1.jpg');
    expect(img).toHaveAttribute('alt', 'Media 1');
    expect(screen.getByText('1 / 1')).toBeInTheDocument();
    expect(screen.queryByLabelText('Previous')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Next')).not.toBeInTheDocument();
  });

  it('renders a video element for a VIDEO item instead of an image', () => {
    render(<MediaLightbox items={items} index={1} onNavigate={vi.fn()} onClose={vi.fn()} />);
    const video = document.querySelector('video');
    expect(video).toHaveAttribute('src', 'https://cdn.test/2.mp4');
    expect(document.querySelector('img')).not.toBeInTheDocument();
  });

  it('shows prev/next controls when there is more than one item and wraps around at both ends', () => {
    const onNavigate = vi.fn();
    render(<MediaLightbox items={items} index={0} onNavigate={onNavigate} onClose={vi.fn()} />);
    expect(screen.getByText('1 / 3')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Previous'));
    expect(onNavigate).toHaveBeenCalledWith(2); // wraps to the last item

    fireEvent.click(screen.getByLabelText('Next'));
    expect(onNavigate).toHaveBeenCalledWith(1);
  });

  it('wraps forward from the last item to the first', () => {
    const onNavigate = vi.fn();
    render(<MediaLightbox items={items} index={2} onNavigate={onNavigate} onClose={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Next'));
    expect(onNavigate).toHaveBeenCalledWith(0);
  });

  it('calls onClose from the close button', () => {
    const onClose = vi.fn();
    render(<MediaLightbox items={items} index={0} onNavigate={vi.fn()} onClose={onClose} />);
    fireEvent.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('navigates on ArrowLeft/ArrowRight keydown while open with more than one item', () => {
    const onNavigate = vi.fn();
    render(<MediaLightbox items={items} index={1} onNavigate={onNavigate} onClose={vi.fn()} />);

    fireEvent.keyDown(globalThis.window, { key: 'ArrowLeft' });
    expect(onNavigate).toHaveBeenCalledWith(0);

    fireEvent.keyDown(globalThis.window, { key: 'ArrowRight' });
    expect(onNavigate).toHaveBeenCalledWith(2);
  });

  it('ignores other keys and does not navigate when there is only one item', () => {
    const onNavigate = vi.fn();
    render(<MediaLightbox items={[items[0]]} index={0} onNavigate={onNavigate} onClose={vi.fn()} />);
    fireEvent.keyDown(globalThis.window, { key: 'ArrowLeft' });
    fireEvent.keyDown(globalThis.window, { key: 'ArrowRight' });
    fireEvent.keyDown(globalThis.window, { key: 'Escape' });
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('removes its keydown listener on unmount / when closed', () => {
    const onNavigate = vi.fn();
    const { rerender } = render(
      <MediaLightbox items={items} index={0} onNavigate={onNavigate} onClose={vi.fn()} />,
    );
    rerender(<MediaLightbox items={items} index={null} onNavigate={onNavigate} onClose={vi.fn()} />);
    fireEvent.keyDown(globalThis.window, { key: 'ArrowRight' });
    expect(onNavigate).not.toHaveBeenCalled();
  });
});
